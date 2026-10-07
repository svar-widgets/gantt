import { hasSubGridColumns, toCompactPanels } from "./displayMode";
import { ADD_TASK_COLUMN_WIDTH } from "../columns";
import type { IData, TDisplayPanel } from "../types";
import { isCommunity } from "../package";

const RESIZER_SIZE = 4;
// Chart min; also reserved when shrinking grid
export const DEFAULT_MIN_CHART_WIDTH = 100;
export const DEFAULT_MIN_CHART_WITH_SUBGRID = 360;
export const DEFAULT_MIN_SUBGRID_WIDTH = 37;
export const DEFAULT_COMPACT_WIDTH = 650;

// Two dividers only with chart + subGrid columns
export function getResizerWidth(
	hasSubGrid: boolean,
	panels?: TDisplayPanel[]
): number {
	if (!hasSubGrid || !panels?.includes("chart")) return RESIZER_SIZE;
	return 2 * RESIZER_SIZE;
}

function clampGridWidth(
	gridWidth: number,
	ganttWidth: number,
	resizerWidth: number,
	collapseThreshold: number,
	scrollSize = 0
): number {
	const chartReserve = resizerWidth + scrollSize + DEFAULT_MIN_CHART_WIDTH;
	return clampResizeWidth(
		gridWidth,
		ganttWidth,
		chartReserve,
		collapseThreshold
	);
}

function clampResizeWidth(
	width: number,
	containerWidth: number,
	reservedWidth: number,
	collapseThreshold = 0
): number {
	const max = Math.max(containerWidth - reservedWidth, 0);
	return Math.max(collapseThreshold, Math.min(width, max));
}

export type TResolveLayoutState = Pick<
	IData,
	| "displayMode"
	| "_displayPanels"
	| "_compactMode"
	| "gridWidth"
	| "subGridWidth"
	| "_containerWidth"
	| "columns"
	| "_scrollSize"
	| "_gridCollapseThreshold"
>;

export type TResolveLayoutResult = {
	compactMode: boolean;
	gridWidth: number;
	subGridWidth?: number;
	// Visible panels; displayMode (preference) is unchanged
	displayPanels?: TDisplayPanel[];
};

type TPanelMeasure = {
	ganttWidth: number;
	gridWidth: number;
	subGridWidth: number;
	hasSubGrid: boolean;
	scrollSize?: number;
};

export type TPanelFitMeasure = TPanelMeasure & {
	collapseThreshold: number;
	// Restored on grid collapse
	preferredGridWidth?: number;
	// Restored on subGrid expand/collapse
	preferredSubGridWidth?: number;
};

export function samePanels(a: TDisplayPanel[], b: TDisplayPanel[]): boolean {
	return a.length === b.length && a.every(panel => b.includes(panel));
}

function collapsedGridPanels(panels: TDisplayPanel[]): TDisplayPanel[] {
	const next: TDisplayPanel[] = ["chart"];
	if (panels.includes("subGrid")) next.push("subGrid");
	return next;
}

// Grid width at or below which the grid counts as collapsed to the strip
export function getCollapseThreshold(
	state: Pick<IData, "_gridCollapseThreshold">
): number {
	return state._gridCollapseThreshold ?? ADD_TASK_COLUMN_WIDTH;
}

export function getPanelFitMeasure(
	state: TResolveLayoutState,
	width: number,
	scrollSize?: number
): TPanelFitMeasure {
	return {
		ganttWidth: width,
		gridWidth: state.gridWidth,
		subGridWidth: state.subGridWidth,
		hasSubGrid: hasSubGridColumns(state.columns),
		scrollSize: scrollSize ?? state._scrollSize ?? 0,
		collapseThreshold: getCollapseThreshold(state),
	};
}

// Drop subGrid before shrinking grid. Then fit chart (shrink grid for
// chart min only), then collapse chart. Without chart, subGrid fills
// the remainder and collapses only at the min strip.
function resolvePanelFit(
	panels: TDisplayPanel[],
	measure: TPanelFitMeasure,
	shrinkGrid = false
): {
	gridWidth: number;
	subGridWidth: number;
	panels: TDisplayPanel[];
} {
	const {
		ganttWidth,
		subGridWidth,
		hasSubGrid,
		scrollSize = 0,
		collapseThreshold,
	} = measure;
	let gridW = measure.gridWidth;
	let next = [...panels];
	const allowChart = next.includes("chart");
	const resizerWidth = getResizerWidth(hasSubGrid, next);
	const resizerAndScroll = resizerWidth + scrollSize;

	let effectiveSub = 0;

	let chartW = ganttWidth - gridW - effectiveSub - resizerAndScroll;

	if (allowChart && chartW < DEFAULT_MIN_CHART_WIDTH && shrinkGrid) {
		gridW = clampGridWidth(
			gridW,
			ganttWidth,
			resizerWidth,
			collapseThreshold,
			scrollSize
		);
		chartW = ganttWidth - gridW - effectiveSub - resizerAndScroll;
	}

	if (allowChart && chartW < DEFAULT_MIN_CHART_WIDTH) {
		next = next.filter(p => p !== "chart");
	}

	return {
		gridWidth: gridW,
		subGridWidth,
		panels: next,
	};
}

