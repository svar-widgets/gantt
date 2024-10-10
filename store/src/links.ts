import type { IGanttTask, IGanttLink } from "./types";

const delta = 20;

export const updateLink = function (
	link: IGanttLink,
	startTask: IGanttTask,
	endTask: IGanttTask,
	height: number,
	baselines: boolean
): IGanttLink {
	const dy = Math.round(height / 2) - 3;

	if (
		!startTask ||
		!endTask ||
		!startTask.$y ||
		!endTask.$y ||
		startTask.$skip ||
		endTask.$skip
	) {
		link.$p = "";
		return link;
	}

	let s_start = false;
	let e_start = false;

	switch (link.type) {
		case "e2s":
			e_start = true;
			break;

		case "s2s":
			s_start = true;
			e_start = true;
			break;

		case "s2e":
			s_start = true;
			break;

		default:
			break;
	}

	const sx = s_start ? startTask.$x : startTask.$x + startTask.$w;
	const sy = baselines ? startTask.$y - 7 : startTask.$y;
	const ex = e_start ? endTask.$x : endTask.$x + endTask.$w;
	const ey = baselines ? endTask.$y - 7 : endTask.$y;

	if (sx !== ex || sy !== ey) {
		const lineCoords = getLineCoords(
			sx,
			sy + dy,
			ex,
			ey + dy,
			s_start,
			e_start,
			height / 2,
			baselines
		);

		const arrowCoords = getArrowCoords(ex, ey + dy, e_start);
		link.$p = `${lineCoords},${arrowCoords}`;
	}

	return link;
};

function getLineCoords(
	sx: number,
	sy: number,
	ex: number,
	ey: number,
	s_start: boolean,
	e_start: boolean,
	gapp: number,
	baselines: boolean
): string {
	const shift = delta * (s_start ? -1 : 1);
	const backshift = delta * (e_start ? -1 : 1);

	const sx1 = sx + shift;
	const ex1 = ex + backshift;
	const line = [sx, sy, sx1, sy, 0, 0, 0, 0, ex1, ey, ex, ey];

	const dx = ex1 - sx1;
	let dy = ey - sy;

	const same = e_start === s_start;
	if (!same) {
		if ((ex1 <= sx + delta - 2 && e_start) || (ex1 > sx && !e_start)) {
			dy = baselines ? dy - gapp + 6 : dy - gapp;
		}
	}

	if ((same && e_start && sx1 > ex1) || (same && !e_start && sx1 < ex1)) {
		line[4] = line[2] + dx;
		line[5] = line[3];
		line[6] = line[4];
		line[7] = line[5] + dy;
	} else {
		line[4] = line[2];
		line[5] = line[3] + dy;
		line[6] = line[4] + dx;
		line[7] = line[5];
	}

	return line.join(",");
}

function getArrowCoords(x: number, y: number, start: boolean) {
	if (start) {
		return `${x - 5},${y - 3},${x - 5},${y + 3},${x},${y}`;
	} else {
		return `${x + 5},${y + 3},${x + 5},${y - 3},${x},${y}`;
	}
}

export function placeLink(
	box: { left: number; top: number },
	start: { x: number; y: number },
	end: { x: number; y: number }
): { width: number; height: number; left: number; top: number; p: string } {
	if (start && end) {
		const width = end.x - start.x;
		const height = end.y - start.y;
		const left = (width > 0 ? start.x : end.x) - box.left;
		const top = (height > 0 ? start.y : end.y) - box.top;
		const p = `${width > 0 ? 0 : -width},${height > 0 ? 0 : -height},${
			width > 0 ? width : 0
		},${height > 0 ? height : 0}`;
		return {
			width: Math.abs(width),
			height: Math.abs(height),
			left,
			top,
			p,
		};
	} else {
		return null;
	}
}
