import { IVisibleArea } from "../types";

export function calculateArea(
	scrollPos: number,
	viewportSize: number,
	cells: { width: number }[],
	extra = 1
): IVisibleArea {
	const cellWidth = cells[0].width;
	const start = Math.max(0, Math.floor(scrollPos / cellWidth) - extra);
	const end = Math.min(
		cells.length,
		Math.ceil((scrollPos + viewportSize) / cellWidth) + extra
	);

	return {
		from: start * cellWidth,
		to: end * cellWidth,
		start,
		end,
	};
}
