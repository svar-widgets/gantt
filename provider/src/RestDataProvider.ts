import { Rest } from "wx-lib-data-provider";
import { format } from "date-fns";
import type { ActionMap } from "wx-lib-data-provider";
import type { TMethodsConfig, ITask, ILink, TID } from "wx-gantt-store";

type TProviderConfig = {
	batchURL: string;
};

export default class RestDataProvider extends Rest<TMethodsConfig> {
	private changeQueue: Array<{
		url: string;
		method: string;
		data: any;
	}> = [];
	protected _batchUrl: string;
	private flushTimeout: any = null;

	constructor(url: string, config?: Partial<TProviderConfig>) {
		super(url);
		this._batchUrl = config?.batchURL;
	}

	getHandlers(): ActionMap<TMethodsConfig> {
		return {
			"add-task": {
				ignoreID: true,
				handler: async (ev: TMethodsConfig["add-task"]) => {
					ev.task.parent = this.correctID(ev.task.parent);
					return this.sendBatch(`tasks`, "POST", {
						task: ev.task,
						mode: ev.mode,
						target: this.correctID(ev.target),
					});
				},
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
				handler: async (ev: TMethodsConfig["copy-task"]) => {
					return this.sendBatch(`tasks/${ev.source}`, "PUT", {
						operation: "copy",
						id: ev.id,
						target: this.correctID(ev.target),
						mode: ev.mode,
						lazy: !!ev.lazy,
					});
				},
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
				handler: async (ev: TMethodsConfig["add-link"]) => {
					ev.link.source = this.correctID(ev.link.source);
					ev.link.target = this.correctID(ev.link.target);
					return this.sendBatch(`links`, "POST", ev.link);
				},
			},
			"update-link": {
				handler: async (ev: TMethodsConfig["update-link"]) =>
					this.sendBatch(`links/${ev.id}`, "PUT", ev.link),
			},
			"delete-link": {
				handler: async (ev: TMethodsConfig["delete-link"]) =>
					this.sendBatch(`links/${ev.id}`, "DELETE"),
			},
		};
	}

	async getData(id?: TID): Promise<{ tasks: ITask[]; links: ILink[] }> {
		const tempId = id;
		id = this.getQueue().getId(id);

		const [tasksResponse, links] = await Promise.all([
			this.send<ITask[]>(id ? `tasks/${id}` : "tasks", "GET"),
			this.send<ILink[]>(id ? `links/${id}` : "links", "GET"),
		]);
		const tasks = this.parseDates(tasksResponse).map(t => {
			if (t.parent == id) t.parent = tempId;
			return t;
		});
		return { tasks, links };
	}

	parseDates(data: ITask[]) {
		data.forEach(item => {
			item.start = new Date(item.start);
			if (item.end) item.end = new Date(item.end);
			if (item.base_start) item.base_start = new Date(item.base_start);
			if (item.base_end) item.base_end = new Date(item.base_end);
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

	private async sendBatchRequest<T>(
		url: string,
		method: string,
		data?: any,
		customHeaders?: any
	): Promise<T> {
		this.changeQueue.push({ url, method, data });

		if (this.flushTimeout) {
			clearTimeout(this.flushTimeout);
		}

		return new Promise<T>(resolve => {
			this.flushTimeout = setTimeout(async () => {
				if (this.changeQueue.length > 1) {
					const batchData = this.changeQueue.map(req => {
						return {
							url: req.url,
							method: req.method,
							data: {
								...req.data,
							},
						};
					});

					this.changeQueue = [];

					const result = await this.send<T>(
						this._batchUrl,
						"POST",
						batchData
					);
					resolve(result);
				} else {
					this.changeQueue = [];
					const result = await this.send<T>(
						url,
						method,
						data,
						customHeaders
					);
					resolve(result);
				}
			}, 10);
		});
	}

	async send<T>(
		url: string,
		method: string,
		data?: any,
		customHeaders: any = {}
	): Promise<T> {
		const headers = {
			"Content-Type": "application/json",
			...customHeaders,
		};
		const req: RequestInit = {
			method,
			headers,
		};

		if (data) {
			req.body = this.getPayload(data);
		}

		return fetch(`${this._url}/${url}`, req).then(res => {
			return res.json().catch(error => {
				console.error(error);
			});
		});
	}

	private getPayload(obj: Record<string, any>): string {
		const transformedObj = this.transformDates(obj);
		return JSON.stringify(transformedObj);
	}

	private transformDates = (item: any): any => {
		if (Array.isArray(item)) {
			return item.map(this.transformDates);
		}
		if (typeof item === "object" && item !== null) {
			for (const key in item) {
				const value = item[key];
				if (value instanceof Date) {
					item[key] = this.formatDate(value);
				} else if (typeof value === "object") {
					item[key] = this.transformDates(value);
				}
			}
		}
		return item;
	};

	private correctID(localId: TID): TID {
		const tempId = localId;
		const id = this.getQueue().getId(tempId);
		if (localId !== id) return id;
		return localId;
	}
}
