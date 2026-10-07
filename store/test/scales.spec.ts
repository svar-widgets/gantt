import { describe, test, expect } from "vitest";
import { calcScales, resetScales, calcScaleCellDate } from "../src/scales";
import { getData, scaleHeight, cellWidth } from "./stubs/data";
import { GanttScaleData } from "../src/types";
import GanttDataTree from "../src/GanttDataTree";

describe("scales", () => {
	test("calculate scales", () => {
		const { tasks } = getData();

		const _scales = calcScales(
			new Date(2024, 3, 1),
			new Date(2024, 3, 10),
			false,
			"day",
			new GanttDataTree(tasks)
		);

		expect(_scales._start).to.deep.eq(new Date(2024, 3, 1));
		expect(_scales._end).to.deep.eq(new Date(2024, 3, 10));
	});

	test("recalculate scales", () => {
		const { scales } = getData();

		const _scales = resetScales(
			new Date(2024, 3, 1),
			new Date(2024, 3, 10),
			"day",
			cellWidth,
			scaleHeight,
			1,
			scales,
			1
		) as GanttScaleData;

		expect(_scales.start).to.deep.eq(new Date(2024, 3, 1));
		expect(_scales.end).to.deep.eq(new Date(2024, 3, 10));
		expect(_scales.width).to.eq(900);
		expect(_scales.height).to.eq(60);
		expect(_scales.lengthUnitWidth).to.eq(100);
		expect(_scales.lengthUnit).to.eq("day");
		expect(_scales.minUnit).to.eq("day");
	});
});

describe("calcScaleCellDate", () => {
	test("calcScaleCellDate works with days inside days cells", () => {
		const start = new Date(2026, 3, 2);
		const { scales } = getData();
		const _scales = resetScales(
			start,
			new Date(2026, 3, 20),
			"day",
			cellWidth,
			scaleHeight,
			1,
			scales,
			1
		) as GanttScaleData;

		const state = {
			_scales,
			_start: start,
			_weekStart: 1 as const,
			cellWidth,
			durationUnit: "day" as const,
		};

		expect(calcScaleCellDate(0, state)).to.deep.eq(start);
		expect(calcScaleCellDate(100, state)).to.deep.eq(new Date(2026, 3, 3));
		expect(calcScaleCellDate(200, state)).to.deep.eq(new Date(2026, 3, 4));
		expect(calcScaleCellDate(700, state)).to.deep.eq(new Date(2026, 3, 9));
	});

	test("calcScaleCellDate works with days inside week cells", () => {
		const start = new Date(2026, 3, 6);
		const _scales = resetScales(
			start,
			new Date(2026, 3, 27),
			"day",
			cellWidth,
			scaleHeight,
			1,
			[
				{ unit: "month", step: 1, format: "%F %Y" },
				{ unit: "week", step: 1, format: "%W" },
			],
			1
		) as GanttScaleData;
		const state = {
			_scales,
			_start: start,
			_weekStart: 1 as const,
			cellWidth,
			durationUnit: "day" as const,
		};

		expect(calcScaleCellDate(0, state)).to.deep.eq(start);
		expect(calcScaleCellDate(40, state)).to.deep.eq(new Date(2026, 3, 9));
		expect(calcScaleCellDate(50, state)).to.deep.eq(new Date(2026, 3, 10));
		expect(calcScaleCellDate(100, state)).to.deep.eq(new Date(2026, 3, 13));
		expect(calcScaleCellDate(150, state)).to.deep.eq(new Date(2026, 3, 17));
	});

	test("calcScaleCellDate works with days inside month cells", () => {
		const start = new Date(2026, 3, 1);
		const monthCellWidth = 300;
		const _scales = resetScales(
			start,
			new Date(2026, 5, 1),
			"day",
			monthCellWidth,
			scaleHeight,
			1,
			[{ unit: "month", step: 1, format: "%F %Y" }],
			1
		) as GanttScaleData;
		const state = {
			_scales,
			_start: start,
			_weekStart: 1 as const,
			cellWidth: monthCellWidth,
			durationUnit: "day" as const,
		};

		expect(calcScaleCellDate(0, state)).to.deep.eq(start);
		expect(calcScaleCellDate(140, state)).to.deep.eq(new Date(2026, 3, 15));
		expect(calcScaleCellDate(290, state)).to.deep.eq(new Date(2026, 3, 30));
		expect(calcScaleCellDate(300, state)).to.deep.eq(new Date(2026, 4, 1));
	});

	test("calcScaleCellDate snaps to duration unit when scale unit is smaller", () => {
		const start = new Date(2026, 3, 2);
		const _scales = resetScales(
			start,
			new Date(2026, 3, 20),
			"hour",
			cellWidth,
			scaleHeight,
			1,
			[
				{ unit: "day", step: 1, format: "%j" },
				{ unit: "hour", step: 1, format: "%H" },
			],
			1
		) as GanttScaleData;

		const state = {
			_scales,
			_start: start,
			_weekStart: 1 as const,
			cellWidth,
			durationUnit: "day" as const,
		};

		expect(calcScaleCellDate(0, state)).to.deep.eq(start);
		expect(calcScaleCellDate(cellWidth * 7, state)).to.deep.eq(start);
		expect(calcScaleCellDate(cellWidth * 13, state)).to.deep.eq(start);
		expect(calcScaleCellDate(cellWidth * (24 * 3 + 5), state)).to.deep.eq(
			new Date(2026, 3, 5)
		);
	});

	test("calcScaleCellDate works with hour cells", () => {
		const start = new Date(2026, 3, 2);
		const _scales = resetScales(
			start,
			new Date(2026, 3, 3),
			"hour",
			cellWidth,
			scaleHeight,
			1,
			[
				{ unit: "day", step: 1, format: "%j" },
				{ unit: "hour", step: 1, format: "%H" },
			],
			1
		) as GanttScaleData;
		const state = {
			_scales,
			_start: start,
			_weekStart: 1 as const,
			cellWidth,
			durationUnit: "hour" as const,
		};

		expect(calcScaleCellDate(0, state)).to.deep.eq(start);
		expect(calcScaleCellDate(49, state)).to.deep.eq(start);
		expect(calcScaleCellDate(51, state)).to.deep.eq(
			new Date(2026, 3, 2, 1)
		);
		expect(calcScaleCellDate(150, state)).to.deep.eq(
			new Date(2026, 3, 2, 2)
		);
	});
});
