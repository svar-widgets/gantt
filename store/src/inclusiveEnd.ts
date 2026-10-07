import { addDays } from "date-fns";
import type {
	ICalendar,
	IDataConfig,
	IGanttColumn,
	ITask,
	TCalendarGetter,
} from "./types";

// end-like fields and the start of the span each one closes
const inclusiveEndKeys: Record<string, keyof ITask | null> = {
	end: "start",
	base_end: "base_start",
	deadline: null,
};

const finishConstraints = ["fnlt", "fnet", "mfo"];

function hasFinishConstraint(task: Partial<ITask>): boolean {
	const c = task.constraint;
	return (
		!!c?.date &&
		finishConstraints.includes(c.type) &&
		task.type !== "milestone"
	);
}

// the last working day before an end-like date, never before the span start:
// Sat 00:00 and Mon 00:00 after a weekend are both shown as Fri
function getLastDay(date: Date, calendar?: ICalendar, start?: Date): Date {
	if (start && date <= start) return start;
	const day = calendar?.getPreviousWorkingDay(date) ?? addDays(date, -1);
	return start && day < start ? start : day;
}

function getInclusiveEnd(
	task: Partial<ITask>,
	key: string,
	calendar?: ICalendar
): Date {
	const date = task[key as keyof ITask] as Date;
	if (!date) return date;
	const startKey = inclusiveEndKeys[key];
	return getLastDay(date, calendar, startKey && (task[startKey] as Date));
}

export function toInclusiveTask(
	task: Partial<ITask>,
	calendar?: ICalendar
): Partial<ITask> {
	const values: Record<string, any> = { ...task };
	for (const key in inclusiveEndKeys)
		if (task[key as keyof ITask])
			values[key] = getInclusiveEnd(task, key, calendar);
	if (hasFinishConstraint(task))
		values.constraint = {
			...task.constraint,
			date: getLastDay(task.constraint.date, calendar),
		};
	if (task.segments)
		values.segments = task.segments.map(s =>
			s.end ? { ...s, end: getInclusiveEnd(s, "end", calendar) } : s
		);
	return values;
}

const storedKeys = [...Object.keys(inclusiveEndKeys), "constraint", "segments"];

// `values` are toInclusiveTask(stored) with one field edited: only that field
// is converted back, other end-like dates keep their stored values
export function fromInclusiveTask(
	values: Partial<ITask>,
	key: string,
	stored: Partial<ITask>
): Partial<ITask> {
	const task: Record<string, any> = { ...values };
	for (const k of storedKeys)
		if (k !== key && k in stored) task[k] = stored[k as keyof ITask];

	const value = task[key];
	if (!value) return task;
	if (key in inclusiveEndKeys) task[key] = addDays(value, 1);
	else if (key === "constraint" && hasFinishConstraint(task))
		task.constraint = { ...value, date: addDays(value.date, 1) };
	return task;
}

// app code receives stored dates: the getter feeds the default cell text,
// the inline editor and the filter, the setter takes the edited value back,
// while a template gets the stored field
export function setInclusiveEndColumn(
	column: IGanttColumn,
	stateGetter: () => Pick<IDataConfig, "inclusiveEnd">,
	calendarGetter?: TCalendarGetter
): IGanttColumn {
	const { id, template } = column;
	if (!(id in inclusiveEndKeys) || column.getter || column.setter)
		return column;

	const col: IGanttColumn = {
		...column,
		getter: (row: ITask) =>
			stateGetter().inclusiveEnd
				? getInclusiveEnd(row, id, calendarGetter?.(row))
				: row[id as keyof ITask],
		setter: (row: ITask, value: Date) => {
			(row as any)[id] =
				stateGetter().inclusiveEnd && value ? addDays(value, 1) : value;
		},
	};
	if (template && !column._template)
		col.template = (_v, row, c) =>
			template(row[id as keyof ITask] as any, row, c);
	return col;
}
