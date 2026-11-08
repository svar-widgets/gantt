import {
	IApi,
	IAssignment,
	IGanttTask,
	ILink,
	ITask,
	TID,
} from "@svar-ui/gantt-store";
import { AssignmentID, LinkID, TaskID } from "./constants";
import EventStream, { EventStreamConfig } from "./EventStream";
import { generateUUID } from "./uuid";

export type TRemoteEventType = "task" | "link" | "assignment";

export type TRemoteEventAction = "add" | "update" | "delete";

export type TRemoteEvent = {
	type: TRemoteEventType;
	action: TRemoteEventAction;
	id: TID;
	data?: unknown;
	from?: string;
};

export interface IRemoteEventsProvider {
	parseDates?: (tasks: ITask[]) => ITask[];
	resolveId(id: TID, kind: number): TID;
}

// the only marker of a remote event: the store keeps it out of history and the provider
const PARAMS = {
	eventSource: "remote",
} as const;

export default class RemoteEvents {
	// the host sends it as X-Client-Id, so the server skips this client's own echo
	public readonly clientId = generateUUID();
	private provider: IRemoteEventsProvider;
	private api?: IApi;
	private eventStream: EventStream;

	public constructor(
		provider: IRemoteEventsProvider,
		config: EventStreamConfig
	) {
		this.provider = provider;
		const { params } = config;
		this.eventStream = new EventStream({
			...config,
			onMessage: config.onMessage ?? (msg => this.processMessage(msg)),
			params: () => ({
				...(typeof params === "function" ? params() : params),
				clientId: this.clientId,
			}),
		});
	}

	public connect(api: IApi): Promise<void> {
		this.api = api;
		return this.eventStream.connect();
	}

	public disconnect(): void {
		this.eventStream.disconnect();
	}

	public processMessage(message: string): void {
		const event = this.parseMessage(message);
		if (!event || !this.api) return;

		try {
			this.applyEvent(event);
		} catch (error) {
			console.error("failed to apply a remote event", error);
		}
	}

	private applyEvent(event: TRemoteEvent): void {
		switch (event.type) {
			case "task":
				return this.applyEventTask(event);
			case "link":
				return this.applyEventLink(event);
			case "assignment":
				return this.applyEventAssignment(event);
		}
	}

	// ---------- Task events ----------

	private applyEventTask(event: TRemoteEvent) {
		const id = this.resolveRemoteId(event.id, TaskID);
		let task: IGanttTask | undefined;
		if (event.data) {
			const data = [event.data as IGanttTask];
			task = (this.provider.parseDates?.(data) ?? data)[0] as IGanttTask;
		}

		const operation = task?.operation;
		if (task) {
			task.id = id;
			task.parent = this.resolveRemoteId(task.parent, TaskID);
			if ("target" in task)
				task.target = this.resolveRemoteId(task.target, TaskID);
			delete task.open;
			delete task.operation;
		}

		switch (event.action) {
			case "add":
				if (this.isTaskLoaded(id)) return;
				return this.applyEventTaskAdd(id, task);
			case "update":
				return this.applyEventTaskUpdate(id, task, operation);
			case "delete":
				return this.applyEventTaskDelete(id);
		}
	}

	private applyEventTaskAdd(id: TID, task?: IGanttTask): void {
		if (!task) return;
		if (!this.canAcceptChild(task?.parent)) return;
		const hasTarget = this.isTaskLoaded(task?.target);
		const addTask = { ...task };
		delete addTask.index;
		delete addTask.target;
		delete addTask.mode;
		this.api.exec("add-task", {
			id,
			task: addTask,
			target: hasTarget ? task?.target : undefined,
			mode: hasTarget ? task?.mode : undefined,
			index: task?.index,
			...PARAMS,
		});
	}

	private applyEventTaskUpdate(
		id: TID,
		task?: IGanttTask,
		operation?: string
	): void {
		if (!task) return;
		if (!this.isTaskLoaded(id)) {
			return this.applyEventTaskAdd(id, task);
		}
		delete task.lazy;
		if (!operation) {
			this.api.exec("update-task", {
				id,
				task,
				...PARAMS,
			});
		} else if (operation === "move") {
			if (!this.canAcceptChild(task?.parent)) {
				return this.applyEventTaskDelete(id);
			}
			const hasTarget = this.isTaskLoaded(task?.target);
			this.api.exec("move-task", {
				id,
				target: hasTarget ? task?.target : task?.parent,
				mode: hasTarget ? task?.mode : "child",
				...PARAMS,
			});
		}
	}

	private applyEventTaskDelete(id: TID): void {
		if (!this.isTaskLoaded(id)) return;
		this.api.exec("delete-task", {
			id,
			...PARAMS,
		});
	}

