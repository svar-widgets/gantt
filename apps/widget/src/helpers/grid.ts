import type {
	TColumnSection,
	TDisplayPanel,
	TID,
	TSort,
} from "@svar-ui/gantt-store";
import type { ISortMarks } from "@svar-ui/grid-store";

type TColumn = {
	id?: TID;
	width?: number;
	hidden?: boolean;
	align?: string;
	resize?: boolean;
};

export function getGridMinHeight(gridHeight: number, cellHeight: number) {
	return `min-height:${gridHeight + cellHeight * 4}px;`;
}

function getPanelWidthStyle(contentWidth: number, scrollX: boolean) {
	return scrollX ? `width:${contentWidth}px;` : `width:100%;`;
}

/** Map visible panels to grid layout mode: "all" | "grid" | "chart". */
function getGridChartDisplayMode(panels: TDisplayPanel[] | null | undefined) {
	if (!panels?.length) return "all";
	if (panels.includes("grid") && panels.includes("chart")) return "all";
	if (panels.includes("grid") && panels.includes("subGrid")) return "all";
	if (panels.includes("grid")) return "grid";
	return "chart";
}

export function getGridStyle(
	panels: TDisplayPanel[],
	contentWidth: number,
	scrollX: boolean,
	section: TColumnSection = "grid"
) {
	const displayMode = getGridChartDisplayMode(panels);
	if (
		section === "subGrid" ||
		displayMode === "all" ||
		displayMode === "grid"
	) {
		return getPanelWidthStyle(contentWidth, scrollX);
	}
	return ``;
}

export function getFlexBasis(
	columns: TColumn[],
	panels: TDisplayPanel[],
	panelWidth: number,
	section: TColumnSection = "grid",
	fillRemaining = false
) {
	if (section === "subGrid") {
		if (fillRemaining) return "auto";
		return `${panelWidth}px`;
	}
	const displayMode = getGridChartDisplayMode(panels);
	if (displayMode === "all") {
		return `${panelWidth}px`;
	}
	if (displayMode === "grid") {
		return "calc(100% - 4px)";
	}
	const addCol = columns.find(c => c.id === "add-task");
	return addCol ? `${addCol.width}px` : "0";
}

export function getScrollX(
	compactMode: boolean,
	panels: TDisplayPanel[],
	columnWidth: number,
	containerWidth: number,
	panelWidth: number,
	section: TColumnSection = "grid",
	fillRemaining = false
) {
	if (section === "subGrid") {
		return columnWidth > (fillRemaining ? containerWidth : panelWidth);
	}
	const displayMode = getGridChartDisplayMode(panels);
	if (!compactMode && displayMode !== "grid") {
		return columnWidth > panelWidth;
	}
	return columnWidth > containerWidth;
}

export function getFitColumns<T extends TColumn>(
	columns: T[],
	panels: TDisplayPanel[] | null | undefined,
	section: TColumnSection = "grid",
	colId = "add-task",
	stripWidth = 0
): T[] {
	if (section !== "grid" || panels?.includes("grid")) return columns;

	const col = columns.find(c => c.id === colId);
	if (!col) return [{ id: colId, resize: false, width: stripWidth } as T];

	return [{ ...col, resize: false }];
}

export function getFillColumn(columns: TColumn[], id?: TID) {
	const ok = (c: TColumn) => c.id !== "add-task" && c.id !== id && !c.hidden;
	return columns
		.filter(ok)
		.reduce<TColumn | null>(
			(max, c) => (!max || c.width! > max.width! ? c : max),
			null
		)?.id;
}

export function getColumnsWidth(columns: TColumn[]) {
	return columns.reduce((acc, c) => acc + (c.hidden ? 0 : c.width!), 0);
}

export function getSortMarks(
	tasks: unknown,
	sort: TSort[] | null | undefined
): ISortMarks {
	if (tasks && sort?.length) {
		const marks: ISortMarks = {};
		sort.forEach(({ key, order }, index) => {
			marks[key] = {
				order: order!,
				...(sort.length > 1 && { index }),
			};
		});
		return marks;
	}
	return {};
}

export function getScrollbarWidth() {
	const div = document.createElement("div");
	div.style.cssText =
		"position:absolute;left:-1000px;width:100px;padding:0;margin:0;min-height:100px;overflow-y:scroll;";
	document.body.appendChild(div);
	const w = div.offsetWidth - div.clientWidth;
	document.body.removeChild(div);
	return w;
}

function toCssId(id: TID | null | undefined) {
	return String(id ?? "").replace(/[^\w-]/g, "-");
}

export function getColumnStyle(col: TColumn) {
	let style = `wx-text-${col.align}`;
	if (col.id) style += ` wx-col-${toCssId(col.id)}`;
	if (col.id === "add-task") style += " wx-action";

	return style.trim();
}
