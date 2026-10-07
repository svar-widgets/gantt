import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import { DataStore } from "../src/index";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";
import type { ITask, IGroupByConfig } from "../src/types";

let store: DataStore;

const tasks: ITask[] = [
	{
		id: 10,
		text: "Two days",
		type: "task",
		parent: 0,
		start: new Date(2026, 3, 1),
		end: new Date(2026, 3, 3), // duration 2
	},
	{
		id: 20,
		text: "Three days",
		type: "task",
		parent: 0,
		start: new Date(2026, 3, 6),
		end: new Date(2026, 3, 9), // duration 3
	},
] as ITask[];

function init() {
	store = new DataStore(writable);
	store.init({
		...getData(),
		tasks,
		groupBy: { field: "duration" } as IGroupByConfig,
	} as any);
}

const delay = () => vi.advanceTimersByTime(1);
const taskOf = (id: number) => store.getState().tasks.byId(id);
const renderedOf = (id: number) =>
	store.getState()._tasks.find((t: any) => (t.$id ?? t.id) === id);

beforeEach(() => {
	vi.useFakeTimers();
	init();
});
afterEach(() => vi.useRealTimers());

describe("groupBy duration: move across groups", () => {
	test("baseline durations", () => {
		expect(taskOf(10).duration).toBe(2);
		expect(taskOf(20).duration).toBe(3);
	});

	test("moving into the duration-3 group", () => {
		store.in.exec("move-task", {
			id: 10,
			mode: "after",
			target: 20,
			inProgress: true,
		} as any);
		store.in.exec("move-task", { id: 10, inProgress: false } as any);
		delay();

		const t = taskOf(10);
		const before = new Date(2026, 3, 1);

		// the field is written back
		expect(t.duration).toBe(3);

		// ...but are the dates consistent with it?
		const days = Math.round(
			(t.end.valueOf() - t.start.valueOf()) / 86400000
		);
		expect(t.start.valueOf()).toBe(before.valueOf());
		expect(days).toBe(3); // <- fails if end was not recomputed

		// and does the rendered bar agree?
		const r = renderedOf(10);
		expect(r.$w).toBe(renderedOf(20).$w);
	});
});