	// ---------- Link events ----------

	private applyEventLink(event: TRemoteEvent): void {
		const id = this.resolveRemoteId(event.id, LinkID);
		const link = event.data ? (event.data as ILink) : undefined;
		if (link) {
			link.id = id;
			link.source = this.resolveRemoteId(link.source, TaskID);
			link.target = this.resolveRemoteId(link.target, TaskID);
		}

		switch (event.action) {
			case "add":
				return this.applyEventLinkAdd(id, link);
			case "update":
				return this.applyEventLinkUpdate(id, link);
			case "delete":
				return this.applyEventLinkDelete(id);
		}
	}

	private applyEventLinkAdd(id: TID, link?: ILink): void {
		if (!link) return;
		if (this.isLinkLoaded(id)) return;
		if (!this.isTaskLoaded(link.source) || !this.isTaskLoaded(link.target))
			return;
		this.api.exec("add-link", {
			id,
			link,
			...PARAMS,
		});
	}

	private applyEventLinkUpdate(id: TID, link?: ILink): void {
		if (!link) return;
		if (!this.isLinkLoaded(id)) return;
		this.api.exec("update-link", {
			id,
			link,
			...PARAMS,
		});
	}

	private applyEventLinkDelete(id: TID): void {
		if (!this.isLinkLoaded(id)) return;
		this.api.exec("delete-link", {
			id,
			...PARAMS,
		});
	}

	// ---------- Assignment events ----------

	private applyEventAssignment(event: TRemoteEvent): void {
		const id = this.resolveRemoteId(event.id, AssignmentID);
		const assignment = event.data ? (event.data as IAssignment) : undefined;
		if (assignment) {
			assignment.id = id;
			assignment.task = this.resolveRemoteId(assignment.task, TaskID);
		}

		switch (event.action) {
			case "add":
				return this.applyEventAssignmentAdd(id, assignment);
			case "update":
				return this.applyEventAssignmentUpdate(id, assignment);
			case "delete":
				return this.applyEventAssignmentDelete(id);
		}
	}

	private applyEventAssignmentAdd(id: TID, assignment?: IAssignment): void {
		if (!assignment) return;
		if (this.isAssignmentLoaded(id)) return;
		if (!this.isTaskLoaded(assignment.task)) return;
		this.api.exec("add-assignment", {
			id,
			assignment,
			...PARAMS,
		});
	}

	private applyEventAssignmentUpdate(
		id: TID,
		assignment?: IAssignment
	): void {
		if (!assignment) return;
		if (!this.isAssignmentLoaded(id)) return;
		this.api.exec("update-assignment", {
			id,
			assignment,
			...PARAMS,
		});
	}

	private applyEventAssignmentDelete(id: TID): void {
		if (!this.isAssignmentLoaded(id)) return;
		this.api.exec("delete-assignment", {
			id,
			...PARAMS,
		});
	}

	// ---------- Helpers ----------

	private resolveRemoteId(id: TID, kind: number): TID {
		if (id === null || typeof id === "undefined") return id;
		const localId = this.provider.resolveId(id, kind) ?? id;
		if (localId === id) return id;
		return this.doesItemExist(localId, kind) ? localId : id;
	}

	private doesItemExist(id: TID, kind: number): boolean {
		switch (kind) {
			case TaskID:
				return !!this.api.getTask(id);
			case LinkID:
				return this.isLinkLoaded(id);
			case AssignmentID:
				return this.isAssignmentLoaded(id);
			default:
				return true;
		}
	}

	private isTaskLoaded(id: TID): boolean {
		return !id || !!this.api.getTask(id);
	}

	private canAcceptChild(id: TID): boolean {
		if (!id) return true;
		const parent = this.api.getTask(id);
		return !!parent && !parent.lazy;
	}

	private isLinkLoaded(id: TID): boolean {
		return !!this.api.getState().links.byId(id);
	}

	private isAssignmentLoaded(id: TID): boolean {
		return !!this.api.getState().assignments?.byId(id);
	}

	// ---------- Parsing ----------

	private parseMessage(message: string): TRemoteEvent | null {
		const clientId = this.clientId;

		let data: unknown;

		// Parse incoming message as JSON
		try {
			data = JSON.parse(message);
		} catch {
			return null;
		}

		// Validate data's shape
		if (
			data === null ||
			typeof data !== "object" ||
			!("from" in data) ||
			data.from === clientId ||
			!("type" in data) ||
			typeof data.type !== "string" ||
			!("action" in data) ||
			typeof data.action !== "string" ||
			!("id" in data)
		) {
			return null;
		}

		return data as TRemoteEvent;
	}
}
