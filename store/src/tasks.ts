import {
	IGanttTask,
	IParsedTask,
	GanttDataTree,
	ITask,
	IDataHash,
	IData,
	ICalendar,
	TID,
	TMethodsConfig,
} from "./types";
import { isEqual } from "date-fns";
import { isCommunity } from "./package";
import { EventBus } from "@svar-ui/lib-state";
import { getAdder } from "./time";


export const heightAdjustment = 7;
const defaultPadding = 3;
const baselineHeight = 8;
const baselineTopPadding = 4;
const baselineAdjustment = baselineHeight + baselineTopPadding;


export function isManualSummary(
	task: Partial<ITask>,
	state?: Partial<IData>
): boolean {
	return task.type === "summary" && !!task.manual && !!state?.schedule?.auto;
}

export function dragSummaryKids(
	task: IParsedTask,
	dx: number,
	rollups: boolean,
	holdManual?: boolean
) {
	if (task.open || task.type !== "summary" || rollups) {
		task.data?.forEach(kid => {
			if (holdManual && kid.manual) return;
			kid.$x += dx;
			if (kid.$x_rollup) {
				kid.$x_rollup += dx;
			}
			dragSummaryKids(kid, dx, rollups, holdManual);
		});
	}
}

export function dragSummary(
	tasks: GanttDataTree,
	task: IParsedTask,
	inactiveTasks?: boolean,
	autoSchedule?: boolean
) {
	const summary = tasks.getSummaryId(task.id);
	if (summary) {
		const pobj = tasks.byId(summary);
		// nothing above a manual summary moves either
		if (autoSchedule && pobj.manual) return;
		const coords = {
			xMin: Infinity,
			xMax: 0,
		};
		getSummaryBarSize(pobj, coords, !!inactiveTasks && !pobj.inactive);
		if (Number.isFinite(coords.xMin)) {
			pobj.$x = coords.xMin;
			pobj.$w = coords.xMax - coords.xMin;
		}
		dragSummary(tasks, pobj, inactiveTasks, autoSchedule);
	}
}

function getSummaryBarSize(
	task: IParsedTask,
	coords: { xMin: number; xMax: number },
	excludeInactive?: boolean
) {
	task.data?.forEach(kid => {
		if (!kid.unscheduled && !(excludeInactive && kid.inactive)) {
			const mD = kid.type === "milestone" && kid.$h ? kid.$h / 2 : 0;
			if (coords.xMin > kid.$x + mD) {
				coords.xMin = kid.$x + mD;
			}
			const right = kid.$x + kid.$w - mD;
			if (coords.xMax < right) {
				coords.xMax = right;
			}
		}

		if (kid.type !== "summary")
			getSummaryBarSize(kid, coords, excludeInactive);
	});
}


export function setSummaryDates(
	task: ITask,
	unscheduledTasks?: boolean,
	inactiveTasks?: boolean,
	excludeInactive?: boolean
): ITask {
	const copy = { ...task } as IParsedTask;
	if (copy.data?.length) {
		copy.data.forEach((kid: ITask) => {
			const skipInactive = !!(excludeInactive && kid.inactive);
			if (unscheduledTasks && kid.unscheduled && !kid.data) return;
			if (skipInactive && (kid.type === "summary" || !kid.data)) return;
			if (kid.type !== "summary" && kid.data) {
				if ((unscheduledTasks && kid.unscheduled) || skipInactive)
					// reset own dates to take from kids
					kid = { ...kid, start: undefined, end: undefined };
				kid = setSummaryDates(
					kid,
					unscheduledTasks,
					inactiveTasks,
					excludeInactive
				);
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
		console.warn(
			`Summary task ${task.id} has no subtasks, so its dates cannot be derived. Provide start and end dates for it.`
		);
	}

	return copy;
}

export function updateTask(
	t: IGanttTask,
	i: number | null,
	state: Partial<IData>
): IGanttTask {
	calculateTaskDimensions(t, i, state, false);


	if (t.data && !t.open) {
		calculateHiddenDimensions(t, state);
	}

	return t;
}


function calculateTaskDimensions(
	t: IParsedTask,
	i: number | null,
	state: Partial<IData>,
	isBaseline: boolean
) {
	const { cellWidth, cellHeight, _scales, baselines, _rollups } = state;
	const { start: scaleStart, end: scaleEnd, lengthUnit, diff } = _scales;
	const start = (isBaseline ? "base_" : "") + "start";
	const end = (isBaseline ? "base_" : "") + "end";
	const x = "$x" + (isBaseline ? "_base" : "");
	const y = "$y" + (isBaseline ? "_base" : "");
	const w = "$w" + (isBaseline ? "_base" : "");
	const h = "$h" + (isBaseline ? "_base" : "");
	const skip = "$skip" + (isBaseline ? "_baseline" : "");
	const taskHeight =
		cellHeight - heightAdjustment - (baselines ? baselineAdjustment : 0);

	let startDate = t[start];
	let endDate = t[end];

	if (isBaseline && !startDate) {
		t[skip] = true;
		return;
	}

	if (
		!isBaseline &&
		((state.unscheduledTasks && t.unscheduled) || t.$placeholder)
	) {
		if (i !== null) {
			t[y] = cellHeight * i + defaultPadding;
		}
		t[h] = taskHeight;
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
	t[h] = isBaseline ? baselineHeight : taskHeight;

	if (t.type === "milestone") {
		t[x] = t[x] - t.$h / 2;
		t[w] = t.$h;

		if (isBaseline) {
			t[y] = t.$y + baselineHeight;
			t[w] = t[h] = t.$h;
		}
	}


	if (state.groupBy && t.$group) t["$skip"] = true;
	else t[skip] = isEqual(startDate, endDate);
}
// calculate dimensions on non-summary children as they affect top summary
function calculateHiddenDimensions(
	t: IParsedTask,
	state: Partial<IData>,
	notSummaryKid?: boolean
) {
	notSummaryKid = notSummaryKid ?? t.type !== "summary";
	if (t.data && !t.$skip && (notSummaryKid || state._rollups)) {
		t.data.forEach((child: IGanttTask) => {
			if (notSummaryKid || child.rollup) {
				calculateTaskDimensions(child, null, state, false);
			}
			calculateHiddenDimensions(child, state, notSummaryKid);
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

type TResourceHistory = {
	startBatch(): void;
	endBatch(): void;
	isBatching(): boolean;
} | null;

export function setTaskResources(
	taskId: TID,
	resourceIds: TID[],
	ctx: {
		exec: EventBus<TMethodsConfig, keyof TMethodsConfig>["exec"];
		getState: () => Partial<IData>;
		getHistory: () => TResourceHistory | null;
		eventSource?: string;
		skipUndo?: boolean;
		joinUndo?: boolean;
	}
) {
}

export function getDefaultTaskStart(
	state: Partial<IData>,
	calendar?: ICalendar
): Date {
	const { tasks, durationUnit, _scales } = state;
	const branch = tasks.getBranch(0);

	if (branch?.length) {
		const task = branch[branch.length - 1];
		if (!task.$skip && task.start) {
			const start = new Date(task.start.valueOf());
			if (_scales.start <= start) return start;
		}
	}

	return getAdder(durationUnit, calendar)(_scales.start, 1);
}
