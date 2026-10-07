import { Rest } from "@svar-ui/lib-data-provider";
import type { ActionMap } from "@svar-ui/lib-data-provider";
import { format } from "date-fns";
import { TaskID, LinkID, AssignmentID } from "./constants";
import type {
	TMethodsConfig,
	ITask,
	ILink,
	TID,
	IResource,
	IAssignment,
} from "@svar-ui/gantt-store";

type TProviderConfig = {
	batchURL: string;
};

const DATE_KEYS = ["start", "end", "base_start", "base_end", "deadline"];

type TProviderData = {
	tasks: ITask[];
	links: ILink[];
	resources?: IResource[];
	assignments?: IAssignment[];
};

type Timeout = ReturnType<typeof setTimeout>;

export default class RestDataProvider extends Rest<TMethodsConfig> {
	private changeQueue: Array<{
		url: string;
		method: string;
		data: any;
		customHeaders?: any;
		resolve: (value: any) => void;
		reject: (reason?: any) => void;
	}> = [];
	protected _batchUrl: string;
	private flushTimeout: Timeout | null = null;
	private headers: Record<string, string> = {};

	constructor(url: string, config?: Partial<TProviderConfig>) {
		super(url);
		this._batchUrl = config?.batchURL;
	}

	setHeaders(headers: Record<string, string>): void {
		this.headers = headers;
	}

	getHandlers(): ActionMap<TMethodsConfig> {
		return {
			"add-task": {
				ignoreID: true,
				kind: TaskID,
				handler: async (ev: TMethodsConfig["add-task"]) =>
					this.sendBatch<{ id: TID }>(`tasks`, "POST", {
						task: ev.task,
						target: ev.target,
						mode: ev.mode,
						index: ev.index,
					}),
			},
			"update-task": {
				debounce: 500,
				handler: async (ev: TMethodsConfig["update-task"]) => {
					const task = { ...ev.task };
					delete task.data;
					return this.sendBatch(`tasks/${ev.id}`, "PUT", task);
				},
			},
			"delete-task": {
				handler: async (ev: TMethodsConfig["delete-task"]) =>
					this.sendBatch(`tasks/${ev.id}`, "DELETE"),
			},
			"copy-task": {
				ignoreID: true,
				kind: TaskID,
				handler: async (ev: TMethodsConfig["copy-task"]) =>
					this.sendBatch<{ id: TID }>(`tasks/${ev.source}`, "PUT", {
						operation: "copy",
						id: ev.id,
						target: ev.target,
						mode: ev.mode,
						index: ev.index,
						lazy: !!ev.lazy,
					}),
			},
			"move-task": {
				handler: async (ev: TMethodsConfig["move-task"]) => {
					if (!ev.inProgress) {
						return this.sendBatch(`tasks/${ev.id}`, "PUT", {
							operation: "move",
							target: ev.target,
							mode: ev.mode,
						});
					}
				},
			},

			"add-link": {
				ignoreID: true,
				kind: LinkID,
				handler: async (ev: TMethodsConfig["add-link"]) =>
					this.sendBatch<{ id: TID }>(`links`, "POST", ev.link),
			},
			"update-link": {
				handler: async (ev: TMethodsConfig["update-link"]) =>
					this.sendBatch(`links/${ev.id}`, "PUT", ev.link),
			},
			"delete-link": {
				handler: async (ev: TMethodsConfig["delete-link"]) =>
					this.sendBatch(`links/${ev.id}`, "DELETE"),
			},

			"add-assignment": {
				ignoreID: true,
				kind: AssignmentID,
				handler: async (ev: TMethodsConfig["add-assignment"]) =>
					this.sendBatch<{ id: TID }>(
						`assignments`,
						"POST",
						ev.assignment
					),
			},
			"delete-assignment": {
				handler: async (ev: TMethodsConfig["delete-assignment"]) =>
					this.sendBatch(`assignments/${ev.id}`, "DELETE"),
			},
			"update-assignment": {
				handler: async (ev: TMethodsConfig["update-assignment"]) =>
					this.sendBatch(
						`assignments/${ev.id}`,
						"PUT",
						ev.assignment
					),
			},
		};
	}

