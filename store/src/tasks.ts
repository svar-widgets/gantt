import type {
	IGanttTask,
	GanttScaleData,
	IParsedTask,
	GanttDataTree,
	ITask,
} from "./types";
import { isEqual } from "date-fns";

const baselineHeight = 8;
const baselineTopPadding = 4;
const defaultPadding = 3;
const heightAdjustment = 7;
const baselineAdjustment = baselineHeight + baselineTopPadding;

export function dragSummaryKids(task: IParsedTask, dx: number) {
	if (task.open) {
		task.data?.forEach(kid => {
			kid.$x += dx;
			dragSummaryKids(kid, dx);
		});
	}
}

export function dragSummary(
	tasks: GanttDataTree,
	task: IParsedTask,
	_scales: GanttScaleData,
	cellWidth: number
) {
	const summary = tasks.getSummaryId(task.id);
	if (summary) {
		const pobj = tasks.byId(summary);
		const coords = {
			xMin: Infinity,
			xMax: 0,
		};
		getSummaryBarSize(pobj, coords, _scales, cellWidth);
		pobj.$x = coords.xMin;
		pobj.$w = coords.xMax - coords.xMin;

		dragSummary(tasks, pobj, _scales, cellWidth);
	}
}

function getSummaryBarSize(
	task: IParsedTask,
	coords: { xMin: number; xMax: number },
	_scales: GanttScaleData,
	cellWidth: number
) {
	const { lengthUnit, start } = _scales;
	task.data?.forEach(kid => {
		if (typeof kid.$x === "undefined") {
			kid.$x = Math.round(
				_scales.diff(kid.start, start, lengthUnit) * cellWidth
			);
			kid.$w = Math.round(
				_scales.diff(kid.end, kid.start, lengthUnit, true) * cellWidth
			);
		}
		const mD = kid.type === "milestone" && kid.$h ? kid.$h / 2 : 0;
		if (coords.xMin > kid.$x) {
			coords.xMin = kid.$x + mD;
		}
		const right = kid.$x + kid.$w - mD;
		if (coords.xMax < right) {
			coords.xMax = right;
		}
		if (kid.type !== "summary")
			getSummaryBarSize(kid, coords, _scales, cellWidth);
	});
}

export function setSummaryDates(
	task: IParsedTask,
	tasks?: Partial<ITask>[]
): IParsedTask {
	let data;
	if (tasks) {
		data = tasks.filter(t => t.parent == task.id);
	}
	const copy = { data, ...task };
	if (copy.data?.length) {
		copy.data.forEach((kid: IParsedTask) => {
			if (tasks || (kid.type != "summary" && kid.data))
				kid = setSummaryDates(kid, tasks);
			if (!copy.start || copy.start > kid.start) {
				copy.start = new Date(kid.start);
			}
			if (
				!copy.end ||
				copy.end < kid.end ||
				(kid.type === "milestone" && copy.end < kid.start)
			) {
				copy.end = new Date(kid.end || kid.start);
			}
		});
	} else if (task.type === "summary") {
		throw Error(
			"Summary tasks must have start and end dates if they have no subtasks"
		);
	}

	return copy;
}

export function updateTask(
	t: IGanttTask,
	i: number,
	cellWidth: number,
	cellHeight: number,
	scales: GanttScaleData,
	baselines: boolean
): IGanttTask {
	calculateTaskDimensions(
		t,
		i,
		cellWidth,
		cellHeight,
		scales,
		baselines,
		false
	);

	if (baselines) {
		calculateTaskDimensions(
			t,
			i,
			cellWidth,
			cellHeight,
			scales,
			baselines,
			true
		);
	}

	return t;
}

function calculateTaskDimensions(
	t: IGanttTask,
	i: number,
	cellWidth: number,
	cellHeight: number,
	scales: GanttScaleData,
	baselines: boolean,
	isBaseline: boolean
) {
	const { start: scaleStart, end: scaleEnd, lengthUnit, diff } = scales;
	const start = (isBaseline ? "base_" : "") + "start";
	const end = (isBaseline ? "base_" : "") + "end";
	const x = "$x" + (isBaseline ? "_base" : "");
	const y = "$y" + (isBaseline ? "_base" : "");
	const w = "$w" + (isBaseline ? "_base" : "");
	const h = "$h" + (isBaseline ? "_base" : "");
	const skip = "$skip" + (isBaseline ? "_baseline" : "");

	let startDate = t[start];
	let endDate = t[end];

	if (isBaseline && !startDate) {
		t[skip] = true;
		return;
	}

	if (
		t[start] < scaleStart &&
		(t[end] < scaleStart || isEqual(t[end], scaleStart))
	) {
		startDate = endDate = scaleStart;
	} else if (t[start] > scaleEnd) {
		startDate = endDate = scaleEnd;
	}

	t[x] = Math.round(diff(startDate, scaleStart, lengthUnit) * cellWidth);
	t[y] = isBaseline
		? t.$y + t.$h + baselineTopPadding
		: cellHeight * i + defaultPadding;
	t[w] = Math.round(diff(endDate, startDate, lengthUnit, true) * cellWidth);
	t[h] = isBaseline
		? baselineHeight
		: baselines
			? cellHeight - heightAdjustment - baselineAdjustment
			: cellHeight - heightAdjustment;

	if (t.type === "milestone") {
		t[x] = t[x] - t.$h / 2;
		t[w] = t.$h;

		if (isBaseline) {
			t[y] = t.$y + baselineHeight;
			t[w] = t[h] = t.$h;
		}
	}

	t[skip] = isEqual(startDate, endDate);
}
