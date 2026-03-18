import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { DataStore } from "../src/index";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";
import { parseTaskDates } from "../src/normalizeDates";

let store: DataStore;

function resetState(dataType: Parameters<typeof getData>[0] = "range") {
	const data = getData(dataType);
	parseTaskDates(data.tasks, { durationUnit: "day" });
	store = new DataStore(writable);
	store.init({ ...data });
	vi.advanceTimersByTime(1);
}

describe("scroll to task with add-task or select-task action", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("select-task with focus: 'grid' scrolls to the task to make it visible", () => {
		resetState("range");

		const { cellHeight, _tasks } = store.getState();
		const chartHeight = cellHeight * 2;
		const scrollSize = 17;
		store.in.exec("resize-chart", {
			width: 1000,
			height: chartHeight,
			scrollSize,
		});

		const index = _tasks.findIndex(t => t.id === 20);
		expect(index).to.be.greaterThan(-1);

		store.in.exec("select-task", { id: 20, focus: "grid" });
		vi.advanceTimersByTime(1);

		const expected =
			index * cellHeight - chartHeight + cellHeight + scrollSize;
		expect(store.getState().scrollTop).to.eq(expected);
		expect(store.getState().focusTask.id).to.eq(20);
	});

	test("select-task scrolls up when the task is above viewport", () => {
		resetState("range");

		const { cellHeight } = store.getState();
		const chartHeight = cellHeight * 2;
		const scrollSize = 17;
		store.in.exec("resize-chart", {
			width: 1000,
			height: chartHeight,
			scrollSize,
		});

		store.in.exec("scroll-chart", { top: cellHeight * 10 });
		vi.advanceTimersByTime(1);
		expect(store.getState().scrollTop).to.eq(cellHeight * 10);

		store.in.exec("select-task", { id: 1 });
		vi.advanceTimersByTime(1);

		expect(store.getState().scrollTop).to.eq(0);
		expect(store.getState().focusTask).to.eq(null);
	});

	test("add-task with show:true scrolls to the new task", () => {
		resetState("range");

		const { cellHeight } = store.getState();
		const chartHeight = cellHeight * 2;
		const scrollSize = 17;
		store.in.exec("resize-chart", {
			width: 1000,
			height: chartHeight,
			scrollSize,
		});

		store.in.exec("add-task", {
			task: { id: 999, text: "New task" },
			show: true,
		});
		vi.advanceTimersByTime(1);

		const { tasks, scrollTop } = store.getState();
		const index = tasks.toArray().findIndex(t => t.id === 999);
		expect(index).to.be.greaterThan(-1);

		const expected =
			index * cellHeight - chartHeight + cellHeight + scrollSize;
		expect(scrollTop).to.eq(expected);
		expect(store.getState().focusTask).to.eq(null);
	});
	test("add-task with select:true scrolls to the new task", () => {
		resetState("range");

		const { cellHeight } = store.getState();
		const chartHeight = cellHeight * 2;
		const scrollSize = 17;
		store.in.exec("resize-chart", {
			width: 1000,
			height: chartHeight,
			scrollSize,
		});
		store.in.exec("scroll-chart", { top: cellHeight * 10 });

		store.in.exec("add-task", {
			target: 1,
			mode: "before",
			task: { id: 999, text: "New task" },
			select: true,
		});
		vi.advanceTimersByTime(1);

		const { tasks, scrollTop, focusTask } = store.getState();
		const index = tasks.toArray().findIndex(t => t.id === 999);
		expect(index).to.eq(0);

		expect(scrollTop).to.eq(0);
		expect(focusTask).to.eq(null);
	});
});
