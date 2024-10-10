import { describe, test, expect } from "vitest";
import {
	getAdder,
	getDiffer,
	getUnitStart,
	getUnitEnd,
	isSameUnit,
	isCorrectLengthUnit,
	getSmallerUnitCount,
} from "../src/time";

describe("time calculation", () => {
	test("getAdder", () => {
		const dayAdder = getAdder("day");
		const weekAdder = getAdder("week");
		const monthAdder = getAdder("month");
		const quarterAdder = getAdder("quarter");
		const yearAdder = getAdder("year");

		const date = new Date(2024, 3, 2);

		expect(dayAdder(date, 5)).to.deep.eq(new Date(2024, 3, 7));
		expect(weekAdder(date, 2)).to.deep.eq(new Date(2024, 3, 16));
		expect(monthAdder(date, 2)).to.deep.eq(new Date(2024, 5, 2));
		expect(quarterAdder(date, 1)).to.deep.eq(new Date(2024, 6, 2));
		expect(yearAdder(date, 1)).to.deep.eq(new Date(2025, 3, 2));
	});

	test("getDiffer", () => {
		const dayDiffer = getDiffer("day");
		const weekDiffer = getDiffer("week");
		const monthDiffer = getDiffer("month");
		const quarterDiffer = getDiffer("quarter");
		const yearDiffer = getDiffer("year");

		const date1 = new Date(2024, 3, 2);
		const date2 = new Date(2024, 3, 7);
		const date3 = new Date(2024, 4, 2);
		const date4 = new Date(2024, 10, 5);
		const date5 = new Date(2026, 5, 5);

		expect(dayDiffer(date2, date1)).to.eq(5);
		expect(weekDiffer(date3, date1)).to.eq(4);
		expect(monthDiffer(date3, date1)).to.eq(1);
		expect(quarterDiffer(date4, date1)).to.eq(2);
		expect(yearDiffer(date5, date1)).to.eq(2);
	});

	test("getUnitStart", () => {
		const date = new Date(2024, 5, 15);

		expect(getUnitStart("day", date)).to.deep.eq(new Date(2024, 5, 15));
		expect(getUnitStart("week", date)).to.deep.eq(new Date(2024, 5, 10));
		expect(getUnitStart("month", date)).to.deep.eq(new Date(2024, 5, 1));
		expect(getUnitStart("quarter", date)).to.deep.eq(new Date(2024, 3, 1));
		expect(getUnitStart("year", date)).to.deep.eq(new Date(2024, 0, 1));
	});

	test("getUnitEnd", () => {
		const date = new Date(2024, 5, 15);

		expect(getUnitEnd("day", date)).to.deep.eq(
			new Date(new Date(2024, 5, 16).valueOf() - 1)
		);
		expect(getUnitEnd("week", date)).to.deep.eq(
			new Date(new Date(2024, 5, 17).valueOf() - 1)
		);
		expect(getUnitEnd("month", date)).to.deep.eq(
			new Date(new Date(2024, 5, 31).valueOf() - 1)
		);
		expect(getUnitEnd("quarter", date)).to.deep.eq(
			new Date(new Date(2024, 5, 31).valueOf() - 1)
		);
		expect(getUnitEnd("year", date)).to.deep.eq(
			new Date(new Date(2025, 0, 1).valueOf() - 1)
		);
	});

	test("isSameUnit", () => {
		const date1 = new Date(2024, 5, 15);
		const date2 = new Date(2024, 6, 20);

		expect(isSameUnit("day", date1, date2)).to.eq(false);
		expect(isSameUnit("week", date1, date2)).to.eq(false);
		expect(isSameUnit("month", date1, date2)).to.eq(false);
		expect(isSameUnit("quarter", date1, date2)).to.eq(false);
		expect(isSameUnit("year", date1, date2)).to.eq(true);
	});

	test("isCorrectLengthUnit", () => {
		expect(isCorrectLengthUnit("minute", "minute")).to.eq(true);
		expect(isCorrectLengthUnit("minute", "hour")).to.eq(false);
		expect(isCorrectLengthUnit("minute", "day")).to.eq(false);
		expect(isCorrectLengthUnit("minute", "week")).to.eq(false);
		expect(isCorrectLengthUnit("minute", "month")).to.eq(false);
		expect(isCorrectLengthUnit("minute", "quarter")).to.eq(false);
		expect(isCorrectLengthUnit("minute", "year")).to.eq(false);

		expect(isCorrectLengthUnit("hour", "minute")).to.eq(true);
		expect(isCorrectLengthUnit("hour", "hour")).to.eq(true);
		expect(isCorrectLengthUnit("hour", "day")).to.eq(false);
		expect(isCorrectLengthUnit("hour", "week")).to.eq(false);
		expect(isCorrectLengthUnit("hour", "month")).to.eq(false);
		expect(isCorrectLengthUnit("hour", "quarter")).to.eq(false);
		expect(isCorrectLengthUnit("hour", "year")).to.eq(false);

		expect(isCorrectLengthUnit("day", "hour")).to.eq(true);
		expect(isCorrectLengthUnit("day", "day")).to.eq(true);
		expect(isCorrectLengthUnit("day", "week")).to.eq(false);
		expect(isCorrectLengthUnit("day", "month")).to.eq(false);
		expect(isCorrectLengthUnit("day", "quarter")).to.eq(false);
		expect(isCorrectLengthUnit("day", "year")).to.eq(false);

		expect(isCorrectLengthUnit("week", "hour")).to.eq(true);
		expect(isCorrectLengthUnit("week", "day")).to.eq(true);
		expect(isCorrectLengthUnit("week", "week")).to.eq(true);
		expect(isCorrectLengthUnit("week", "month")).to.eq(false);
		expect(isCorrectLengthUnit("week", "quarter")).to.eq(false);
		expect(isCorrectLengthUnit("week", "year")).to.eq(false);

		expect(isCorrectLengthUnit("month", "hour")).to.eq(true);
		expect(isCorrectLengthUnit("month", "day")).to.eq(true);
		expect(isCorrectLengthUnit("month", "week")).to.eq(true);
		expect(isCorrectLengthUnit("month", "month")).to.eq(true);
		expect(isCorrectLengthUnit("month", "quarter")).to.eq(false);
		expect(isCorrectLengthUnit("month", "year")).to.eq(false);

		expect(isCorrectLengthUnit("quarter", "hour")).to.eq(true);
		expect(isCorrectLengthUnit("quarter", "day")).to.eq(true);
		expect(isCorrectLengthUnit("quarter", "week")).to.eq(true);
		expect(isCorrectLengthUnit("quarter", "month")).to.eq(true);
		expect(isCorrectLengthUnit("quarter", "quarter")).to.eq(true);
		expect(isCorrectLengthUnit("quarter", "year")).to.eq(false);

		expect(isCorrectLengthUnit("year", "hour")).to.eq(true);
		expect(isCorrectLengthUnit("year", "day")).to.eq(true);
		expect(isCorrectLengthUnit("year", "week")).to.eq(true);
		expect(isCorrectLengthUnit("year", "month")).to.eq(true);
		expect(isCorrectLengthUnit("year", "quarter")).to.eq(true);
		expect(isCorrectLengthUnit("year", "year")).to.eq(true);
	});

	test("getSmallerUnitCount", () => {
		const date = new Date(2024, 3, 2);

		expect(getSmallerUnitCount("hour", "minute")).to.eq(60);
		expect(getSmallerUnitCount("hour", "hour")).to.eq(1);
		expect(getSmallerUnitCount("hour", "day")).to.eq(1);
		expect(getSmallerUnitCount("hour", "week")).to.eq(1);
		expect(getSmallerUnitCount("hour", "month")).to.eq(1);
		expect(getSmallerUnitCount("hour", "quarter")).to.eq(1);
		expect(getSmallerUnitCount("hour", "year")).to.eq(1);

		expect(getSmallerUnitCount("day", "hour")).to.eq(24);
		expect(getSmallerUnitCount("day", "day")).to.eq(1);
		expect(getSmallerUnitCount("day", "week")).to.eq(1);
		expect(getSmallerUnitCount("day", "month")).to.eq(1);
		expect(getSmallerUnitCount("day", "quarter")).to.eq(1);
		expect(getSmallerUnitCount("day", "year")).to.eq(1);

		expect(getSmallerUnitCount("week", "hour")).to.eq(168);
		expect(getSmallerUnitCount("week", "day")).to.eq(7);
		expect(getSmallerUnitCount("week", "week")).to.eq(1);
		expect(getSmallerUnitCount("week", "month")).to.eq(1);
		expect(getSmallerUnitCount("week", "quarter")).to.eq(1);
		expect(getSmallerUnitCount("week", "year")).to.eq(1);

		expect(getSmallerUnitCount("month", "hour", date)).to.eq(720);
		expect(getSmallerUnitCount("month", "day", date)).to.eq(30);
		expect(getSmallerUnitCount("month", "week", date)).to.eq(4);
		expect(getSmallerUnitCount("month", "month", date)).to.eq(1);
		expect(getSmallerUnitCount("month", "quarter", date)).to.eq(1);
		expect(getSmallerUnitCount("month", "year", date)).to.eq(1);

		expect(getSmallerUnitCount("quarter", "hour", date)).to.eq(2160);
		expect(getSmallerUnitCount("quarter", "day", date)).to.eq(90);
		expect(getSmallerUnitCount("quarter", "week", date)).to.eq(12);
		expect(getSmallerUnitCount("quarter", "month", date)).to.eq(3);
		expect(getSmallerUnitCount("quarter", "quarter", date)).to.eq(1);
		expect(getSmallerUnitCount("quarter", "year", date)).to.eq(1);

		expect(getSmallerUnitCount("year", "hour", date)).to.eq(8784);
		expect(getSmallerUnitCount("year", "day", date)).to.eq(366);
		expect(getSmallerUnitCount("year", "week", date)).to.eq(52);
		expect(getSmallerUnitCount("year", "month", date)).to.eq(12);
		expect(getSmallerUnitCount("year", "quarter", date)).to.eq(4);
		expect(getSmallerUnitCount("year", "year", date)).to.eq(1);
	});
});
