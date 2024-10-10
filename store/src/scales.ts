import type {
	GanttScale,
	GanttScaleData,
	IScaleLevel,
	IZoomConfig,
} from "./types";
import {
	getUnitStart,
	getAdder,
	getDiffer,
	format,
	getSmallerUnitCount,
} from "./time";
import type GanttDataTree from "./GanttDataTree";

export function getMinUnit(scales: GanttScale[]): GanttScale {
	const start = new Date();
	return scales
		.map(item => ({ item, len: getAdder(item.unit)(start, 1) }))
		.sort((a, b) => (a.len < b.len ? -1 : 1))[0].item;
}

const units = ["year", "quarter", "month", "week", "day", "hour"];
const unitFormats: { [name: string]: string } = {
	year: "yyyy",
	quarter: "QQQ",
	month: "MMM",
	week: "w",
	day: "MMM d",
	hour: "HH:mm",
};
const defaultMinCellWidth = 50;
const defaultMaxCellWidth = 300;

export function calcScales(
	prevStart: Date,
	prevEnd: Date,
	minUnit?: string,
	tasks?: GanttDataTree
): { _start: Date; _end: Date } {
	let _start = prevStart,
		_end = prevEnd;
	let _sFix = false,
		_eFix = false;
	if (tasks) {
		tasks.forEach(t => {
			if (!prevStart && (!_start || t.start <= _start)) {
				_start = t.start;
				_sFix = true;
			}
			const taskEnd = t.type === "milestone" ? t.start : t.end;
			if (!prevEnd && (!_end || taskEnd >= _end)) {
				_end = taskEnd;
				_eFix = true;
			}
		});
	}
	const adder = getAdder(minUnit || "day");
	if (_start) {
		if (_sFix) _start = adder(_start, -1);
	} else _start = new Date();

	if (_end) {
		if (_eFix) _end = adder(_end, 1);
	} else _end = adder(_start, 30);

	return { _start, _end };
}

export function resetScales(
	start: Date,
	end: Date,
	lengthUnit: string,
	width: number,
	height: number,
	scales: GanttScale[]
): GanttScaleData | null {
	const minUnit = getMinUnit(scales).unit;
	const diff = getDiffer(minUnit);
	const numOfMinUnits = diff(end, start, "", true);

	const tempEnd = getUnitStart(minUnit, end);
	start = getUnitStart(minUnit, start);
	end = tempEnd < end ? getAdder(minUnit)(tempEnd, 1) : tempEnd;

	const fullWidth = numOfMinUnits * width;
	const fullHeight = height * scales.length;
	const rows = scales.map(line => {
		const cells = [];
		const add = getAdder(line.unit);

		let date = getUnitStart(line.unit, start);
		while (date < end) {
			let next = add(date, line.step);

			if (date < start) date = start;
			if (next > end) next = end;

			const cellWidth = diff(next, date, "", true) * width;

			const value =
				typeof line.format === "function"
					? line.format(date, next)
					: format(date, line.format, {
							firstWeekContainsDate: 4,
							weekStartsOn: 1,
						});

			let css = "";
			if (line.css)
				css +=
					typeof line.css === "function" ? line.css(date) : line.css;

			cells.push({
				width: cellWidth,
				value,
				date,
				css,
				unit: line.unit,
			});

			date = next;
		}

		return { cells, add, height };
	});

	let lengthUnitWidth = width;
	if (minUnit !== lengthUnit) {
		lengthUnitWidth =
			Math.round(
				lengthUnitWidth / getSmallerUnitCount(minUnit, lengthUnit)
			) || 1;
	}

	return {
		rows,
		width: fullWidth,
		height: fullHeight,
		diff,
		start,
		end,
		lengthUnit,
		minUnit,
		lengthUnitWidth,
	};
}