// Compact + fit. Fit only when preference includes grid and chart.
export function resolveLayout(
	state: TResolveLayoutState,
	measure: { width: number | null | undefined; scrollSize?: number }
): TResolveLayoutResult {
	const width = measure.width;
	const scrollSize = measure.scrollSize ?? state._scrollSize ?? 0;
	const compactMode = width == null || width <= DEFAULT_COMPACT_WIDTH;

	const result: TResolveLayoutResult = {
		compactMode,
		gridWidth: state.gridWidth,
		subGridWidth: state.subGridWidth,
	};
	if (!state._compactMode && compactMode) {
		result.displayPanels = toCompactPanels(
			state.displayMode,
			state._displayPanels
		);
	}

	const displayMode = state.displayMode;
	if (
		compactMode ||
		width == null ||
		!displayMode?.includes("grid") ||
		!displayMode.includes("chart")
	) {
		return result;
	}

	const fit = resolvePanelFit(
		state.displayMode,
		getPanelFitMeasure(state, width, scrollSize),
		true
	);

	result.gridWidth = fit.gridWidth;
	result.subGridWidth = fit.subGridWidth;
	// Visible panels only; displayMode stays so auto-hidden subGrid can return.
	const visible = state._displayPanels ?? state.displayMode;
	if (!samePanels(fit.panels, visible)) {
		result.displayPanels = fit.panels;
	}
	return result;
}

// Keep requested grid width; drop other panels first.
// Min strip collapses grid and restores preferredGridWidth.
export function resolveGridDrag(
	panels: TDisplayPanel[],
	measure: TPanelFitMeasure
) {
	if (measure.gridWidth <= measure.collapseThreshold) {
		const keep = measure.preferredGridWidth;
		return {
			gridWidth:
				keep != null && keep > measure.collapseThreshold
					? keep
					: measure.gridWidth,
			subGridWidth: measure.subGridWidth,
			panels: collapsedGridPanels(panels),
		};
	}
	return resolvePanelFit(panels, measure);
}

// Keep requested width; drop chart rather than shrinking grid.
// Min strip collapses subGrid; past the chart floor drops chart.
export function resolveSubGridDrag(
	panels: TDisplayPanel[],
	measure: TPanelFitMeasure
): {
	subGridWidth: number;
	panels: TDisplayPanel[];
} {
	if (isCommunity()) return { subGridWidth: 0, panels: panels };
}

// Live grid drag: clamp to the free space, collapse at the min strip.
export function previewGridDrag(
	panels: TDisplayPanel[],
	measure: TPanelFitMeasure
): {
	gridWidth: number;
	panels: TDisplayPanel[];
} {
	const {
		ganttWidth,
		hasSubGrid,
		scrollSize = 0,
		collapseThreshold,
	} = measure;
	const max = Math.max(
		0,
		ganttWidth -
			getResizerWidth(hasSubGrid, panels) -
			scrollSize -
			(panels.includes("subGrid") ? measure.subGridWidth : 0)
	);
	const min = Math.min(collapseThreshold, max);
	return {
		gridWidth: Math.max(min, Math.min(measure.gridWidth, max)),
		panels:
			measure.gridWidth <= collapseThreshold
				? collapsedGridPanels(panels)
				: panels,
	};
}

// Live subGrid drag: clamp to the free space unless a panel collapses.
export function previewSubGridDrag(
	panels: TDisplayPanel[],
	measure: TPanelFitMeasure
): {
	subGridWidth: number;
	panels: TDisplayPanel[];
} {
	if (isCommunity()) return { subGridWidth: 0, panels };
}

// Hide/show only. Last-added wins if chart and subGrid cannot coexist.
// Collapsed grid uses the add-task strip, not stored gridWidth.
export function resolvePanelChange(
	prev: TDisplayPanel[],
	next: TDisplayPanel[],
	measure: TPanelFitMeasure
): TDisplayPanel[] {
	if (isCommunity()) return next;
}
