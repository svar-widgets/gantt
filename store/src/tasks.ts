import {
	IGanttTask,
	IParsedTask,
	GanttDataTree,
	ITask,
	IData,
	IDataHash,
} from "./types";
import { isEqual } from "date-fns";
import { isCommunity } from "./package";

const baselineHeight = 8;
const baselineTopPadding = 4;
const defaultPadding = 3;
const heightAdjustment = 7;
const baselineAdjustment = baselineHeight + baselineTopPadding;

export function dragSummaryKids(
	task: IParsedTask,
	dx: number,
	state: Partial<IData>
) {
	if (task.open || task.type != "summary") {
		task.data?.forEach(kid => {
			if (typeof kid.$x === "undefined") setTaskSizes(kid, state);
			kid.$x += dx;
			dragSummaryKids(kid, dx, state);
		});
	}
}

export function dragSummary(
	tasks: GanttDataTree,
	task: IParsedTask,
	state: Partial<IData>,
	updateHidden?: boolean
) {
	const summary = tasks.getSummaryId(task.id);
	if (summary) {
		const pobj = tasks.byId(summary);
		const coords = {
			xMin: Infinity,
			xMax: 0,
		};
		if (updateHidden) calculateHiddenDimentions(pobj, state);
		getSummaryBarSize(pobj, coords, state);
		pobj.$x = coords.xMin;
		pobj.$w = coords.xMax - coords.xMin;
		dragSummary(tasks, pobj, state);
	}
}

function getSummaryBarSize(
	task: IParsedTask,
	coords: { xMin: number; xMax: number },
	state: Partial<IData>
) {
	task.data?.forEach(kid => {
		if (!kid.unscheduled) {
			if (typeof kid.$x === "undefined") setTaskSizes(kid, state);
			const mD = kid.type === "milestone" && kid.$h ? kid.$h / 2 : 0;
			if (coords.xMin > kid.$x + mD) {
				coords.xMin = kid.$x + mD;
			}
			const right = kid.$x + kid.$w - mD;
			if (coords.xMax < right) {
				coords.xMax = right;
			}
		}

		if (kid.type !== "summary") getSummaryBarSize(kid, coords, state);
	});
}

function setTaskSizes(task: IParsedTask, state: Partial<IData>) {
	const { _scales: s, cellWidth } = state;
	task.$x = Math.round(s.diff(task.start, s.start, s.lengthUnit) * cellWidth);
	task.$w = Math.round(
		s.diff(task.end, task.start, s.lengthUnit, true) * cellWidth
	);
}

export function setSummaryDates(task: ITask, tasks?: Partial<ITask>[]): ITask {
	let data;
	if (tasks) {
		data = tasks.filter(t => t.parent == task.id);
	}

	const copy = { data, ...task } as IParsedTask;
	if (copy.data?.length) {
		copy.data.forEach((kid: ITask) => {
			if (kid.unscheduled && !kid.data) return;
			if (tasks || (kid.type != "summary" && kid.data)) {
				if (kid.unscheduled)
					// reset own dates to take from kids
					kid = { ...kid, start: undefined, end: undefined };
				kid = setSummaryDates(kid, tasks);
			}
			if (kid.start && (!copy.start || copy.start > kid.start)) {
				copy.start = new Date(kid.start);
			}

			const end = kid.end || kid.start;
			if (end && (!copy.end || copy.end < end)) {
				copy.end = new Date(end);
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
	state: Partial<IData>
): IGanttTask {
	calculateTaskDimensions(t, i, state, false);
	if (state.splitTasks) {
		t.segments?.forEach((s: Partial<IGanttTask>) => {
			updateTask(s as IGanttTask, i, {
				...state,
				baselines: false,
			});
			s.$x -= t.$x;
		});
	}
	if (state.baselines) {
		calculateTaskDimensions(t, i, state, true);
	}

	return t;
}

function calculateTaskDimensions(
	t: IParsedTask,
	i: number | null,
	state: Partial<IData>,
	isBaseline: boolean
) {
	const { cellWidth, cellHeight, _scales, baselines } = state;
	const { start: scaleStart, end: scaleEnd, lengthUnit, diff } = _scales;
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
	t[w] = Math.round(diff(endDate, startDate, lengthUnit, true) * cellWidth);
	if (i !== null) {
		t[y] = isBaseline
			? t.$y + t.$h + baselineTopPadding
			: cellHeight * i + defaultPadding;
	}
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

	if (state.unscheduledTasks && t.unscheduled && !isBaseline)
		t["$skip"] = true;
	else t[skip] = isEqual(startDate, endDate);
}

function calculateHiddenDimentions(
	t: IParsedTask,
	state: Partial<IData>,
	isHidden?: boolean
) {
	if (t.data && !t.$skip) {
		isHidden = isHidden || !t.open;
		t.data.forEach((child: IGanttTask) => {
			if (isHidden) calculateTaskDimensions(child, null, state, false);
			calculateHiddenDimentions(child, state, isHidden);
		});
	}
}

export function isSegmentMoveAllowed(task: IGanttTask, moveOptions: IDataHash) {
	if (isCommunity()) return false;
	const { mode, l, w, dx, index } = moveOptions;
	const { segments } = task;
	if (index || mode === "end") {
		if (dx > 0 && index < segments.length - 1) {
			if (l + w + dx > segments[index + 1].$x + task.$x) {
				return false;
			}
		} else if (dx < 0 && index) {
			const d = mode === "end" ? w : 0;
			if (
				l + dx + d <
				segments[index - 1].$x + task.$x + segments[index - 1].$w
			) {
				return false;
			}
		}
	}
	return true;
}

export function extendDragOptions(task: ITask, options: IDataHash) {
	if (isCommunity()) return;
	const { segments } = task;
	const { segmentIndex, mode } = options;
	const s = segments[segmentIndex];
	if (segmentIndex || mode !== "move") {
		options.index = segmentIndex;
		options.l = s.$x + task.$x;
		options.w = s.$w;
		options.segment = true;
	}
}
