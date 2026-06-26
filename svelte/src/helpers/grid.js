export function getGridMinHeight(gridHeight, cellHeight) {
	return `min-height:${gridHeight + cellHeight * 4}px;`;
}

export function getGridStyle(displayMode, columnWidth, scrollX) {
	return scrollX && displayMode === "all"
		? `width:${columnWidth}px;`
		: displayMode === "grid"
			? scrollX
				? `width:${columnWidth}px;`
				: `width:100%;`
			: ``;
}

export function getFlexBasis(columns, displayMode, gridWidth) {
	const addCol = columns.find(c => c.id === "add-task");
	return displayMode === "all"
		? `${gridWidth}px`
		: displayMode === "grid"
			? "calc(100% - 4px)"
			: addCol
				? `${addCol.width}px`
				: "0";
}

export function getScrollX(
	compactMode,
	displayMode,
	columnWidth,
	containerWidth,
	gridWidth
) {
	return !compactMode && displayMode !== "grid"
		? columnWidth > gridWidth
		: columnWidth > containerWidth;
}

export function getFitColumns(columns, displayMode, colId = "add-task") {
	return displayMode === "chart"
		? [
				{
					...columns.filter(c => c.id === colId)[0],
					resize: false,
				},
			]
		: columns;
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

export function getResourceLoadColumns(scales, LoadCell, template) {
	if (!scales) return [];
	const lowestRow = scales.rows[scales.rows.length - 1];
	const { cells } = lowestRow;
	const unit = scales.minUnit;

	if (unit === "day") return getLoadColumns(cells, LoadCell, template);

	const dayMs = 24 * 60 * 60 * 1000;
	const stepMs = cells.length
		? (cells.length > 1 ? cells[1].date.getTime() : scales.end.getTime()) -
			cells[0].date.getTime()
		: 0;
	const isSubDayStep = stepMs && stepMs < dayMs;

	if (isSubDayStep) {
		const dayCols = [];
		let group = null;
		cells.forEach(cell => {
			if (!group || group.key !== cell.key) {
				group = {
					id: cell.key,
					key: cell.key,
					width: 0,
					date: cell.date,
					unit: cell.unit,
				};
				dayCols.push(group);
			}
			group.width += cell.width;
		});

		return getLoadColumns(dayCols, LoadCell, template);
	} else return getLoadColumns(cells, LoadCell, template, true);
}

function getLoadColumns(cells, LoadCell, template, unitLoad) {
	return cells.map(cell => ({
		id: cell.key,
		width: cell.width,
		date: cell.date,
		unit: cell.unit,
		getter: row =>
			unitLoad ? row.$unitLoad?.[cell.key] : row.$load?.[cell.key],
		template: v => {
			if (!v) return "";
			return template ? template(v) : `${v.hours}h`;
		},
		cell: LoadCell,
	}));
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