	async getData(
		id?: TID,
		options?: {
			resources?: boolean;
			assignments?: boolean;
		}
	): Promise<TProviderData> {
		const tempId = id;
		id = this.getQueue().getId(id);

		const [tasksResponse, links, resources, assignments] =
			await Promise.all([
				this.send<ITask[]>(id ? `tasks/${id}` : "tasks", "GET"),
				this.send<ILink[]>(id ? `links/${id}` : "links", "GET"),
				!id && options?.resources
					? this.send<IResource[]>("resources", "GET")
					: undefined,
				options?.assignments
					? this.send<IAssignment[]>(
							id ? `assignments/${id}` : "assignments",
							"GET"
						)
					: undefined,
			]);
		const tasks = this.parseDates(tasksResponse).map(t => {
			if (t.parent === id) t.parent = tempId;
			return t;
		});
		const result: TProviderData = { tasks, links };
		if (resources) result.resources = resources;
		if (assignments) result.assignments = assignments;
		return result;
	}

	parseDates(data: ITask[]) {
		data.forEach(item => {
			DATE_KEYS.forEach(key => {
				if (item[key]) item[key] = new Date(item[key]);
			});
			if (item.constraint?.date)
				item.constraint.date = new Date(item.constraint.date);
			item.segments?.forEach((segment: Partial<ITask>) => {
				DATE_KEYS.forEach(key => {
					if (segment[key]) segment[key] = new Date(segment[key]);
				});
			});
		});
		return data;
	}

	formatDate(date: any) {
		return format(date, "yyyy-MM-dd HH:mm:ss");
	}

	async sendBatch<T>(
		url: string,
		method: string,
		data?: any,
		customHeaders?: any
	): Promise<T> {
		if (this._batchUrl) {
			return this.sendBatchRequest(url, method, data, customHeaders);
		} else {
			return this.send(url, method, data, customHeaders);
		}
	}

	resolveId(id: TID, kind: number): TID {
		return this.getQueue().resolve(id, kind);
	}

	private async sendBatchRequest<T>(
		url: string,
		method: string,
		data?: any,
		customHeaders?: any
	): Promise<T> {
		const request = new Promise<T>((resolve, reject) => {
			this.changeQueue.push({
				url,
				method,
				data,
				customHeaders,
				resolve,
				reject,
			});
		});

		if (this.flushTimeout) clearTimeout(this.flushTimeout);
		this.flushTimeout = setTimeout(() => this.flushBatch(), 10);

		return request;
	}

	private async flushBatch(): Promise<void> {
		const queue = this.changeQueue;
		this.changeQueue = [];
		this.flushTimeout = null;
		if (!queue.length) return;

		if (queue.length === 1) {
			const [req] = queue;
			try {
				req.resolve(
					await this.send(
						req.url,
						req.method,
						req.data,
						req.customHeaders
					)
				);
			} catch (error) {
				req.reject(error);
			}
			return;
		}

		const batchData = queue.map(req => ({
			url: req.url,
			method: req.method,
			data: req.data ? { ...req.data } : undefined,
			customHeaders: req.customHeaders,
		}));

		try {
			const result = await this.send<any>(
				this._batchUrl,
				"POST",
				batchData
			);
			if (!Array.isArray(result))
				throw new Error("batch endpoint did not return a list");
			queue.forEach((req, i) => {
				const response = result[i];
				if (response?.error) req.reject(new Error(response.error));
				else req.resolve(response);
			});
		} catch (error) {
			queue.forEach(req => req.reject(error));
		}
	}

	async send<T>(
		url: string,
		method: string,
		data?: any,
		customHeaders: any = {}
	): Promise<T> {
		const headers = {
			"Content-Type": "application/json",
			...this.headers,
			...customHeaders,
		};

		const req: RequestInit = {
			method,
			headers,
		};

		if (data) {
			req.body = this.getPayload(data);
		}

		return fetch(`${this._url}/${url}`, req).then(async res => {
			if (!res.ok) {
				const text = await res.text().catch(() => "");
				throw new Error(
					`request failed with status ${res.status}${text ? `: ${text}` : ""}`
				);
			}
			return res.json();
		});
	}

	private getPayload(obj: Record<string, any>): string {
		return JSON.stringify(this.transformDates(obj));
	}

	private transformDates = (item: any): any => {
		if (item instanceof Date) return this.formatDate(item);
		if (Array.isArray(item)) return item.map(this.transformDates);
		if (typeof item === "object" && item !== null) {
			const copy: Record<string, any> = {};
			for (const key in item) copy[key] = this.transformDates(item[key]);
			return copy;
		}
		return item;
	};
}
