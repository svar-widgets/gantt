import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { DataStore, parseTaskDates } from "../src/index";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";
import type { IResource } from "../src/types";

let store: DataStore;

const monday = new Date(2024, 0, 15);

function initStore(overrides: Record<string, unknown> = {}) {
	store = new DataStore(writable);
	store.init({ ...getData(), ...overrides });
	vi.advanceTimersByTime(1);
}

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
	vi.useRealTimers();
});

describe("calendars", () => {
	describe("initialization", () => {
		test("builds _calendars from calendars config", () => {
			initStore();

			expect(Object.keys(store.getState()._calendars!)).toEqual([
				"default",
				"wednesday-off",
			]);
		});

		test("calendar tid sets global to registry entry", () => {
			initStore({ calendar: "default" });

			expect(store.getCalendar()).toBe(store.getCalendar("default"));
		});
	});

	describe("getCalendar", () => {
		beforeEach(() => initStore({ calendar: "default" }));

		test("returns registry entry by id", () => {
			const wed = store.getCalendar("wednesday-off");
			expect(wed!.getWorkingHours(new Date(2024, 0, 17))).to.eq(0);
		});

		test("falls back to global when id is missing", () => {
			expect(store.getCalendar("missing")).toBe(store.getCalendar());
		});
	});

	describe("getTaskCalendar", () => {
		test("returns calendar for task.calendar", () => {
			initStore();
			const task = { calendar: "wednesday-off" as const };

			expect(store.getTaskCalendar(task)).toBe(
				store.getCalendar("wednesday-off")
			);
		});
	});

	describe("getResourceCalendar", () => {
		test("returns calendar for resource.calendar", () => {
			initStore();
			const resource: IResource = {
				id: "r1",
				name: "Bob",
				calendar: "wednesday-off",
			};

			expect(store.getResourceCalendar(resource)).toBe(
				store.getCalendar("wednesday-off")
			);
		});
	});

	describe("task duration", () => {
		test("uses global calendar for end date", () => {
			initStore({ calendar: "default" });
			const task = { id: 1, text: "Task", start: monday, duration: 5 };
			const cal = store.getCalendar()!;

			parseTaskDates(
				[task],
				{ durationUnit: "day", splitTasks: false },
				store.getTaskCalendar.bind(store)
			);

			expect(task.duration).to.eq(5);
			expect(task.end).toEqual(cal.addWorkingDays(monday, 5, true));
		});

		test("uses task calendar for end date", () => {
			initStore();
			const task = {
				id: 1,
				text: "Task",
				start: monday,
				duration: 5,
				calendar: "wednesday-off",
			};
			const cal = store.getCalendar("wednesday-off")!;

			parseTaskDates(
				[task],
				{ durationUnit: "day", splitTasks: false },
				store.getTaskCalendar.bind(store)
			);

			expect(task.duration).to.eq(5);
			expect(task.end).toEqual(cal.addWorkingDays(monday, 5, true));
			expect(task.end!.getTime()).to.be.greaterThan(
				store
					.getCalendar("default")!
					.addWorkingDays(monday, 5, true)
					.getTime()
			);
		});
	});

	describe("moving a summary with mixed-calendar children", () => {
		test("snaps a child off its own non-working day", () => {
			// summary (no calendar) with two children sharing a start day;
			// one child uses the registry's wednesday-off calendar
			const taskData = [
				{
					id: 1,
					text: "Summary",
					type: "summary",
					parent: 0,
					open: true,
				},
				{
					id: 2,
					text: "Child / default",
					type: "task",
					parent: 1,
					start: new Date(2024, 0, 15),
					end: new Date(2024, 0, 16),
				},
				{
					id: 3,
					text: "Child / wednesday-off",
					type: "task",
					parent: 1,
					calendar: "wednesday-off",
					start: new Date(2024, 0, 15),
					end: new Date(2024, 0, 16),
				},
			];

			initStore({ tasks: taskData, links: [], calendar: "default" });
			const { tasks } = store.getState();

			// drag the summary 2 working days forward: Mon Jan 15 -> Wed Jan 17
			store.in.exec("update-task", {
				id: 1,
				task: {
					start: new Date(2024, 0, 15),
					end: new Date(2024, 0, 16),
				},
				diff: 2,
			});
			vi.advanceTimersByTime(1);

			// child on the global "default" calendar: Wed is a working day
			expect(tasks.byId(2).start).to.deep.eq(new Date(2024, 0, 17));

			// child on "wednesday-off" would land on its own non-working
			// Wednesday, so it is snapped forward to Thursday
			expect(tasks.byId(3).start).to.deep.eq(new Date(2024, 0, 18));
		});
	});
});
