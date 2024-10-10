import { describe, test, expect } from "vitest";
import { updateTask } from "../src/tasks";
import { resetScales } from "../src/scales";
import { GanttScaleData } from "../src/types";
import { getData, cellHeight, cellWidth, scaleHeight } from "./stubs/data";

describe("tasks", () => {
	test("recalculate task position", () => {
		const task = {
			id: 1,
			text: "Task 1",
			type: "task",
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 5),
		};

		const { scales } = getData();

		const _scales = resetScales(
			new Date(2024, 3, 1),
			new Date(2024, 3, 10),
			"day",
			cellWidth,
			scaleHeight,
			scales
		) as GanttScaleData;

		const updatedTask = updateTask(
			task as any,
			0,
			cellWidth,
			cellHeight,
			_scales,
			false
		);

		expect(updatedTask.$x).to.eq(100);
		expect(updatedTask.$y).to.eq(3); // 0 + default padding
		expect(updatedTask.$w).to.eq(300);
		expect(updatedTask.$h).to.eq(31);
		expect(updatedTask.$skip).to.eq(false);
	});

	test("recalculate task position, milestone", () => {
		const task = {
			id: 1,
			text: "Task 1",
			type: "milestone",
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 5),
		};

		const { scales } = getData();

		const _scales = resetScales(
			new Date(2024, 3, 1),
			new Date(2024, 3, 10),
			"day",
			cellWidth,
			scaleHeight,
			scales
		) as GanttScaleData;

		const updatedTask = updateTask(
			task as any,
			0,
			cellWidth,
			cellHeight,
			_scales,
			false
		);

		expect(updatedTask.$x).to.eq(84.5);
		expect(updatedTask.$y).to.eq(3); // 0 + default padding
		expect(updatedTask.$w).to.eq(31);
		expect(updatedTask.$h).to.eq(31);
	});

	test("recalculate task position, baselines enabled", () => {
		const task = {
			id: 1,
			text: "Task 1",
			type: "task",
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 5),
			base_start: new Date(2024, 3, 2),
			base_end: new Date(2024, 3, 5),
		};

		const { scales } = getData();

		const _scales = resetScales(
			new Date(2024, 3, 1),
			new Date(2024, 3, 10),
			"day",
			cellWidth,
			scaleHeight,
			scales
		) as GanttScaleData;

		const updatedTask = updateTask(
			task as any,
			0,
			cellWidth,
			cellHeight,
			_scales,
			true
		);

		expect(updatedTask.$x).to.eq(100);
		expect(updatedTask.$y).to.eq(3); // 0 + default padding
		expect(updatedTask.$w).to.eq(300);
		expect(updatedTask.$h).to.eq(19);
		expect(updatedTask.$skip).to.eq(false);

		expect(updatedTask.$x_base).to.eq(100);
		expect(updatedTask.$y_base).to.eq(26);
		expect(updatedTask.$w_base).to.eq(300);
		expect(updatedTask.$h_base).to.eq(8);
	});
});