export function normalizeZoom(
	zoom: boolean | IZoomConfig,
	scales: GanttScale[],
	cellWidth: number
): { _zoom: IZoomConfig; scales: GanttScale[]; cellWidth: number } {
	const _zoom: any = typeof zoom === "boolean" ? {} : zoom;
	const mainScaleLevel = units.indexOf(getMinUnit(scales).unit);
	if (typeof _zoom.level == "undefined") {
		_zoom.level = mainScaleLevel;
	}

	if (_zoom.levels) {
		_zoom.levels.forEach((level: IScaleLevel) => {
			if (!level.minCellWidth)
				level.minCellWidth = getCellWidth(
					_zoom.minCellWidth,
					defaultMinCellWidth
				);
			if (!level.maxCellWidth)
				level.maxCellWidth = getCellWidth(
					_zoom.maxCellWidth,
					defaultMaxCellWidth
				);
		});
	} else {
		const levels: any[] = [];
		const numOfScales = scales.length || 1;
		const minCellWidth = getCellWidth(
			_zoom.minCellWidth,
			defaultMinCellWidth
		);
		const maxCellWidth = getCellWidth(
			_zoom.maxCellWidth,
			defaultMaxCellWidth
		);
		units.forEach((unit, i) => {
			if (i === mainScaleLevel) {
				levels.push({
					minCellWidth,
					maxCellWidth,
					scales,
				});
			} else {
				const levelScales: GanttScale[] = [];
				if (i) {
					for (let j = numOfScales - 1; j > 0; j--) {
						if (units[i - j]) {
							levelScales.push({
								unit: units[i - j],
								step: 1,
								format: unitFormats[units[i - j]],
							});
						}
					}
				}
				levelScales.push({ unit, step: 1, format: unitFormats[unit] });

				levels.push({
					minCellWidth,
					maxCellWidth,
					scales: levelScales,
				});
			}
		});

		_zoom.levels = levels;
	}

	if (!_zoom.levels[_zoom.level]) {
		_zoom.level = 0;
	}

	const currentLevel = _zoom.levels[_zoom.level];
	const adjustedCellWidth = Math.min(
		Math.max(cellWidth, currentLevel.minCellWidth),
		currentLevel.maxCellWidth
	);

	return {
		_zoom,
		scales: currentLevel.scales,
		cellWidth: adjustedCellWidth,
	};
}

export function zoomScale(
	zoom: IZoomConfig,
	step: number,
	level: number,
	nextUnit: any,
	lengthUnit: string,
	scales: GanttScale[],
	cellWidth: number
): {
	scales: GanttScale[];
	cellWidth: number;
	lengthUnit: string;
	zoom: IZoomConfig;
} {
	zoom.level = level;
	let newCellWidth;
	const nextScales = nextUnit.scales || nextUnit;
	const nextMinUnit = getMinUnit(nextScales).unit;
	const nextLengthUnit = setLengthUnit(nextMinUnit, lengthUnit);

	if (step === -1) {
		const count = getSmallerUnitCount(nextMinUnit, lengthUnit);
		newCellWidth = cellWidth * count;
	} else {
		const count = getSmallerUnitCount(getMinUnit(scales).unit, nextMinUnit);
		newCellWidth = Math.round(cellWidth / count);
	}

	const min = nextUnit.minCellWidth ?? defaultMinCellWidth;
	const max = nextUnit.maxCellWidth ?? defaultMaxCellWidth;

	return {
		scales: nextScales,
		cellWidth: Math.min(max, Math.max(min, newCellWidth)),
		lengthUnit: nextLengthUnit,
		zoom,
	};
}

function setLengthUnit(unit: string, lengthUnit: string): string {
	const unitInd = units.indexOf(unit);
	const lengthUnitInd = units.indexOf(lengthUnit);
	if (lengthUnitInd >= unitInd) {
		if (unit === "hour") return "hour";
		return "day";
	}

	return units[lengthUnitInd];
}

function getCellWidth(width: number | undefined, fallback: number) {
	return width ?? fallback;
}
