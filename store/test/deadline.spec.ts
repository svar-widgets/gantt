import { describe, test, expect } from "vitest";
import { updateTask } from "../src/tasks";
import { calcScales, resetScales } from "../src/scales";
import { GanttScaleData } from "../src/types";
import { getData, cellHeight, cellWidth, scaleHeight } from "./stubs/data";

const scaleStart = new Date(2024, 3, 1);
const scaleEnd = new Date(2024, 3, 10);

function getScales(): GanttScaleData {
	const { scales } = getData();
	return resetScales(
		scaleStart,
		scaleEnd,
		"day",
		cellWidth,
		scaleHeight,
		1,
		scales,
		0
	) as GanttScaleData;
}

function calc(task: any, deadlines = true) {
	return updateTask(task, 0, {
		cellWidth,
		cellHeight,
		_scales: getScales(),
		baselines: false,
		deadlines,
	});
}

describe("deadline", () => {
	test("has no marker and is not overdue without a deadline", () => {
		const task = calc({
			id: 1,
			type: "task",
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 5),
		});

		expect(task.$x_deadline).to.eq(undefined);
		expect(task.$overdue).to.eq(false);
	});

	test("places the marker at the deadline date on the time axis", () => {
		const task = calc({
			id: 1,
			type: "task",
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 5),
			deadline: new Date(2024, 3, 7),
		});

		expect(task.$x_deadline).to.eq(6 * cellWidth);
	});

	test("marks the task overdue when the finish is after the deadline", () => {
		const task = calc({
			id: 1,
			type: "task",
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 6),
			deadline: new Date(2024, 3, 5),
		});

		expect(task.$overdue).to.eq(true);
	});

	test("is not overdue when the finish equals the deadline", () => {
		const task = calc({
			id: 1,
			type: "task",
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 5),
			deadline: new Date(2024, 3, 5),
		});

		expect(task.$overdue).to.eq(false);
	});

	test("is not overdue when the finish is before the deadline", () => {
		const task = calc({
			id: 1,
			type: "task",
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 4),
			deadline: new Date(2024, 3, 8),
		});

		expect(task.$overdue).to.eq(false);
	});

	test("uses the start date as finish for a milestone", () => {
		const task = calc({
			id: 1,
			type: "milestone",
			start: new Date(2024, 3, 6),
			deadline: new Date(2024, 3, 5),
		});

		expect(task.$overdue).to.eq(true);
	});

	test("clamps the marker to the scale start for an earlier deadline", () => {
		const task = calc({
			id: 1,
			type: "task",
			start: new Date(2024, 3, 4),
			end: new Date(2024, 3, 6),
			deadline: new Date(2024, 2, 20),
		});

		expect(task.$x_deadline).to.eq(0);
		expect(task.$overdue).to.eq(true);
	});

	test("is not calculated when deadlines are disabled", () => {
		const task = calc(
			{
				id: 1,
				type: "task",
				start: new Date(2024, 3, 2),
				end: new Date(2024, 3, 6),
				deadline: new Date(2024, 3, 5),
			},
			false
		);

		expect(task.$x_deadline).to.eq(undefined);
		expect(task.$overdue).to.eq(false);
	});
});

describe("deadline and scale range", () => {
	function bounds(deadlines: boolean) {
		const tasks: any = [
			{
				id: 1,
				type: "task",
				start: new Date(2024, 3, 2),
				end: new Date(2024, 3, 5),
				deadline: new Date(2024, 3, 25),
			},
		];

		return calcScales(null, null, false, "day", tasks, { deadlines });
	}

	test("extends the flexible scale when deadlines are enabled", () => {
		expect(bounds(true)._end).to.eql(new Date(2024, 3, 26));
	});

	test("does not extend the scale when deadlines are disabled", () => {
		expect(bounds(false)._end).to.eql(new Date(2024, 3, 6));
	});
});
