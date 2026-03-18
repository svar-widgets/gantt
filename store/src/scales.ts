import type {
	IScaleConfig,
	GanttScaleData,
	IScaleLevel,
	IUnitFormats,
	IZoomConfig,
	TLengthUnit,
	IMarker,
	IData,
} from "./types";
import { getUnitStart, getAdder, getDiffer, getSmallerUnitCount } from "./time";
import type GanttDataTree from "./GanttDataTree";
import { Day } from "date-fns";

export function getMinUnit(scales: IScaleConfig[]): IScaleConfig {
	const start = new Date();
	return scales
		.map(item => ({ item, len: getAdder(item.unit)(start, 1) }))
		.sort((a, b) => (a.len < b.len ? -1 : 1))[0].item;
}

export const units = ["year", "quarter", "month", "week", "day", "hour"];
const defaultMinCellWidth = 50;
const defaultMaxCellWidth = 300;

export function calcScales(
	prevStart?: Date,
	prevEnd?: Date,
	autoScale?: boolean,
	minUnit?: string,
	tasks?: GanttDataTree,
	markers?: IMarker[],
	projectStart?: Date,
	projectEnd?: Date,
	baselines?: boolean
): { _start: Date; _end: Date } {
	const flexStart = !prevStart || autoScale;
	const flexEnd = !prevEnd || autoScale;
	let _start = prevStart,
		_end = prevEnd;
	let _sFix = false,
		_eFix = false;

	if (flexStart || flexEnd) {
		tasks?.forEach(t => {
			let tStart = t.start;
			if (baselines && t.base_start < t.start) tStart = t.base_start;
			if (flexStart && (!_start || tStart <= _start)) {
				_start = tStart;
				_sFix = true;
			}

			let tEnd = t.type === "milestone" ? t.start : t.end;
			if (baselines) {
				const bEnd = t.type === "milestone" ? t.base_start : t.base_end;
				if (bEnd && bEnd > tEnd) tEnd = bEnd;
			}
			if (flexEnd && (!_end || tEnd >= _end)) {
				_end = tEnd;
				_eFix = true;
			}
		});
	}

	const adder = getAdder(minUnit || "day");
	if (_start) {
		if (_sFix) _start = adder(_start, -1);
	} else if (_end) _start = adder(_end, -30);
	else _start = new Date();

	if (_end) {
		if (_eFix) _end = adder(_end, 1);
	} else _end = adder(_start, 30);

	return { _start, _end };
}

export function resetScales(
	start: Date,
	end: Date,
	lengthUnit: TLengthUnit,
	width: number,
	height: number,
	_weekStart: Day,
	scales: IScaleConfig[],
	minLength: number
): GanttScaleData | null {
	const minUnit = getMinUnit(scales).unit;
	const diff = getDiffer(minUnit, undefined, _weekStart);
	const numOfMinUnits = diff(end, start, "", true);

	const tempEnd = getUnitStart(minUnit, end, _weekStart);
	start = getUnitStart(minUnit, start, _weekStart);
	end = tempEnd < end ? getAdder(minUnit)(tempEnd, 1) : tempEnd;

	const fullWidth = numOfMinUnits * width;
	const fullHeight = height * Math.max(minLength, scales.length);

	const rows = scales.map(line => {
		const cells = [];
		const add = getAdder(line.unit);

		let date = getUnitStart(line.unit, start, _weekStart);
		while (date < end) {
			const next = add(date, line.step);

			const cellStart = date < start ? start : date;
			const cellEnd = next > end ? end : next;

			const cellWidth = diff(cellEnd, cellStart, "", true) * width;

			const value =
				typeof line.format === "function"
					? line.format(date, next)
					: line.format;
			let css = "";
			if (line.css)
				css +=
					typeof line.css === "function" ? line.css(date) : line.css;

			cells.push({
				width: cellWidth,
				value,
				date: cellStart,
				css,
				unit: line.unit,
			});

			date = next;
		}

		return { cells, add, height: fullHeight / scales.length };
	});

	let lengthUnitWidth = width;
	if (minUnit !== lengthUnit) {
		lengthUnitWidth =
			lengthUnitWidth / getSmallerUnitCount(minUnit, lengthUnit);
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
	unitFormats: IUnitFormats,
	scales: IScaleConfig[],
	cellWidth: number
): { zoom: IZoomConfig; scales: IScaleConfig[]; cellWidth: number } {
	const _zoom: any = typeof zoom === "boolean" ? {} : zoom;
	const mainScaleLevel = units.indexOf(getMinUnit(scales).unit);
	if (typeof _zoom.level === "undefined") {
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

		// adds a format from a custom unit config to the format collection to be used during zoom
		scales.forEach(s => {
			if (s.format && !unitFormats[s.unit])
				unitFormats[s.unit] = s.format;
		});

		units.forEach((unit, i) => {
			if (i === mainScaleLevel) {
				levels.push({
					minCellWidth,
					maxCellWidth,
					scales,
				});
			} else {
				const levelScales: IScaleConfig[] = [];
				if (i) {
					for (let j = numOfScales - 1; j > 0; j--) {
						const pUnit = units[i - j];
						if (pUnit) {
							levelScales.push({
								unit: pUnit,
								step: 1,
								format: unitFormats[pUnit],
							});
						}
					}
				}
				levelScales.push({
					unit,
					step: 1,
					format: unitFormats[unit],
				});

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
		zoom: _zoom,
		scales: currentLevel.scales,
		cellWidth: adjustedCellWidth,
	};
}

export function zoomScale(
	zoom: IZoomConfig,
	step: number,
	level: number,
	nextUnit: any,
	lengthUnit: TLengthUnit,
	scales: IScaleConfig[],
	cellWidth: number
): {
	scales: IScaleConfig[];
	cellWidth: number;
	lengthUnit: TLengthUnit;
	zoom: IZoomConfig;
} {
	zoom.level = level;
	let newCellWidth;
	const nextScales = nextUnit.scales || nextUnit;
	const nextMinUnit = getMinUnit(nextScales).unit;
	const nextLengthUnit = setLengthUnit(
		nextMinUnit,
		lengthUnit
	) as TLengthUnit;

	if (step < 0) {
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

export function expandScale(
	minWidth: number,
	state: Partial<IData>
): Partial<IData> {
	const {
		_start,
		_scales,
		start,
		end,
		_end,
		cellWidth,
		_scaleDate,
		_zoomOffset,
		_weekStart,
	} = state;
	const adder = getAdder(_scales.minUnit);

	let width = _scales.width;
	if (start && end) {
		if (width < minWidth && width) {
			const k = minWidth / width;
			return {
				cellWidth: cellWidth * k,
			};
		}
		return {};
	}
	let step = 0;
	while (width < minWidth) {
		width += cellWidth;
		step++;
	}

	let startStep = 0;
	if (step) {
		if (end) startStep = -step;
		else if (_scaleDate && _zoomOffset !== null) {
			const num = _zoomOffset / cellWidth;
			const currentNum = _scales.diff(_scaleDate, _start, "hour");
			startStep = Math.floor(currentNum - num);
		}
	}
	let newStart = start;

	if (!start) {
		newStart = getUnitStart(
			_scales.minUnit,
			adder(_start, startStep),
			_weekStart
		);
	}
	let newScroll = 0;
	if (_scaleDate) {
		const num = _scales.diff(_scaleDate, newStart, "hour");
		newScroll = Math.max(
			0,
			Math.round(num * cellWidth) - (_zoomOffset || 0)
		);
	}

	return {
		_start: newStart,
		_end: end || adder(_end, step - startStep),
		scrollLeft: newScroll,
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
