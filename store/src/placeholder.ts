import { IParsedTask, ITask, TID, IData, ICalendar } from "./types";

export const PLACEHOLDER_ROW_ID = "wx_placeholder_row";

export function isPlaceholder(id: TID): boolean {
	return id === PLACEHOLDER_ROW_ID;
}

export function getPlaceholderTask(
	row: Partial<ITask>,
	defaultText?: string
): Partial<ITask> {
	const task = { ...row };
	delete task.id;
	delete task.unscheduled;
	Object.keys(task).forEach(key => {
		if (key.startsWith("$")) delete task[key];
	});
	if (!task.text) task.text = defaultText;
	return task;
}

export function createPlaceholderRow(): IParsedTask {
	let row: IParsedTask = null;
	return row;
}

export function applyPlaceholderDates(
	row: IParsedTask,
	state: Partial<IData>,
	calendar?: ICalendar
) {
}
