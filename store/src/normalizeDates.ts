import type { ITask } from "./types";
import { getDiffer, getAdder } from "./time";

const unitAdd = (unit: "day" | "hour") => getAdder(unit);
const unitDiff = (unit: "day" | "hour") => getDiffer(unit);

export function prepareTask(
	currentTask: Partial<ITask>,
	task: Partial<ITask>,
	unit: "day" | "hour"
) {
	fillDates(currentTask, task);
	if (currentTask.base_start) fillDates(currentTask, task, true);
	normalizeDates(task, unit);
}

export function normalizeDates(
	task: Partial<ITask>,
	unit: "day" | "hour",
	edit?: boolean,
	key?: string
) {
	if (!task.unscheduled) {
		if (edit) prepareEditTask(task, key);
		calcDates(task, unit);
	}
	if (task.base_start) calcDates(task, unit, true);
}

function fillDates(
	currentTask: Partial<ITask>,
	task: Partial<ITask>,
	isBaseline = false
) {
	task.type = task.type || currentTask.type;

	const [start, end, duration] = getFields(isBaseline);

	// for partial task objects - fill related field for calculation
	// changing only start or end will not keep duration
	// duration is set to 1 for incorrect updates
	if (task.type !== "milestone") {
		if (!(currentTask[end] && task[start]))
			task[start] = currentTask[start];
		if (task[start] && !(task[duration] || task[end])) {
			task[end] =
				currentTask[end] > task[start] ? currentTask[end] : null;
			if (!task[end]) task[duration] = 1;
		} else if (task[end] && !(task[duration] || task[start])) {
			task[start] =
				currentTask[start] < task[end] ? currentTask[start] : task[end];
			if (task[start] === task[end]) {
				task[duration] = 1;
				delete task[end];
			}
		} else if (task[duration] && !(task[start] || task[end])) {
			task[start] = currentTask[start];
		}
	} else {
		if (task[end]) delete task[end];
		if (currentTask[end]) delete currentTask[end];
	}
}

function calcDates(
	task: Partial<ITask>,
	unit: "day" | "hour" = "day",
	isBaseline?: boolean
) {
	const [start, end, duration] = getFields(isBaseline);

	if (task.type === "milestone") {
		task[duration] = 0;
		// start is must-have for correcting
	} else if (task[start]) {
		if (!task[duration]) {
			if (task[end]) {
				task[duration] = unitDiff(unit)(task[end], task[start]);
			} else {
				task[end] = task[start];
				task[duration] = 0;
			}
		} else if (!task[end]) {
			task[end] = unitAdd(unit)(task[start], task[duration]);
		}
	}
}

export function getFields(isBaseline: boolean) {
	if (isBaseline) return ["base_start", "base_end", "base_duration"];
	return ["start", "end", "duration"];
}

function prepareEditTask(task: Partial<ITask>, key: string) {
	if (key === "duration") {
		task.end = null;
	}

	if (task.start && task.end) {
		if (task.start >= task.end) task.end = null;
		else task.duration = null;
	}

	if (task.base_start && task.base_end) {
		if (task.base_start >= task.base_end) task.base_end = null;
		else task.base_duration = null;
	}
}
