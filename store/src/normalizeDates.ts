import type { ITask, TDurationUnit, IData, Calendar } from "./types";
import { getDiffer, getAdder } from "./time";
import { setSummaryDates } from "./tasks";

const unitAdd = (unit: TDurationUnit, calendar?: Calendar) =>
	getAdder(unit, calendar);
const unitDiff = (unit: TDurationUnit, calendar?: Calendar) =>
	getDiffer(unit, calendar);

export function parseTaskDates(tasks: ITask[], state: Partial<IData>) {
	if (Array.isArray(tasks)) {
		//calc dates for single task
		tasks.forEach(task => normalizeDates(task, state));
		//calc summary dates
		tasks.forEach(task => {
			if (task.type === "summary" && !(task.start && task.end)) {
				const { start, end } = setSummaryDates(task, tasks);
				task.start = start;
				task.end = end;
				normalizeDates(task, state);
			}
		});
	}
}

export function normalizeDates(task: Partial<ITask>, state: Partial<IData>) {
	if (!task.unscheduled) {
		calcDates(task, state, false);
	}
	if (task.base_start) calcDates(task, state, true);
}

export function calcDates(
	task: Partial<ITask>,
	state: Partial<IData>,
	isBaseline?: boolean
) {
	const { calendar, durationUnit } = state;
	const unit = durationUnit || "day";
	const [start, end, duration] = getFields(isBaseline);
	if (task.type === "milestone") {
		task[duration] = 0;
		task[end] = undefined;
		// start is must-have for correcting
	} else if (task[start]) {
		if (!task[duration]) {
			if (task[end]) {
				task[duration] = unitDiff(unit, calendar)(
					task[end],
					task[start]
				);
			} else {
				task[end] = unitAdd(unit, calendar)(task[start], 1);
				task[duration] = 1;
			}
		} else {
			task[end] = unitAdd(unit, calendar)(task[start], task[duration]);
		}
	}
}

export function getFields(isBaseline: boolean) {
	if (isBaseline) return ["base_start", "base_end", "base_duration"];
	return ["start", "end", "duration"];
}

function prepareDates(task: Partial<ITask>, key: string, isBaseline: boolean) {
	const [start, end, duration] = getFields(isBaseline);
	if (key === duration || key === start) {
		task[end] = null;
	}
	if (key === end) {
		task[duration] = 0;
		if (task[start] && task[start] >= task[end]) {
			task[end] = null;
			task[duration] = 1;
		}
	}
}

export function prepareEditTask(
	task: Partial<ITask>,
	state: Partial<IData>,
	key: string
) {
	prepareDates(task, key, false);
	if (task.base_start) prepareDates(task, key, true);

	normalizeDates(task, state);
}
