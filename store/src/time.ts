import {
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
} from "date-fns";

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
	const end = endOfQuarter(date);
	return differenceInCalendarISOWeeks(end, start);
}
function daysInQuarter(date?: Date): number {
	if (date) {
		const start = startOfQuarter(date);
		const end = endOfQuarter(date);
		return differenceInCalendarDays(end, start);
	}
	return 91;
}
function hoursInQuarter(date: Date): number {
	return daysInQuarter(date) * 24;
}

function weeksInMonth(date?: Date): number {
	if (date) {
		const start = startOfMonth(date);
		const end = endOfMonth(date);
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
	};

export function getDiffer(unit: string): {
	(start: Date, end: Date, lengthUnit?: string, unitSize?: boolean): number;
} {
	return (next, prev, lengthUnit, unitSize) => {
		if (
			!smallerCount[unit][lengthUnit] ||
			typeof smallerCount[unit][lengthUnit] === "number" ||
			isSameUnit(unit, next, prev)
		) {
			return innerDiff(unit, next, prev, lengthUnit, unitSize);
		} else {
			return getLengthUnitDiff(next, prev, unit, lengthUnit, unitSize);
		}
	};
}

function innerDiff(
	unit: string,
	next: Date,
	prev: Date,
	lengthUnit?: string,
	unitSize?: boolean
): number {
	const minUnit = lengthUnit || unit;

	let start = prev;
	let end = next;
	if (unitSize) {
		start = getUnitStart(minUnit, prev);
		end = getUnitStart(minUnit, next);
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
	unitSize?: boolean
): number {
	// if not start of unit
	let lengthUnitsOfFirstUnit = 0;
	if (start > getUnitStart(unit, start)) {
		const unitEnd = getUnitEnd(unit, start);
		lengthUnitsOfFirstUnit = innerDiff(unit, unitEnd, start, lengthUnit);
		start = unitEnd;
	}

	// if lasts 1+ whole units
	let units = 0;
	if (!isSameUnit(unit, start, end)) {
		units = innerDiff(unit, getUnitStart(unit, end), start); // int part
		start = add[unit](start, units);
	}

	// all above plus lenUns of last unit if any
	units += lengthUnitsOfFirstUnit + innerDiff(unit, end, start, lengthUnit);

	if (!units && unitSize) {
		// ugly hack for weeks and tasks that are between larger units
		units = innerDiff(unit, end, start, lengthUnit, unitSize);
	}

	return units;
}

export function getAdder(unit: string): {
	(start: number | Date, step: number): Date;
} {
	return add[unit];
}

export function getUnitStart(unit: string, start: Date): Date {
	switch (unit) {
		case "year":
			return startOfYear(start);
		case "quarter":
			return startOfQuarter(start);
		case "month":
			return startOfMonth(start);
		case "week":
			return startOfWeek(start, { weekStartsOn: 1 });
		case "day":
			return startOfDay(start);
		case "hour":
			return startOfHour(start);
		default:
			return new Date(start);
	}
}

export function getUnitEnd(unit: string, date: Date): Date {
	switch (unit) {
		case "year":
			return endOfYear(date);
		case "quarter":
			return endOfQuarter(date);
		case "month":
			return endOfMonth(date);
		case "week":
			return endOfWeek(date, { weekStartsOn: 1 });
		case "day":
			return endOfDay(date);
		case "hour":
			return endOfHour(date);
		default:
			return new Date(date);
	}
}

export function isSameUnit(unit: string, a: Date, b: Date): boolean {
	switch (unit) {
		case "year":
			return isSameYear(a, b);
		case "quarter":
			return isSameQuarter(a, b);
		case "month":
			return isSameMonth(a, b);
		case "week":
			return isSameWeek(a, b, { weekStartsOn: 1 });
		case "day":
			return isSameDay(a, b);
		default:
			return false;
	}
}

export { format };
