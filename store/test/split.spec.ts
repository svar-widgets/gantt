import { describe, expect, test } from "vitest";
import { IParsedTask } from "../src/types";
import { DataStore, parseTaskDates } from "../src/index";
import { writable } from "svelte/store";
import { getData } from "./stubs/data";

function getDataStore(data) {
	const store = new DataStore(writable);
	parseTaskDates(data.tasks, {});
	store.init({
		...data,
		splitTasks: true,
	});
	return store;
}

describe("split tasks", () => {
	test("supports split-task action for a task", () => {
		const store = getDataStore(getData("pretty"));
		const { tasks } = store.getState();
		let task: IParsedTask = tasks.byId(20);
		const { start, end, duration } = task;
		store.in.exec("split-task", { id: 20 });
		task = tasks.byId(20);
		const { start: start2, end: end2, duration: duration2 } = task;
		expect(task.segments.length).toBe(2);
		expect(start.valueOf()).toBe(start2.valueOf());
		expect(end.valueOf()).not.toBe(end2.valueOf());
		expect(duration).toBe(duration2);
		expect(task.segments[1].end.valueOf()).toBe(end2.valueOf());
	});
	test("supports split-task action for a split segment", () => {
		const store = getDataStore(getData("pretty"));
		const { tasks } = store.getState();
		let task = tasks.byId(20);
		const { start, end, duration } = task;
		store.in.exec("split-task", { id: 20 });
		store.in.exec("split-task", { id: 20, segmentIndex: 0 });
		task = tasks.byId(20);
		const { start: start2, end: end2, duration: duration2 } = task;
		expect(task.segments.length).toBe(3);
		expect(start.valueOf()).toBe(start2.valueOf());
		expect(end.valueOf()).not.toBe(end2.valueOf());
		expect(duration).toBe(duration2);
	});
	test("supports merge segments when there is not gap between them", () => {
		const store = getDataStore(getData("pretty"));
		const { tasks } = store.getState();
		store.in.exec("split-task", { id: 20 });
		store.in.exec("split-task", { id: 20, segmentIndex: 0 });
		let task = tasks.byId(20);
		expect(task.segments.length).toBe(3);
		store.in.exec("update-task", {
			id: 20,
			segmentIndex: 0,
			task: { end: new Date(2024, 3, 4) },
		});
		task = tasks.byId(20);
		expect(task.segments.length).toBe(2);
		store.in.exec("update-task", {
			id: 20,
			segmentIndex: 1,
			task: { start: new Date(2024, 3, 5) },
		});
		task = tasks.byId(20);
		expect(task.segments).toBe(null);
	});
	test("adjust segments on start/end split task update", () => {
		const store = getDataStore(getData("pretty"));
		const { tasks } = store.getState();
		store.in.exec("split-task", { id: 20 });
		store.in.exec("split-task", { id: 20, segmentIndex: 0 });
		let task = tasks.byId(20);
		expect(task.segments.length).toBe(3);
		expect(task.duration).toBe(4);
		store.in.exec("update-task", {
			id: 20,
			task: { end: new Date(2024, 3, 7) },
		});
		task = tasks.byId(20);
		expect(task.segments.length).toBe(3);
		expect(task.duration).toBe(3);
		expect(task.segments[2].end.valueOf()).toBe(task.end.valueOf());
		store.in.exec("update-task", {
			id: 20,
			task: { end: new Date(2024, 3, 6) },
		});
		task = tasks.byId(20);
		expect(task.segments.length).toBe(2);
		expect(task.duration).toBe(3);
		expect(task.segments[1].end.valueOf()).toBe(task.end.valueOf());
		store.in.exec("update-task", {
			id: 20,
			task: { start: new Date(2024, 3, 3) },
		});
		task = tasks.byId(20);
		expect(task.segments.length).toBe(2);
		expect(task.duration).toBe(3);
		expect(task.segments[0].start.valueOf()).toBe(task.start.valueOf());
	});
	test("delete segments via update-task action", () => {
		const store = getDataStore(getData("pretty"));
		const { tasks } = store.getState();
		store.in.exec("split-task", { id: 20 });
		store.in.exec("split-task", { id: 20, segmentIndex: 0 });
		let task = tasks.byId(20);
		let { segments } = task;
		segments = segments.filter((s, i) => !!i);
		store.in.exec("update-task", {
			id: 20,
			task: { segments },
		});
		task = tasks.byId(20);
		expect(task.segments.length).toBe(2);
		expect(task.start.valueOf()).toBe(segments[0].start.valueOf());
		segments = segments.filter((s, i) => !i);
		store.in.exec("update-task", {
			id: 20,
			task: { segments },
		});
		task = tasks.byId(20);
		expect(task.segments).toBe(null);
	});
});
