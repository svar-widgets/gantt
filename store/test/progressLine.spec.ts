import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import { DataStore, getSegmentProgress } from "../src/index";
import { getProgressLinePoints } from "../src/helpers/progressLine";
import { getData, cellWidth } from "./stubs/data";
import { normalizeLinks } from "../src/links";
import { writable } from "./stubs/writable";
import { IDataConfig } from "../src/types";

let store: DataStore;

function resetState(
	progressLine?: boolean | Date,
	dataOverride?: Partial<IDataConfig>
) {
	let data = getData();
	if (data.links) data.links = normalizeLinks(data.links);
	if (progressLine !== undefined) data.progressLine = progressLine;
	store = new DataStore(writable);
	if (dataOverride) data = { ...data, ...dataOverride };
	store.init({ ...data });
	vi.advanceTimersByTime(1);
}

describe("progress line", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		// pin "now" inside the scale so `progressLine: true` is deterministic
		vi.setSystemTime(new Date(2024, 3, 5));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("is disabled by default (no progressLine config)", () => {
		resetState();
		expect(store.getState().progressLine).to.eq(false);
		expect(store.getState()._progressLine).to.eq(null);
	});

	test("stays null when progressLine is explicitly false", () => {
		resetState(false);
		expect(store.getState()._progressLine).to.eq(null);
	});

	test("uses the current date when progressLine is true", () => {
		resetState(true);

		const { _progressLine } = store.getState();
		expect(_progressLine).to.not.eq(null);
		// "now" is pinned to 2024-04-05, i.e. 4 days from the scale start
		expect(_progressLine!.statusDate).to.deep.eq(new Date(2024, 3, 5));
		expect(_progressLine!.statusX).to.eq(4 * cellWidth);
	});

	test("computes statusX from an explicit date inside the scale", () => {
		const statusDate = new Date(2024, 3, 3);
		resetState(statusDate);

		const { _progressLine } = store.getState();
		expect(_progressLine!.statusDate).to.deep.eq(statusDate);
		expect(_progressLine!.statusX).to.eq(2 * cellWidth);
	});

	test("generates progressLine points", () => {
		resetState(new Date(2024, 3, 5), {
			tasks: [
				{
					id: 1,
					text: "Task 1",
					type: "task",
					parent: 0,
					start: new Date(2024, 3, 2),
					end: new Date(2024, 3, 4),
					progress: 0,
				},
				{
					id: 2,
					text: "Task 2",
					type: "task",
					parent: 0,
					start: new Date(2024, 3, 5),
					end: new Date(2024, 3, 6),
					progress: 50,
				},
				{
					id: 3,
					text: "Task 3",
					type: "task",
					parent: 0,
					start: new Date(2024, 3, 8),
					end: new Date(2024, 3, 9),
					progress: 100,
				},
			],
			links: [],
		});

		const EXPECTED_POINTS =
			"400,0 400,3 100,18.5 400,38 400,38 450,56.5 400,76 400,76 800,94.5 400,110 400,110";

		const { _progressLine, _tasks } = store.getState();
		const points = getProgressLinePoints(_tasks, _progressLine, 0);

		expect(points).to.eq(EXPECTED_POINTS);
	});

	describe("rows without a bar", () => {
		// cellHeight is 38, so the rows are 3..34, 41..72, 79..110
		const scheduled = [
			{
				id: 1,
				text: "Task 1",
				type: "task",
				parent: 0,
				start: new Date(2024, 3, 2),
				end: new Date(2024, 3, 4),
				progress: 50,
			},
			{
				id: 3,
				text: "Task 3",
				type: "task",
				parent: 0,
				start: new Date(2024, 3, 8),
				end: new Date(2024, 3, 9),
				progress: 50,
			},
		];

		function getPoints(dataOverride: Partial<IDataConfig>) {
			resetState(new Date(2024, 3, 5), { links: [], ...dataOverride });
			const state = store.getState();
			return getProgressLinePoints(
				state._tasks,
				state._progressLine,
				0,
				state
			);
		}

		test("keeps the line at the status date on unscheduled tasks", () => {
			const unscheduled = {
				id: 2,
				text: "Task 2",
				type: "task",
				parent: 0,
				duration: 2,
				progress: 30,
			};

			const points = getPoints({
				unscheduledTasks: true,
				tasks: [scheduled[0], unscheduled, scheduled[1]],
			});

			// the middle row sits on the status line and both boundaries
			// around it stay one row apart
			expect(points).to.eq(
				"400,0 400,3 200,18.5 400,38 400,38 400,56.5 400,76 400,76 750,94.5 400,110 400,110"
			);
		});

		test("ignores the unscheduled flag while the mode is off", () => {
			// without unscheduledTasks the task keeps its bar, so does the line
			const points = getPoints({
				tasks: [{ ...scheduled[0], unscheduled: true }, scheduled[1]],
			});

			expect(points.split(" ")[2]).to.eq("200,18.5");
		});

		test("keeps its own dates on a summary with unscheduled kids", () => {
			const points = getPoints({
				unscheduledTasks: true,
				tasks: [
					{
						id: 10,
						text: "Summary",
						type: "summary",
						parent: 0,
						open: true,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 6),
						progress: 50,
					},
					{
						id: 11,
						text: "Kid",
						type: "task",
						parent: 10,
						duration: 2,
					},
					scheduled[1],
				],
			});

			// the summary deviates by its own progress, the kid stays on the line
			expect(points).to.eq(
				"400,0 400,3 300,18.5 400,38 400,38 400,56.5 400,76 400,76 750,94.5 400,110 400,110"
			);
		});

		test("stops before the placeholder row", () => {
			const points = getPoints({
				placeholderRow: true,
				tasks: scheduled,
			});

			const { _tasks } = store.getState();
			expect(_tasks[_tasks.length - 1].$placeholder).to.eq(true);
			// the last point is the bottom of the second task, not of the row
			// added below it
			expect(points.split(" ").pop()).to.eq("400,72");
		});
	});

	test("follows the segments of a split task", () => {
		// Mon Jan 15, 4 working days, split into [Mon, Tue] and [Thu, Fri]
		// with Wed as a gap, so 50% lands on the end of the first segment
		resetState(new Date(2024, 0, 17), {
			splitTasks: true,
			calendar: "default",
			tasks: [
				{
					id: 1,
					text: "Task 1",
					type: "task",
					parent: 0,
					start: new Date(2024, 0, 15),
					duration: 4,
					progress: 50,
				},
			],
			links: [],
		});
		store.in.exec("split-task", { id: 1 });
		vi.advanceTimersByTime(1);

		const { _progressLine, _tasks } = store.getState();
		const task = _tasks[0];
		const [first, second] = task.segments;

		// the edge sits at the end of the first segment,
		// not in the middle of the whole span
		expect(getSegmentProgress(task, 0)).to.eq(100);
		expect(getSegmentProgress(task, 1)).to.eq(0);

		const edgeX = task.$x + first.$x + first.$w;
		expect(edgeX).to.not.eq(task.$x + task.$w * 0.5);
		expect(second.$x).to.be.greaterThan(first.$x + first.$w);

		// the status date is the first day of the gap, so the edge stays there
		const options = { splitTasks: true };
		const points = getProgressLinePoints(_tasks, _progressLine, 0, options);
		expect(points.split(" ")[2]).to.eq(`${edgeX},${task.$y + task.$h / 2}`);

		// task.duration is dropped while a split task is rescheduled
		delete task.duration;
		expect(getProgressLinePoints(_tasks, _progressLine, 0, options)).to.eq(
			points
		);
		expect(getSegmentProgress(task, 0)).to.eq(100);
	});

	describe("progress edge inside a segment gap", () => {
		// [Thu 9, Fri 10] and [Tue 14, Wed 15] Apr 2026, 50% done, so the edge
		// is both the end of the first segment and the start of the second one
		function getEdgeX(statusDate: Date) {
			resetState(statusDate, {
				splitTasks: true,
				calendar: "default",
				tasks: [
					{
						id: 1,
						text: "Task 1",
						type: "task",
						parent: 0,
						start: new Date(2026, 3, 9),
						progress: 50,
						segments: [
							{ start: new Date(2026, 3, 9), duration: 2 },
							{ start: new Date(2026, 3, 14), duration: 2 },
						],
					},
				],
				links: [],
			});

			const { _progressLine, _tasks } = store.getState();
			const task = _tasks[0];
			const [first, second] = task.segments;

			const points = getProgressLinePoints(_tasks, _progressLine, 0, {
				splitTasks: true,
			});
			return {
				edgeX: +points.split(" ")[2].split(",")[0],
				statusX: _progressLine!.statusX,
				gapStart: task.$x + first.$x + first.$w,
				gapEnd: task.$x + second.$x,
			};
		}

		test("keeps the line straight while the status date is in the gap", () => {
			// Mon 13 Apr: two days of work were due and two are done
			const { edgeX, statusX, gapStart, gapEnd } = getEdgeX(
				new Date(2026, 3, 13)
			);

			expect(statusX).to.be.greaterThan(gapStart);
			expect(statusX).to.be.lessThan(gapEnd);
			expect(edgeX).to.eq(statusX);
		});

		test("measures the delay from the start of the next segment", () => {
			// Wed 15 Apr: three days were due, two are done, so the task is
			// one day behind - the gap must not add to that
			const { edgeX, statusX, gapStart, gapEnd } = getEdgeX(
				new Date(2026, 3, 15)
			);

			expect(statusX).to.be.greaterThan(gapEnd);
			expect(edgeX).to.eq(gapEnd);
			expect(statusX - edgeX).to.eq(cellWidth);
			expect(gapEnd).to.be.greaterThan(gapStart);
		});

		test("measures the lead from the end of the filled segment", () => {
			// Fri 10 Apr: one day was due and two are done, one day ahead
			const { edgeX, statusX, gapStart } = getEdgeX(
				new Date(2026, 3, 10)
			);

			expect(statusX).to.be.lessThan(gapStart);
			expect(edgeX).to.eq(gapStart);
			expect(edgeX - statusX).to.eq(cellWidth);
		});
	});
});
