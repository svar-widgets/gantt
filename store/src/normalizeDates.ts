import type {
	ITask,
	TDurationUnit,
	IData,
	ICalendar,
	TCalendarGetter,
	GanttDataTree,
	TID,
} from "./types";
import { getDiffer, getAdder } from "./time";
import { isManualSummary, setSummaryDates } from "./tasks";

const unitAdd = (unit: TDurationUnit, calendar?: ICalendar) =>
	getAdder(unit, calendar);
const unitDiff = (unit: TDurationUnit, calendar?: ICalendar) =>
	getDiffer(unit, calendar);

// a summary reads only the branch below it, which post-order has already dated
export function parseTreeDates(
	tasks: GanttDataTree,
	state: Partial<IData>,
	calendarGetter: TCalendarGetter,
	parent: TID = 0
) {
	const walk = (branch: ITask[]) => {
		if (!branch) return;
		branch.forEach(task => {
			walk(task.data as ITask[]);
			normalizeDates(task, state, calendarGetter(task));
			if (task.type !== "summary") return;

			// a supplied value is kept, a missing one is derived,
			// except a manual summary's, whose dates are its own
			const datesMissing =
				!(task.start && task.end) && !isManualSummary(task, state);
			const flagMissing =
				state.inactiveTasks && task.inactive === undefined;
			if (!datesMissing && !flagMissing) return;

			const derived = setSummaryDates(
				task,
				state.unscheduledTasks,
				state.inactiveTasks,
				// a supplied flag decides which members count
				state.inactiveTasks && !flagMissing ? !task.inactive : undefined
			);
			if (flagMissing && derived.inactive) task.inactive = true;
			if (datesMissing) {
				task.start = derived.start;
				task.end = derived.end;
				task.duration = undefined;
				normalizeDates(task, state, calendarGetter(task));
			}
		});
	};
	walk(tasks.byId(parent)?.data as ITask[]);
}

// a partial update speaks only about the fields it carries
const effective = (
	task: Partial<ITask>,
	prev: Partial<ITask> | undefined,
	key: string
) => (key in task ? task[key] : prev?.[key]);

export function deriveUnscheduled(task: Partial<ITask>, prev?: Partial<ITask>) {
	task.unscheduled = !effective(task, prev, "start");
}

function fillDateFields(
	task: Partial<ITask>,
	prev: Partial<ITask>,
	unscheduledTasks: boolean
) {
	if (!("type" in task)) task.type = prev.type;
	// a start can only be dropped when unscheduled tasks are allowed
	if (!task.start && !(unscheduledTasks && "start" in task))
		task.start = prev.start;
	if (!task.end && !task.duration) task.duration = prev.duration;
	if (!("segments" in task) && prev.segments) task.segments = prev.segments;
}

export function normalizeDates(
	task: Partial<ITask>,
	state: Partial<IData>,
	calendar: ICalendar | undefined,
	prev?: Partial<ITask>
) {
	if (prev) fillDateFields(task, prev, state.unscheduledTasks);
	if (task.start) calcDates(task, state, calendar, false);
	else if (state.unscheduledTasks) {
		task.start = null;
		task.end = null;
		if (task.type === "summary") task.duration = null;
	}
	if (state.unscheduledTasks) deriveUnscheduled(task, prev);
	if (task.base_start) calcDates(task, state, calendar, true);
}

export function calcDates(
	task: Partial<ITask>,
	state: Partial<IData>,
	calendar: ICalendar | undefined,
	isBaseline?: boolean
) {
	const { durationUnit } = state;
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
	if (key === duration || (key === start && task.start)) {
		if (key === duration && task[duration] < 1) task[duration] = 1;
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
	calendar: ICalendar,
	key: string
) {
	prepareDates(task, key, false);
	if (task.base_start) prepareDates(task, key, true);

	normalizeDates(task, state, calendar);
}
