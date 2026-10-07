import { locate, getID, setID } from "@svar-ui/lib-dom";
import { getTaskAtRow } from "./chart.js";

function getGridRow(from, id) {
	const gantt = from?.closest?.(".wx-gantt");
	return gantt?.querySelector(`.wx-row[data-id="${setID(id)}"]`) || null;
}

// Resolve a pointer/drag event to a gantt task grid row
export function locateTask(ev, api) {
	const el = locate(ev);
	if (el) {
		const id = getID(el);
		const node =
			getGridRow(el, id) || (!el.closest(".wx-area") ? el : null);
		if (node) return { id, node };
	}

	if (!api || ev?.clientY == null) return null;

	const target = ev.target instanceof Element ? ev.target : null;
	const area = target?.closest(".wx-area");
	if (!area) return null;

	const rect = area.getBoundingClientRect();
	const { _tasks, cellHeight = 1 } = api.getState();
	if (!_tasks?.length) return null;

	const task = getTaskAtRow(_tasks, ev.clientY - rect.top, cellHeight);
	if (!task || task.id == null) return null;

	const node = getGridRow(area, task.id);
	return node ? { id: task.id, node } : null;
}
