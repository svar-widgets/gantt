import { describe, test, expect } from "vitest";
import { updateTask } from "../src/tasks";
import { resetScales } from "../src/scales";
import { GanttScaleData } from "../src/types";
import { getData, cellHeight, cellWidth, scaleHeight } from "./stubs/data";

const scaleStart = new Date(2024, 3, 1);
const scaleEnd = new Date(2024, 3, 20);

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

function calc(task: any, over: any = {}) {
	return updateTask(task, 0, {
		cellWidth,
		cellHeight,
		_scales: getScales(),
		baselines: false,
		_rollups: {},
		schedule: { auto: true },
		...over,
	});
}

describe("constraint", () => {
	test("has no marker without a constraint", () => {
		const task = calc({
			id: 1,
			type: "task",
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 5),
		});

		expect(task.$x_constraint).to.eq(undefined);
	});

	test("has no marker when constraints are inactive", () => {
		const task = calc(
			{
				id: 1,
				type: "task",
				start: new Date(2024, 3, 2),
				end: new Date(2024, 3, 5),
				constraint: { type: "snet", date: new Date(2024, 3, 7) },
			},
			{ schedule: null, criticalPath: null }
		);

		expect(task.$x_constraint).to.eq(undefined);
	});

	test("places the marker at the constraint date on the time axis", () => {
		const task = calc({
			id: 1,
			type: "task",
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 5),
			constraint: { type: "snet", date: new Date(2024, 3, 7) },
		});

		expect(task.$x_constraint).to.eq(6 * cellWidth);
	});

	test("clamps the marker to the scale start for an earlier constraint", () => {
		const task = calc({
			id: 1,
			type: "task",
			start: new Date(2024, 3, 4),
			end: new Date(2024, 3, 6),
			constraint: { type: "snet", date: new Date(2024, 2, 20) },
		});

		expect(task.$x_constraint).to.eq(0);
	});

	test("skips the marker for summary and unscheduled tasks", () => {
		const summary = calc({
			id: 1,
			type: "summary",
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 5),
			constraint: { type: "snet", date: new Date(2024, 3, 7) },
		});
		const unscheduled = calc(
			{
				id: 2,
				type: "task",
				unscheduled: true,
				start: new Date(2024, 3, 2),
				end: new Date(2024, 3, 5),
				constraint: { type: "snet", date: new Date(2024, 3, 7) },
			},
			{ unscheduledTasks: true }
		);

		expect(summary.$x_constraint).to.eq(undefined);
		expect(unscheduled.$x_constraint).to.eq(undefined);
	});
});
