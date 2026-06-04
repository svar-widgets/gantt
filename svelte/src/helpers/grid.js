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

export function getFitColumns(
	columns,
	columnWidth,
	displayMode,
	containerWidth,
	gridWidth,
	hasFlexCol,
	gridCollapseThreshold,
	colId = "add-task"
) {
	let filteredColumns =
		displayMode === "chart"
			? [
					{
						...columns.filter(c => c.id === colId)[0],
						resize: false,
					},
				]
			: columns;

	// Adjust widths if needed
	const gridContainerWidth =
		displayMode === "all" ? gridWidth : containerWidth;

	if (!hasFlexCol) {
		let baseColumnWidth = columnWidth;
		let forceReset = false;
		if (columns.some(c => c.$width)) {
			let actualWidth = 0;
			baseColumnWidth = columns.reduce((acc, col) => {
				if (!col.hidden) {
					actualWidth += col.width;
					acc += col.$width || col.width;
				}
				return acc;
			}, 0);

			// Force widths reset when "display" "grid" changed to "all"
			if (
				actualWidth > baseColumnWidth &&
				baseColumnWidth >= gridContainerWidth
			)
				forceReset = true;
		}

		if (forceReset || baseColumnWidth < gridContainerWidth) {
			let k = 1;
			if (!forceReset)
				k =
					(gridContainerWidth - gridCollapseThreshold) /
					(baseColumnWidth - gridCollapseThreshold || 1);
			const ganttColumns = colId === "add-task";
			let currWidth = 0;
			return filteredColumns.map((c, index) => {
				if (c.id !== "add-task" && !c.hidden) {
					if (!c.$width) c.$width = c.width;
					c.width = c.$width * k;
					if (!ganttColumns) {
						if (index === filteredColumns.length - 1) {
							const fitWidth = forceReset
								? baseColumnWidth
								: gridContainerWidth;
							// for the last non-Gantt column, fill the remaining space.
							// the 1px offset prevents a horizontal scrollbar from appearing.
							c.width = fitWidth - currWidth - 1;
						}
						currWidth += c.width;
					}
				}
				return c;
			});
		}
	}
	return filteredColumns;
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

export function adjustColumns(columns) {
	const flexCols = columns.filter(c => c.flexgrow && !c.hidden);
	if (flexCols.length === 1)
		columns.forEach(c => {
			if (c.$width && !c.flexgrow && !c.hidden) c.width = c.$width;
		});
}

export function checkFlex(columns) {
	return columns.some(c => c.flexgrow && !c.hidden);
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
