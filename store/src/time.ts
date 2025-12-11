import {
	addMinutes,
	addHours,
	addDays,
	addWeeks,
	addMonths,
	addQuarters,
	addYears,
	differenceInYears,
	differenceInMonths,
	differenceInQuarters,
	differenceInCalendarISOWeeks,
	differenceInCalendarDays,
	differenceInHours,
	differenceInMinutes,
	startOfHour,
	startOfDay,
	startOfWeek,
	startOfMonth,
	startOfQuarter,
	endOfQuarter,
	startOfYear,
	format,
	getDaysInMonth,
	getDaysInYear,
	getISOWeeksInYear,
	isSameDay,
	isSameWeek,
	isSameMonth,
	isSameQuarter,
	isSameYear,
	endOfYear,
	endOfMonth,
	endOfWeek,
	endOfDay,
	endOfHour,
	Day,
} from "date-fns";

import { units } from "./scales";
import type { GanttScaleUnit, Calendar } from "./types";

const diff: { [name: string]: { (start: Date, end: Date): number } } = {
	year: differenceInYears,
	quarter: differenceInQuarters,
	month: differenceInMonths,
	week: differenceInCalendarISOWeeks,
	day: differenceInCalendarDays,
	hour: differenceInHours,
	minute: differenceInMinutes,
};

const smallerCount: {
	[name: string]: {
		[name: string]: number | ((date?: Date) => number);
	};
} = {
	year: {
		quarter: 4,
		month: 12,
		week: getISOWeeksInYear,
		day: daysInYear,
		hour: hoursInYear,
	},
	quarter: {
		month: 3,
		week: weeksInQuarter,
		day: daysInQuarter,
		hour: hoursInQuarter,
	},
	month: {
		week: weeksInMonth,
		day: daysInMonth,
		hour: hoursInMonth,
	},
	week: {
		day: 7,
		hour: 24 * 7,
	},
	day: {
		hour: 24,
	},
	hour: {
		minute: 60,
	},
};

function daysInYear(date?: Date): number {
	if (date) return getDaysInYear(date);
	return 365;
}
function hoursInYear(date: Date): number {
	return getDaysInYear(date) * 24;
}

function weeksInQuarter(date: Date): number {
	const start = startOfQuarter(date);
	const end = addDays(startOfDay(endOfQuarter(date)), 1);
	return differenceInCalendarISOWeeks(end, start);
}
function daysInQuarter(date?: Date): number {
	if (date) {
		const start = startOfQuarter(date);
		const end = endOfQuarter(date);
		return differenceInCalendarDays(end, start) + 1;
	}
	return 91;
}
function hoursInQuarter(date: Date): number {
	return daysInQuarter(date) * 24;
}

function weeksInMonth(date?: Date): number {
	if (date) {
		const start = startOfMonth(date);
		const end = addDays(startOfDay(endOfMonth(date)), 1);
		return differenceInCalendarISOWeeks(end, start);
	}
	return 5;
}
function daysInMonth(date?: Date): number {
	if (date) return getDaysInMonth(date);
	return 30;
}
function hoursInMonth(date: Date): number {
	return getDaysInMonth(date) * 24;
}

export function getSmallerUnitCount(
	unit: string,
	lengthUnit: string,
	date?: Date
): number {
	const count = smallerCount[unit][lengthUnit];
	if (!count) return 1;
	if (typeof count === "number") return count;
	return count(date);
}

export function isCorrectLengthUnit(
	minUnit: string,
	lengthUnit: string
): boolean {
	return (
		minUnit === lengthUnit ||
		!!(smallerCount[minUnit] && smallerCount[minUnit][lengthUnit])
	);
}

const add: { [name: string]: { (start: number | Date, step: number): Date } } =
	{
		year: addYears,
		quarter: addQuarters,
		month: addMonths,
		week: addWeeks,
		day: addDays,
		hour: addHours,
		minute: addMinutes,
	};

export function getDiffer(
	unit: string,
	calendar?: Calendar,
	_weekStart?: Day
): {
	(start: Date, end: Date, lengthUnit?: string, unitSize?: boolean): number;
} {
	if (calendar) {
		if (unit === "day") {
			return (start: Date, end: Date) => {
				return calendar.getWorkingDays(end, start, true);
			};
		}
		if (unit === "hour") {
			return (start: Date, end: Date) => {
				return calendar.getWorkingHours(end, start, true);
			};
		}
	}
	return (next, prev, lengthUnit, unitSize) => {
		if (
			!smallerCount[unit][lengthUnit] ||
			typeof smallerCount[unit][lengthUnit] === "number" ||
			isSameUnit(unit, next, prev, _weekStart)
		) {
			return innerDiff(
				unit,
				next,
				prev,
				lengthUnit,
				unitSize,
				_weekStart
			);
		} else {
			return getLengthUnitDiff(
				next,
				prev,
				unit,
				lengthUnit,
				unitSize,
				_weekStart
			);
		}
	};
}

function innerDiff(
	unit: string,
	next: Date,
	prev: Date,
	lengthUnit?: string,
	unitSize?: boolean,
	_weekStart?: Day
): number {
	const minUnit = lengthUnit || unit;

	let start = prev;
	let end = next;
	if (unitSize) {
		start = getUnitStart(minUnit, prev, _weekStart);
		end = getUnitStart(minUnit, next, _weekStart);
		if (end < next) end = getAdder(minUnit)(end, 1);
	}

	if (unit !== minUnit) {
		const filled = diff[minUnit](end, start);
		const all = getSmallerUnitCount(unit, minUnit, prev);
		return filled / all;
	} else {
		return diff[minUnit](end, start);
	}
}

