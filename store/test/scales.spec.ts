import { describe, test, expect } from "vitest";
import { calcScales, resetScales } from "../src/scales";
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

	test("month row width matches week row width across a month/week boundary", () => {
		// A range crossing several month boundaries where the boundary
		// week does not start on the 1st of the month (e.g. Aug 1, 2026
		// is a Saturday), so weeks straddle two months. Every scale row
		// should sum to the exact same total width - a row must never
		// drift ahead of another because a shared boundary week got
		// rounded into two neighboring cells.
		const monthWeekScales = [
			{ unit: "month", step: 1, format: "%F %Y" },
			{ unit: "week", step: 1, format: "Uke %w" },
		];

		const _scales = resetScales(
			new Date(2026, 6, 1), // Jul 1, 2026
			new Date(2026, 8, 30), // Sep 30, 2026
			"day",
			cellWidth,
			scaleHeight,
			1, // weekStart = Monday
			monthWeekScales,
			1
		) as GanttScaleData;

		const [monthRow, weekRow] = _scales.rows;
		const sumWidth = (cells: { width: number }[]) =>
			cells.reduce((sum, cell) => sum + cell.width, 0);

		const monthTotal = sumWidth(monthRow.cells);
		const weekTotal = sumWidth(weekRow.cells);

		expect(weekTotal).to.eq(_scales.width);
		expect(monthTotal).to.eq(_scales.width);
		expect(monthTotal).to.eq(weekTotal);
	});
});
