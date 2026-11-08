// store actions that call other store actions, naming themselves as eventSource
const PARENT_ACTIONS: string[] = [
	"add-task",
	"update-task",
	"delete-task",
	"copy-task",
	"move-task",
	"indent-task",
	"split-task",
	"schedule-tasks",
	"add-link",
	"update-link",
	"delete-link",
	"add-assignment",
	"update-assignment",
	"delete-assignment",
	"provide-data",
	"import-data",
];

// a child only writes: the parent that called it handles what the write implies
export function isChild(eventSource?: string): boolean {
	return !!eventSource && PARENT_ACTIONS.includes(eventSource);
}

export function isRemote(eventSource?: string): boolean {
	return eventSource === "remote";
}

// a record is written as it arrives, nothing is calculated for it
export function isRecord(eventSource?: string): boolean {
	return (
		isRemote(eventSource) ||
		eventSource === "undo" ||
		eventSource === "redo"
	);
}
