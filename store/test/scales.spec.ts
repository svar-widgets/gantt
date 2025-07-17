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
			scales
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
