import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import { DataStore } from "../src/index";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";
import type { ITask, IGroupByConfig } from "../src/types";

let store: DataStore;

// group by "type": 10 is a task, 20 is a milestone -> different groups
const tasks: ITask[] = [
	{
		id: 10,
		text: "A task",
		type: "task",
		parent: 0,
		start: new Date(2026, 3, 1),
		end: new Date(2026, 3, 4),
	},
	{
		id: 11,
		text: "Another task",
		type: "task",
		parent: 0,
		start: new Date(2026, 3, 5),
		end: new Date(2026, 3, 8),
	},
	{
		id: 20,
		text: "A milestone",
		type: "milestone",
		parent: 0,
		start: new Date(2026, 3, 10),
		end: new Date(2026, 3, 10),
	},
] as ITask[];

function init() {
	store = new DataStore(writable);
	store.init({
		...getData(),
		tasks,
		groupBy: { field: "type" } as IGroupByConfig,
	} as any);
}

const delay = () => vi.advanceTimersByTime(1);
const typeOf = (id: number) => store.getState().tasks.byId(id)?.type;

beforeEach(() => {
	vi.useFakeTimers();
	init();
});
afterEach(() => vi.useRealTimers());

describe("cross-group move-task under grouping", () => {
	test("DnD (with inProgress) writes the group value back", () => {
		// drag task 10 to sit after milestone 20 -> should become a milestone
		store.in.exec("move-task", {
			id: 10,
			mode: "after",
			target: 20,
			inProgress: true,
		} as any);
		store.in.exec("move-task", { id: 10, inProgress: false } as any);
		delay();

		expect(typeOf(10)).toBe("milestone");
	});

	// programmatic move-task under grouping is not a supported entry point:
	// menu and toolbar strip every move action, so only custom code gets here
	test("programmatic (no inProgress) does not write the group value", () => {
		store.in.exec("move-task", {
			id: 10,
			mode: "after",
			target: 20,
		} as any);
		delay();

		expect(typeOf(10)).toBe("task");
	});
});

describe("move modes under grouping", () => {
	test("mode 'up' is rejected outright (no write-back, no move)", () => {
		const ev: any = { id: 20, mode: "up" };
		store.in.exec("move-task", ev);
		delay();

		expect(ev.skipProvider).toBe(true);
		expect(typeOf(20)).toBe("milestone");
	});

	test("mode 'child' is rejected outright", () => {
		const ev: any = { id: 10, mode: "child", target: 20 };
		store.in.exec("move-task", ev);
		delay();

		expect(ev.skipProvider).toBe(true);
		expect(typeOf(10)).toBe("task");
	});
});
