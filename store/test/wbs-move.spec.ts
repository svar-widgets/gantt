import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import { DataStore } from "../src/index";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";
import type { ITask } from "../src/types";

let store: DataStore;

const tasks: ITask[] = [
	{
		id: 1,
		text: "Parent",
		type: "summary",
		parent: 0,
		open: true,
		start: new Date(2026, 3, 1),
		end: new Date(2026, 3, 20),
	},
	{
		id: 10,
		text: "First child",
		type: "task",
		parent: 1,
		start: new Date(2026, 3, 1),
		end: new Date(2026, 3, 4),
	},
	{
		id: 11,
		text: "Second child",
		type: "task",
		parent: 1,
		start: new Date(2026, 3, 10),
		end: new Date(2026, 3, 12),
	},
	{
		id: 2,
		text: "Sibling",
		type: "task",
		parent: 0,
		start: new Date(2026, 3, 5),
		end: new Date(2026, 3, 8),
	},
] as ITask[];

function initStore() {
	store = new DataStore(writable);
	store.init({
		...getData(),
		tasks,
		wbs: true,
	} as any);
}

const delay = () => vi.advanceTimersByTime(1);
const wbsOf = (id: number) => store.getState().tasks.byId(id)?.$wbs;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("wbs after indent/outdent", () => {
	test("baseline codes are assigned on init", () => {
		initStore();
		expect(wbsOf(1)).toBe("1");
		expect(wbsOf(10)).toBe("1.1");
		expect(wbsOf(11)).toBe("1.2");
		expect(wbsOf(2)).toBe("2");
	});

	test("indent recalculates wbs", () => {
		initStore();
		// indent 11 under 10 -> becomes 1.1.1
		store.in.exec("indent-task", { id: 11, mode: true } as any);
		delay();

		expect(store.getState().tasks.byId(11).parent).toBe(10);
		expect(wbsOf(11)).toBe("1.1.1");
	});

	test("outdent recalculates wbs", () => {
		initStore();
		// outdent 10 out of 1 -> becomes a root task after 1
		store.in.exec("indent-task", { id: 10, mode: false } as any);
		delay();

		expect(store.getState().tasks.byId(10).parent).toBe(0);
		expect(wbsOf(10)).toBe("2");
		expect(wbsOf(2)).toBe("3");
		// former sibling shifts up inside the parent
		expect(wbsOf(11)).toBe("1.1");
	});

	test("plain move-task (reorder) recalculates wbs", () => {
		initStore();
		store.in.exec("move-task", {
			id: 2,
			mode: "before",
			target: 1,
		} as any);
		delay();

		expect(wbsOf(2)).toBe("1");
		expect(wbsOf(1)).toBe("2");
	});
});
