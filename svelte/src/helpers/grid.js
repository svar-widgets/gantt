export function getGridMinHeight(gridHeight, cellHeight) {
	return `min-height:${gridHeight + cellHeight * 4}px;`;
}

function getPanelWidthStyle(contentWidth, scrollX) {
	return scrollX ? `width:${contentWidth}px;` : `width:100%;`;
}

/** Map visible panels to grid layout mode: "all" | "grid" | "chart". */
function getGridChartDisplayMode(panels) {
	if (!panels?.length) return "all";
	if (panels.includes("grid") && panels.includes("chart")) return "all";
	if (panels.includes("grid") && panels.includes("subGrid")) return "all";
	if (panels.includes("grid")) return "grid";
	return "chart";
}

export function getGridStyle(panels, contentWidth, scrollX, section = "grid") {
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
	columns,
	panels,
	panelWidth,
	section = "grid",
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
	compactMode,
	panels,
	columnWidth,
	containerWidth,
	panelWidth,
	section = "grid",
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

export function getFitColumns(
	columns,
	panels,
	section = "grid",
	colId = "add-task",
	stripWidth = 0
) {
	if (section !== "grid" || panels?.includes("grid")) return columns;

	const col = columns.find(c => c.id === colId);
	if (!col) return [{ id: colId, resize: false, width: stripWidth }];

	return [{ ...col, resize: false }];
}

export function getFillColumn(columns, id) {
	const ok = c => c.id !== "add-task" && c.id !== id && !c.hidden;
	return columns
		.filter(ok)
		.reduce((max, c) => (!max || c.width > max.width ? c : max), null)?.id;
}

export function getColumnsWidth(columns) {
	return columns.reduce((acc, c) => acc + (c.hidden ? 0 : c.width), 0);
}

export function getSortMarks(tasks, sort) {
	if (tasks && sort?.length) {
		const marks = {};
		sort.forEach(({ key, order }, index) => {
			marks[key] = {
				order,
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

function toCssId(id) {
	return String(id ?? "").replace(/[^\w-]/g, "-");
}

export function getColumnStyle(col) {
	let style = `wx-text-${col.align}`;
	if (col.id) style += ` wx-col-${toCssId(col.id)}`;
	if (col.id === "add-task") style += " wx-action";

	return style.trim();
}