function getLengthUnitDiff(
	end: Date,
	start: Date,
	unit: string,
	lengthUnit: string,
	unitSize?: boolean,
	_weekStart?: Day
): number {
	// if not start of unit
	let lengthUnitsOfFirstUnit = 0;
	const unitStart = getUnitStart(unit, start, _weekStart);
	if (start > unitStart) {
		const nextUnitStart = add[unit](unitStart, 1);
		lengthUnitsOfFirstUnit = innerDiff(
			unit,
			nextUnitStart,
			start,
			lengthUnit,
			undefined,
			_weekStart
		);
		start = nextUnitStart;
	}

	// if lasts 1+ whole units
	let units = 0;
	if (!isSameUnit(unit, start, end, _weekStart)) {
		units = innerDiff(
			unit,
			getUnitStart(unit, end, _weekStart),
			start,
			undefined,
			undefined,
			_weekStart
		); // int part
		start = add[unit](start, units);
	}

	// all above plus lenUns of last unit if any
	units +=
		lengthUnitsOfFirstUnit +
		innerDiff(unit, end, start, lengthUnit, undefined, _weekStart);

	if (!units && unitSize) {
		// ugly hack for weeks and tasks that are between larger units
		units = innerDiff(unit, end, start, lengthUnit, unitSize, _weekStart);
	}

	return units;
}

export function getAdder(
	unit: string,
	calendar?: Calendar
): {
	(start: number | Date, step: number): Date;
} {
	if (calendar) {
		if (unit === "day") {
			return (date, amount) =>
				calendar.addWorkingDays(date as Date, amount, true);
		} else if (unit === "hour") {
			return (date, amount) =>
				calendar.addWorkingHours(date as Date, amount);
		}
	}
	return add[unit];
}

const startHandlers: {
	[name: string]: (start: number | Date, _weekStart?: Day) => Date;
} = {
	year: startOfYear,
	quarter: startOfQuarter,
	month: startOfMonth,
	week: (start, _weekStart) =>
		startOfWeek(start, { weekStartsOn: _weekStart }),
	day: startOfDay,
	hour: startOfHour,
};

export function getUnitStart(unit: string, date: Date, _weekStart?: Day): Date {
	const handler = startHandlers[unit];
	return handler ? handler(date, _weekStart) : new Date(date);
}
const endHandlers: {
	[name: string]: { (end: number | Date, _weekStart?: Day): Date };
} = {
	year: endOfYear,
	quarter: endOfQuarter,
	month: endOfMonth,
	week: (end: Date, _weekStart?: Day) =>
		endOfWeek(end, { weekStartsOn: _weekStart }),
	day: endOfDay,
	hour: endOfHour,
};
export function getUnitEnd(unit: string, date: Date, _weekStart?: Day): Date {
	const handler = endHandlers[unit];
	return handler ? handler(date, _weekStart) : new Date(date);
}

const sameHandlers: {
	[unit: string]: { (a: Date, b: Date, _weekStart?: Day): boolean };
} = {
	year: isSameYear,
	quarter: isSameQuarter,
	month: isSameMonth,
	week: (a, b, _weekStart) => isSameWeek(a, b, { weekStartsOn: _weekStart }),
	day: isSameDay,
};

export function isSameUnit(
	unit: string,
	a: Date,
	b: Date,
	_weekStart?: Day
): boolean {
	const handler = sameHandlers[unit];
	return handler ? handler(a, b, _weekStart) : false;
}

const handlers: { [name: string]: any } = {
	start: startHandlers,
	end: endHandlers,
	add,
	isSame: sameHandlers,
	diff,
	smallerCount,
};

const getCount = (count: any) => {
	if (typeof count === "function") return count(new Date());
	return count;
};

export function registerScaleUnit(unit: string, config: GanttScaleUnit) {
	for (const key in config) {
		if (key === "smallerCount") {
			const childUnits = Object.keys(config[key]);
			const baseUnit = childUnits
				.sort((a, b) => units.indexOf(a) - units.indexOf(b))
				.shift();
			let index = units.indexOf(baseUnit);
			const baseSmallerCount = config[key][baseUnit];
			const count = getCount(baseSmallerCount);
			for (let i = index - 1; i >= 0; i--) {
				const unitI = units[i];
				const countI = getCount(smallerCount[unitI][baseUnit]);
				if (count <= countI) break;
				index = i;
			}
			units.splice(index, 0, unit);
		}
		if (key === "biggerCount") {
			for (const parentUnit in config[key])
				smallerCount[parentUnit][unit] = config[key][parentUnit];
		} else handlers[key][unit] = config[key as keyof GanttScaleUnit];
	}
}

export function adjustToWorkingDay(
	start: Date,
	diff: number = 1,
	calendar: Calendar
): Date {
	if (!calendar.isWorkingDay(start))
		start =
			diff > 0
				? calendar.getNextWorkingDay(start)
				: calendar.getPreviousWorkingDay(start);
	return start;
}

export function shiftByWorkingDays(calendar: Calendar) {
	return (date: Date, diff: number) => {
		if (diff > 0) {
			for (let i = 0; i < diff; i++) {
				date = calendar.getNextWorkingDay(date);
			}
		}
		if (diff < 0) {
			for (let i = 0; i > diff; i--) {
				date = calendar.getPreviousWorkingDay(date);
			}
		}
		return date;
	};
}

export { format };
