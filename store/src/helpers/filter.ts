import { IParsedTask, TFilterHandler, TID } from "../types";

export function filterTask(
	task: IParsedTask,
	filter: TFilterHandler,
	ids: Set<TID>,
	open?: boolean
) {
	const matched = task.id === 0 || filter(task);
	let childMatched = false;

	if (Array.isArray(task.data)) {
		for (const child of task.data) {
			if (filterTask(child, filter, ids, open)) childMatched = true;
		}
		if (childMatched) {
			delete task.$empty;
			if (open) task.open = true;
		} else {
			task.$empty = true;
		}
	}

	if ((matched || childMatched) && task.id !== 0) {
		ids.add(task.id);
		return true;
	}

	return false;
}

export function deleteFromFiltered(
	ids: Set<string | number>,
	id: TID,
	branch?: IParsedTask[]
) {
	if (ids.has(id)) ids.delete(id);
	if (branch?.length) {
		branch.forEach(t => deleteFromFiltered(ids, t.id, t.data));
	}
}
