import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { DataStore } from "../src/index";
import { normalizeDates } from "../src/normalizeDates";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";
import type { GanttCalendarConfig, IResource, ITask } from "../src/types";
import { CompositeCalendar } from "../src/pro/CompositeCalendar";
import { adjustToWorkingDay, getAdder } from "../src/time";

let store: DataStore;

const monday = new Date(2024, 0, 15);

function initStore(overrides: Record<string, unknown> = {}) {
	store = new DataStore(writable);
	const config = { ...getData(), ...overrides };
	store.init({ ...config });
	vi.advanceTimersByTime(1);
	return config;
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

			expect([...store.getState()._calendars!.keys()]).toEqual([
				"default",
				"wednesday-off",
				"part-time",
				"weekends",
			]);
		});

		test("a numeric calendar id keeps its type", () => {
			initStore({
				calendars: [{ id: 1, weekHours: { monday: 4 } }],
				calendar: 1,
			});

			expect(store.getCalendar()).toBe(store.getCalendar(1));
			const [cal] = store.serialize({ data: "calendars" }) as any[];
			expect(cal.id).toBe(1);
		});

		test("calendar tid sets global to registry entry", () => {
			initStore({ calendar: "default" });

			expect(store.getCalendar()).toBe(store.getCalendar("default"));
		});

		test("relinks registry-backed global when calendars change", () => {
			const config = initStore({ calendar: "default" });
			const previousGlobal = store.getCalendar();
			const calendars = config.calendars.map(
				(calendar: GanttCalendarConfig) =>
					calendar.id === "default"
						? {
								...calendar,
								weekHours: {
									...calendar.weekHours,
									monday: 4,
								},
							}
						: calendar
			);

			store.init({ ...config, calendars });
			vi.advanceTimersByTime(1);

			expect(store.getCalendar()).toBe(store.getCalendar("default"));
			expect(store.getCalendar()).not.toBe(previousGlobal);
			expect(store.getCalendar()!.getWorkingHours(monday)).to.eq(4);
		});

		test("relinks registry-backed global when an update carries only calendars", () => {
			const config = initStore({ calendar: "default" });
			const previousGlobal = store.getCalendar();

			store.init({
				calendars: config.calendars.map(
					(calendar: GanttCalendarConfig) => ({ ...calendar })
				),
			});
			vi.advanceTimersByTime(1);

			expect(store.getCalendar()).toBe(store.getCalendar("default"));
			expect(store.getCalendar()).not.toBe(previousGlobal);
		});

		test("empties the registry when calendars become empty", () => {
			const config = initStore();

			store.init({ ...config, calendars: [] });
			vi.advanceTimersByTime(1);

			expect(store.getState()._calendars.size).toBe(0);
			expect(store.getCalendar("default")).toBeUndefined();
		});

		test("drops the global calendar when calendar is unset", () => {
			const config = initStore({ calendar: true });
			expect(store.getCalendar()).toBeDefined();

			store.init({ ...config, calendar: false });
			vi.advanceTimersByTime(1);

			expect(store.getCalendar()).toBeUndefined();
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

		describe("composite calendar degenerate cases", () => {
			test("resourceCalendars false ignores assignments", () => {
				initStore({
					schedule: { resourceCalendars: false },
					resources: [
						{ id: "r1", name: "Alex", calendar: "wednesday-off" },
					],
					assignments: [{ id: 1, task: 1, resource: "r1" }],
					tasks: [
						{
							id: 1,
							text: "Task",
							start: monday,
							duration: 5,
							type: "task",
							parent: 0,
							calendar: "default",
						},
					],
					links: [],
				});

				const task = store.getState().tasks.byId(1);
				const cal = store.getTaskCalendar(task);
				expect(cal).toBe(store.getCalendar("default"));
				expect(cal).not.toBeInstanceOf(CompositeCalendar);
			});

			test("no assignments returns task.calendar", () => {
				initStore({
					schedule: { resourceCalendars: true },
					resources: [{ id: "r1", name: "Alex" }],
					assignments: [],
					tasks: [
						{
							id: 1,
							text: "Task",
							start: monday,
							duration: 5,
							type: "task",
							parent: 0,
							calendar: "wednesday-off",
						},
					],
					links: [],
				});

				const task = store.getState().tasks.byId(1);
				const cal = store.getTaskCalendar(task);
				expect(cal).toBe(store.getCalendar("wednesday-off"));
				expect(cal).not.toBeInstanceOf(CompositeCalendar);
			});

			test("only unconstrained resource without global returns task.calendar", () => {
				initStore({
					schedule: { resourceCalendars: true },
					resources: [{ id: "bob", name: "Bob" }],
					assignments: [{ id: 1, task: 1, resource: "bob" }],
					tasks: [
						{
							id: 1,
							text: "Task",
							start: monday,
							duration: 5,
							type: "task",
							parent: 0,
							calendar: "wednesday-off",
						},
					],
					links: [],
				});

				const task = store.getState().tasks.byId(1);
				const cal = store.getTaskCalendar(task);
				expect(cal).toBe(store.getCalendar("wednesday-off"));
				expect(cal).not.toBeInstanceOf(CompositeCalendar);
			});
		});

		describe("composite calendar factory", () => {
			test("no task.calendar uses resource union only", () => {
				const wednesday = new Date(2024, 0, 17);
				const friday = new Date(2024, 0, 19);

				initStore({
					schedule: { resourceCalendars: true },
					resources: [
						{ id: "r1", name: "Alex", calendar: "wednesday-off" },
					],
					assignments: [{ id: 1, task: 1, resource: "r1" }],
					tasks: [
						{
							id: 1,
							text: "Task",
							start: monday,
							duration: 5,
							type: "task",
							parent: 0,
						},
					],
					links: [],
				});

				const task = store.getState().tasks.byId(1);
				const cal = store.getTaskCalendar(task);

				expect(cal).toBeInstanceOf(CompositeCalendar);
				expect(cal).not.toBe(store.getCalendar("wednesday-off"));
				expect(cal!.getWorkingHours(wednesday)).to.eq(0);
				expect(cal!.getWorkingHours(friday)).to.eq(8);
			});

			test("composite calendar unions unconstrained resource via global calendar", () => {
				const wednesday = new Date(2024, 0, 17);

				initStore({
					calendar: "default",
					schedule: { resourceCalendars: true },
					resources: [
						{
							id: "alice",
							name: "Alice",
							calendar: "wednesday-off",
						},
						{ id: "bob", name: "Bob" },
					],
					assignments: [
						{ id: 1, task: 1, resource: "alice" },
						{ id: 2, task: 1, resource: "bob" },
					],
					tasks: [
						{
							id: 1,
							text: "Sprint",
							start: monday,
							duration: 10,
							type: "task",
							parent: 0,
						},
					],
					links: [],
				});

				const task = store.getState().tasks.byId(1);
				const cal = store.getTaskCalendar(task);

				expect(cal).toBeInstanceOf(CompositeCalendar);
				expect(cal!.isWorkingDay(wednesday)).to.eq(true);
				expect(cal!.getWorkingHours(wednesday)).to.eq(8);
			});
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

			normalizeDates(
				task,
				{ durationUnit: "day", splitTasks: false },
				store.getTaskCalendar(task)
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

			normalizeDates(
				task,
				{ durationUnit: "day", splitTasks: false },
				store.getTaskCalendar(task)
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

		test.each([
			["without auto scheduling", {}],
			["with auto scheduling", { auto: true }],
		])(
			"snaps children and re-derives a summary without a calendar %s",
			(_, schedule) => {
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
						text: "Child A",
						type: "task",
						parent: 1,
						calendar: "wednesday-off",
						start: new Date(2024, 0, 15),
						end: new Date(2024, 0, 16),
					},
					{
						id: 3,
						text: "Child B",
						type: "task",
						parent: 1,
						calendar: "wednesday-off",
						start: new Date(2024, 0, 16),
						end: new Date(2024, 0, 17),
					},
				];

				initStore({
					tasks: taskData,
					links: [],
					calendar: null,
					schedule,
				});
				const { tasks } = store.getState();

				// Mon Jan 15 -> Wed Jan 17, a non-working day for both children
				store.in.exec("update-task", {
					id: 1,
					task: {
						start: new Date(2024, 0, 15),
						end: new Date(2024, 0, 17),
					},
					diff: 2,
				});
				vi.advanceTimersByTime(10);

				expect(tasks.byId(2).start).to.deep.eq(new Date(2024, 0, 18));
				expect(tasks.byId(3).start).to.deep.eq(new Date(2024, 0, 18));
				expect(tasks.byId(1).start).to.deep.eq(new Date(2024, 0, 18));
				expect(tasks.byId(1).end).to.deep.eq(new Date(2024, 0, 19));
			}
		);

		test("re-derives a nested summary after its children snap", () => {
			const taskData = [
				{
					id: 1,
					text: "Summary",
					type: "summary",
					parent: 0,
					open: true,
				},
				{
					id: 10,
					text: "Nested summary",
					type: "summary",
					parent: 1,
					open: true,
				},
				{
					id: 2,
					text: "Child A",
					type: "task",
					parent: 10,
					calendar: "wednesday-off",
					start: new Date(2024, 0, 15),
					end: new Date(2024, 0, 16),
				},
				{
					id: 3,
					text: "Child B",
					type: "task",
					parent: 10,
					calendar: "wednesday-off",
					start: new Date(2024, 0, 16),
					end: new Date(2024, 0, 17),
				},
				{
					id: 4,
					text: "Child C",
					type: "task",
					parent: 1,
					start: new Date(2024, 0, 15),
					end: new Date(2024, 0, 16),
				},
			];

			initStore({ tasks: taskData, links: [], calendar: "default" });
			const { tasks } = store.getState();

			// Mon Jan 15 -> Wed Jan 17, a non-working day for the nested children
			store.in.exec("update-task", {
				id: 1,
				task: {
					start: new Date(2024, 0, 15),
					end: new Date(2024, 0, 17),
				},
				diff: 2,
			});
			vi.advanceTimersByTime(10);

			expect(tasks.byId(4).start).to.deep.eq(new Date(2024, 0, 17));
			expect(tasks.byId(2).start).to.deep.eq(new Date(2024, 0, 18));
			expect(tasks.byId(10).start).to.deep.eq(new Date(2024, 0, 18));
			expect(tasks.byId(10).end).to.deep.eq(new Date(2024, 0, 19));
			expect(tasks.byId(1).start).to.deep.eq(new Date(2024, 0, 17));
			expect(tasks.byId(1).end).to.deep.eq(new Date(2024, 0, 19));
		});

		test("sends the re-derived span of a nested summary", () => {
			const taskData = [
				{
					id: 1,
					text: "Summary",
					type: "summary",
					parent: 0,
					open: true,
				},
				{
					id: 10,
					text: "Nested summary",
					type: "summary",
					parent: 1,
					open: true,
				},
				{
					id: 2,
					text: "Child / default",
					type: "task",
					parent: 10,
					start: new Date(2024, 0, 15),
					end: new Date(2024, 0, 16),
				},
				{
					id: 3,
					text: "Child / wednesday-off",
					type: "task",
					parent: 10,
					calendar: "wednesday-off",
					start: new Date(2024, 0, 15),
					end: new Date(2024, 0, 16),
				},
			];

			initStore({ tasks: taskData, links: [], calendar: "default" });
			const { tasks } = store.getState();
			const updates: any[] = [];
			store.in.on("update-task", (ev: any) => {
				if (ev.id === 10) updates.push(ev);
			});

			// Mon Jan 15 -> Wed Jan 17; the wednesday-off child snaps to Thursday
			store.in.exec("update-task", {
				id: 1,
				task: {
					start: new Date(2024, 0, 15),
					end: new Date(2024, 0, 16),
				},
				diff: 2,
			});
			vi.advanceTimersByTime(10);

			// shifting the nested summary by its own calendar alone ends it on Thursday
			expect(tasks.byId(10).start).to.deep.eq(new Date(2024, 0, 17));
			expect(tasks.byId(10).end).to.deep.eq(new Date(2024, 0, 19));

			updates.forEach(ev => expect(ev.skipProvider).to.eq(undefined));
			const last = updates[updates.length - 1];
			expect(last.eventSource).to.eq("update-task");
			expect(last.task.start).to.deep.eq(new Date(2024, 0, 17));
			expect(last.task.end).to.deep.eq(new Date(2024, 0, 19));
		});
	});

	describe("composite calendars", () => {
		test("composite calendar calculates overlap correctly", () => {
			initStore();

			const compositeCalendar = new CompositeCalendar(
				store.getCalendar("wednesday-off"),
				[store.getCalendar("default")]
			);

			const wednesday = new Date(2024, 0, 17);
			const friday = new Date(2024, 0, 19);
			const saturday = new Date(2024, 0, 20);
			expect(compositeCalendar.getWorkingHours(wednesday)).to.eq(0);
			expect(compositeCalendar.getWorkingHours(friday)).to.eq(8);
			expect(compositeCalendar.getWorkingHours(saturday)).to.eq(0);
		});
		test("composite calendar uses max working hours of resources", () => {
			initStore();

			const compositeCalendar = new CompositeCalendar(null, [
				store.getCalendar("default"),
				store.getCalendar("part-time"),
			]);

			const wednesday = new Date(2024, 0, 17);
			expect(compositeCalendar.getWorkingHours(wednesday)).to.eq(8);
		});

		test("composite calendar unions resource working days", () => {
			initStore();

			const compositeCalendar = new CompositeCalendar(
				store.getCalendar("default"),
				[
					store.getCalendar("wednesday-off"),
					store.getCalendar("part-time"),
				]
			);

			const wednesday = new Date(2024, 0, 17);
			expect(compositeCalendar.getWorkingHours(wednesday)).to.eq(8);
		});

		test("disjoint calendars report it and answer as the own calendar", () => {
			initStore();

			const own = store.getCalendar("weekends")!;
			const compositeCalendar = new CompositeCalendar(own, [
				store.getCalendar("default"),
			]);

			const wednesday = new Date(2024, 0, 17);
			const saturday = new Date(2024, 0, 20);
			expect(compositeCalendar.noWorkingTime).to.eq(true);
			expect(compositeCalendar.getWorkingHours(wednesday)).to.eq(
				own.getWorkingHours(wednesday)
			);
			expect(compositeCalendar.getWorkingHours(saturday)).to.eq(
				own.getWorkingHours(saturday)
			);
		});

		test("search with no shared working day answers with the own calendar", () => {
			initStore();

			const taskCalendar = store.getCalendar("weekends");
			const compositeCalendar = new CompositeCalendar(taskCalendar, [
				store.getCalendar("default"),
			]);
			const saturday = new Date(2024, 0, 20);

			expect(compositeCalendar.getNextWorkingDay(saturday)).to.deep.eq(
				taskCalendar.getNextWorkingDay(saturday)
			);
			expect(
				compositeCalendar.getPreviousWorkingDay(saturday)
			).to.deep.eq(taskCalendar.getPreviousWorkingDay(saturday));
			expect(
				compositeCalendar.addWorkingDays(saturday, 2, true)
			).to.deep.eq(taskCalendar.addWorkingDays(saturday, 2, true));
			expect(compositeCalendar.addWorkingHours(saturday, 16)).to.deep.eq(
				taskCalendar.addWorkingHours(saturday, 16)
			);
		});

		test("search with no shared working day and no own calendar uses raw days", () => {
			initStore();

			const compositeCalendar = new CompositeCalendar(null, []);

			expect(compositeCalendar.getNextWorkingDay(monday)).to.deep.eq(
				new Date(2024, 0, 16)
			);
			expect(
				compositeCalendar.addWorkingDays(monday, 5, true)
			).to.deep.eq(new Date(2024, 0, 20));
		});

		test("snapping with no shared working day follows the own calendar", () => {
			initStore();

			const taskCalendar = store.getCalendar("default");
			const blocked = taskCalendar.clone();
			blocked.addRule({
				type: "range",
				start: "2022-01-01",
				end: "2026-01-01",
				hours: 0,
			});
			const compositeCalendar = new CompositeCalendar(taskCalendar, [
				blocked,
			]);
			const saturday = new Date(2024, 0, 20);

			expect(adjustToWorkingDay(monday, 1, compositeCalendar)).toBe(
				monday
			);
			expect(
				adjustToWorkingDay(saturday, 1, compositeCalendar)
			).to.deep.eq(new Date(2024, 0, 22));
			expect(
				adjustToWorkingDay(saturday, -1, compositeCalendar)
			).to.deep.eq(new Date(2024, 0, 19));
			expect(getAdder("day", compositeCalendar)(monday, 5)).to.deep.eq(
				taskCalendar.addWorkingDays(monday, 5, true)
			);
		});

		test("search keeps shared working days when they exist", () => {
			initStore();

			const compositeCalendar = new CompositeCalendar(
				store.getCalendar("wednesday-off"),
				[store.getCalendar("default")]
			);
			const tuesday = new Date(2024, 0, 16);

			expect(compositeCalendar.getNextWorkingDay(tuesday)).to.deep.eq(
				new Date(2024, 0, 18)
			);
		});
	});

	describe("empty overlap by weekly pattern", () => {
		const tasks = [
			{
				id: 1,
				text: "A",
				start: new Date(2024, 0, 20),
				duration: 2,
				type: "task",
				parent: 0,
				calendar: "weekends",
			},
		];
		const assignments = [{ id: 1, task: 1, resource: "r1" }];

		let config: Record<string, unknown>;
		function initWith(resourceCalendar: GanttCalendarConfig) {
			config = initStore({
				calendars: [...getData().calendars, resourceCalendar],
				schedule: { resourceCalendars: true },
				resources: [{ id: "r1", name: "Alex", calendar: "res" }],
				assignments,
				tasks,
				links: [],
			});
			return store.getTaskCalendar(store.getState().tasks.byId(1));
		}

		const weekdays = {
			monday: 8,
			tuesday: 8,
			wednesday: 8,
			thursday: 8,
			friday: 8,
			saturday: 0,
			sunday: 0,
		};

		test("no shared weekday answers as the own calendar and reports it", () => {
			const calendar = initWith({ id: "res", weekHours: weekdays })!;
			const own = store.getCalendar("weekends")!;
			const saturday = new Date(2024, 0, 20);

			expect(calendar.noWorkingTime).to.eq(true);
			expect(calendar.isWorkingDay(saturday)).to.eq(
				own.isWorkingDay(saturday)
			);
		});

		test("shared weekday resolves to a composite", () => {
			const calendar = initWith({
				id: "res",
				weekHours: { ...weekdays, saturday: 8 },
			});

			expect(calendar).toBeInstanceOf(CompositeCalendar);
		});

		test("a member's addRule reaches the overlap on tasks reload", () => {
			expect(
				initWith({ id: "res", weekHours: weekdays })!.noWorkingTime
			).to.eq(true);

			store.getCalendar("res")!.addRule({
				type: "weekday",
				weekday: "saturday",
				hours: 8,
			});
			const current = () =>
				store.getTaskCalendar(store.getState().tasks.byId(1))!
					.noWorkingTime;
			expect(current()).to.eq(true);

			store.init({
				...config,
				tasks: tasks.map(t => ({ ...t, text: "B" })),
			});
			vi.advanceTimersByTime(1);
			expect(current()).to.eq(false);
		});

		test("a member's addRule reaches a cached composite's day answers", () => {
			const calendar = initWith({
				id: "res",
				weekHours: { ...weekdays, saturday: 8 },
			})!;
			const sunday = new Date(2024, 0, 21);
			expect(calendar.isWorkingDay(sunday)).to.eq(false);

			store.getCalendar("res")!.addRule({
				type: "weekday",
				weekday: "sunday",
				hours: 8,
			});

			expect(
				store
					.getTaskCalendar(store.getState().tasks.byId(1))!
					.isWorkingDay(sunday)
			).to.eq(true);
		});

		test("every-week weekday rule counts as pattern", () => {
			const calendar = initWith({
				id: "res",
				weekHours: weekdays,
				rules: [{ type: "weekday", weekday: "sunday", hours: 8 }],
			});

			expect(calendar).toBeInstanceOf(CompositeCalendar);
		});

		test("a date rule within the search limit of today creates the overlap", () => {
			vi.setSystemTime(new Date(2024, 0, 15));
			const available = (start: string, end: string) =>
				initWith({
					id: "res",
					weekHours: weekdays,
					rules: [{ type: "range", start, end, hours: 8 }],
				})!.noWorkingTime;

			expect(available("2024-06-01", "2024-06-30")).to.eq(false);
			expect(available("2023-06-01", "2023-06-30")).to.eq(false);
			expect(available("2026-06-01", "2026-06-30")).to.eq(true);
		});

		test("a holiday does not cancel a weekly overlap", () => {
			const withHoliday = initWith({
				id: "res",
				weekHours: { ...weekdays, saturday: 8 },
				rules: [{ type: "date", date: "2024-01-20", hours: 0 }],
			});
			expect(withHoliday!.noWorkingTime).to.eq(false);
		});
	});

	describe("marking the task", () => {
		const leave = (end: string) => ({
			id: "leave",
			rules: [{ type: "range", start: "2027-01-01", end, hours: 0 }],
		});
		const task = (duration: number, start = new Date(2026, 11, 1)) => ({
			id: 1,
			text: "A",
			start,
			duration,
			type: "task",
			parent: 0,
		});

		function initWith(calendar: GanttCalendarConfig, duration: number) {
			initStore({
				calendars: [...getData().calendars, calendar],
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources: [{ id: "r1", name: "Alex", calendar: calendar.id }],
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				tasks: [task(duration)],
				links: [],
				undo: true,
			});
			return store.getState().tasks.byId(1);
		}

		test("assigning a contractor available only by dates moves the task into the window", () => {
			vi.setSystemTime(new Date(2026, 8, 22));
			initStore({
				calendars: [
					...getData().calendars,
					{
						id: "contractor",
						weekHours: {
							monday: 0,
							tuesday: 0,
							wednesday: 0,
							thursday: 0,
							friday: 0,
							saturday: 0,
							sunday: 0,
						},
						rules: [
							{
								type: "range",
								start: "2027-02-01",
								end: "2027-02-26",
								hours: 8,
							},
						],
					},
				],
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources: [{ id: "c", name: "Chris", calendar: "contractor" }],
				assignments: [],
				tasks: [task(5, new Date(2027, 0, 11))],
				links: [],
			});

			store.in.exec("add-assignment", {
				assignment: { task: 1, resource: "c" },
			});
			vi.advanceTimersByTime(1);

			const t = store.getState().tasks.byId(1);
			expect(t.start).toEqual(new Date(2027, 1, 1));
			expect(t.end).toEqual(new Date(2027, 1, 6));
			expect(t.$noWorkingTime).to.eq(false);
		});

		test("empty overlap marks the task", () => {
			const t = initWith(
				{
					id: "leave",
					weekHours: {
						monday: 0,
						tuesday: 0,
						wednesday: 0,
						thursday: 0,
						friday: 0,
						saturday: 8,
						sunday: 8,
					},
				},
				5
			);
			expect(t.$noWorkingTime).to.eq(true);
		});

		test("a leave within the search limit pauses the task unmarked", () => {
			const t = initWith(leave("2027-03-31"), 30);
			expect(t.end > new Date(2027, 3, 1)).to.eq(true);
			expect(t.$noWorkingTime).to.eq(false);
		});

		test("a span beyond the search limit marks the task", () => {
			expect(initWith(leave("2027-03-31"), 200).$noWorkingTime).to.eq(
				true
			);
		});

		test("a start inside a leave beyond the search limit marks the task", () => {
			initStore({
				calendars: [...getData().calendars, leave("2028-06-30")],
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources: [{ id: "r1", name: "Alex", calendar: "leave" }],
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				tasks: [task(5, new Date(2027, 0, 4))],
				links: [],
			});
			expect(store.getState().tasks.byId(1).$noWorkingTime).to.eq(true);
		});

		test("leaving the composite clears the mark, undo restores it", () => {
			initWith(leave("2027-03-31"), 200);

			store.in.exec("delete-assignment", { id: 1 });
			vi.advanceTimersByTime(1);
			expect(store.getState().tasks.byId(1).$noWorkingTime).to.eq(
				undefined
			);

			store.in.exec("undo");
			vi.advanceTimersByTime(1);
			expect(store.getState().tasks.byId(1).$noWorkingTime).to.eq(true);
		});
	});

	describe("skipResourceCalendars", () => {
		const leave = {
			id: "leave",
			rules: [
				{
					type: "range",
					start: "2027-01-01",
					end: "2027-03-31",
					hours: 0,
				},
			],
		};

		function initWith(task: Partial<ITask>, assignments = []) {
			initStore({
				calendars: [...getData().calendars, leave],
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources: [{ id: "r1", name: "Alex", calendar: "leave" }],
				assignments,
				tasks: [
					{
						id: 1,
						text: "A",
						start: new Date(2027, 0, 4),
						duration: 5,
						type: "task",
						parent: 0,
						...task,
					},
				],
				links: [],
				undo: true,
			});
		}

		test("resolves to the own calendar", () => {
			initWith({ skipResourceCalendars: true }, [
				{ id: 1, task: 1, resource: "r1" },
			]);
			const t = store.getState().tasks.byId(1);
			expect(store.getTaskCalendar(t)).toBe(store.getCalendar("default"));
			expect(t.end).toEqual(new Date(2027, 0, 9));
			expect(t.$noWorkingTime).to.eq(undefined);
		});

		test("toggling it aligns the task, undo restores", () => {
			initWith({}, [{ id: 1, task: 1, resource: "r1" }]);
			const { end } = store.getState().tasks.byId(1);
			expect(end > new Date(2027, 3, 1)).to.eq(true);

			store.in.exec("update-task", {
				id: 1,
				task: { skipResourceCalendars: true },
			});
			vi.advanceTimersByTime(1);
			expect(store.getState().tasks.byId(1).end).toEqual(
				new Date(2027, 0, 9)
			);

			store.in.exec("undo");
			vi.advanceTimersByTime(1);
			expect(store.getState().tasks.byId(1).end).toEqual(end);
		});

		test("setting it on an empty overlap clears the mark, undo restores it", () => {
			initStore({
				calendars: [
					...getData().calendars,
					{
						id: "weekend",
						weekHours: {
							monday: 0,
							tuesday: 0,
							wednesday: 0,
							thursday: 0,
							friday: 0,
							saturday: 8,
							sunday: 8,
						},
					},
				],
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources: [{ id: "r1", name: "Alex", calendar: "weekend" }],
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				tasks: [
					{
						id: 1,
						text: "A",
						start: new Date(2027, 0, 4),
						duration: 5,
						type: "task",
						parent: 0,
					},
				],
				links: [],
				undo: true,
			});
			const prev = store.getState().tasks.byId(1);
			expect(prev.$noWorkingTime).to.eq(true);

			// the editor sends the whole task, the old mark included
			store.in.exec("update-task", {
				id: 1,
				task: { ...prev, skipResourceCalendars: true },
			});
			vi.advanceTimersByTime(1);
			expect(store.getState().tasks.byId(1).$noWorkingTime).to.eq(
				undefined
			);

			store.in.exec("undo");
			vi.advanceTimersByTime(1);
			expect(store.getState().tasks.byId(1).$noWorkingTime).to.eq(true);
		});

		test("an assignment edit aligns nothing", () => {
			initWith({ skipResourceCalendars: true });

			store.in.exec("add-assignment", {
				assignment: { task: 1, resource: "r1" },
			});
			vi.advanceTimersByTime(1);

			const t = store.getState().tasks.byId(1);
			expect(t.start).toEqual(new Date(2027, 0, 4));
			expect(t.end).toEqual(new Date(2027, 0, 9));
		});
	});

	describe("composite calendars cache", () => {
		const resources: IResource[] = [
			{ id: "r1", name: "Alex", calendar: "default" },
			{ id: "r2", name: "Bob", calendar: "part-time" },
		];
		const tasks = [
			{
				id: 1,
				text: "A",
				start: monday,
				duration: 8,
				type: "task",
				parent: 0,
				calendar: "wednesday-off",
			},
			{
				id: 2,
				text: "B",
				start: monday,
				duration: 8,
				type: "task",
				parent: 0,
				calendar: "wednesday-off",
			},
		];

		test("shares composite for the same member set", () => {
			initStore({
				schedule: { resourceCalendars: true },
				resources,
				assignments: [
					{ id: 1, task: 1, resource: "r1" },
					{ id: 2, task: 2, resource: "r1" },
				],
				tasks,
				links: [],
			});

			const { tasks: storeTasks, _composites } = store.getState();
			const a = store.getTaskCalendar(storeTasks.byId(1));
			const b = store.getTaskCalendar(storeTasks.byId(2));

			expect(a).toBe(b);
			expect(_composites!.size).to.eq(1);
		});

		test("own calendar resolving to the global shares one key slot", () => {
			initStore({
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources,
				assignments: [
					{ id: 1, task: 1, resource: "r2" },
					{ id: 2, task: 2, resource: "r2" },
					{ id: 3, task: 3, resource: "r2" },
				],
				tasks: [
					{ ...tasks[0], calendar: undefined },
					{ ...tasks[1], calendar: "default" },
					{ ...tasks[0], id: 3, calendar: "missing" },
				],
				links: [],
			});

			const { tasks: storeTasks, _composites } = store.getState();
			const a = store.getTaskCalendar(storeTasks.byId(1));

			expect(store.getTaskCalendar(storeTasks.byId(2))).toBe(a);
			expect(store.getTaskCalendar(storeTasks.byId(3))).toBe(a);
			expect([..._composites!.keys()]).toEqual(["#part-time"]);
		});

		test("resets cache when tasks are reloaded", () => {
			const config = initStore({
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				tasks,
				links: [],
			});

			const first = store.getTaskCalendar(store.getState().tasks.byId(1));
			const composites = store.getState()._composites!;

			store.init({
				...config,
				tasks: tasks.map(t => ({ ...t, text: `${t.text}!` })),
			});
			vi.advanceTimersByTime(1);

			expect(store.getState()._composites).not.toBe(composites);
			expect(
				store.getTaskCalendar(store.getState().tasks.byId(1))
			).not.toBe(first);
		});

		test("keeps cache when tasks are unchanged", () => {
			const config = initStore({
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				tasks,
				links: [],
			});

			const composites = store.getState()._composites!;

			store.init({ ...config, cellHeight: 40 });
			vi.advanceTimersByTime(1);

			expect(store.getState()._composites).toBe(composites);
		});

		test("re-keys composite when assignment member set changes", () => {
			const calendars = getData().calendars;
			initStore({
				calendars,
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				tasks,
				links: [],
			});

			const cache = store.getState()._composites!;
			const first = store.getTaskCalendar(store.getState().tasks.byId(1));

			store.init({
				...getData(),
				calendars,
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r2" }],
				tasks,
				links: [],
			});
			vi.advanceTimersByTime(1);

			const second = store.getTaskCalendar(
				store.getState().tasks.byId(1)
			);
			expect(store.getState()._composites).toBe(cache);
			expect(second).not.toBe(first);
			expect(cache.size).to.eq(2);
		});

		test("resets cache when calendars config changes", () => {
			initStore({
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				tasks,
				links: [],
			});

			const first = store.getTaskCalendar(store.getState().tasks.byId(1));
			const composites = store.getState()._composites!;
			expect(composites.size).to.eq(1);

			store.init({
				...getData(),
				calendars: getData().calendars.map(c => ({ ...c })),
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				tasks,
				links: [],
			});
			vi.advanceTimersByTime(1);

			const next = store.getState()._composites!;
			expect(next.size).to.eq(1);
			expect(
				store.getTaskCalendar(store.getState().tasks.byId(1))
			).not.toBe(first);
		});

		test("resets cache when calendar config changes", () => {
			const calendars = getData().calendars;
			initStore({
				calendars,
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				tasks,
				links: [],
			});

			const first = store.getTaskCalendar(store.getState().tasks.byId(1));
			const composites = store.getState()._composites!;
			expect(composites.size).to.eq(1);

			store.init({
				...getData(),
				calendars,
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				tasks,
				links: [],
			});
			vi.advanceTimersByTime(1);

			const next = store.getState()._composites!;
			expect(next.size).to.eq(1);
			expect(
				store.getTaskCalendar(store.getState().tasks.byId(1))
			).not.toBe(first);
		});
	});

	describe("provide-data", () => {
		test("parses incoming tasks against assignment composites", () => {
			initStore({
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources: [
					{ id: "r1", name: "Alex", calendar: "wednesday-off" },
				],
				assignments: [],
				tasks: [
					{
						id: 1,
						text: "Lazy",
						type: "task",
						parent: 0,
						start: monday,
						duration: 5,
						lazy: true,
						open: false,
					},
				],
				links: [],
			});

			store.in.exec("provide-data", {
				id: 1,
				data: {
					tasks: [
						{
							id: 10,
							text: "Loaded",
							type: "task",
							parent: 1,
							start: monday,
							duration: 5,
						},
					],
					links: [],
					assignments: [{ id: 1, task: 10, resource: "r1" }],
				},
			});
			vi.advanceTimersByTime(1);

			const task = store.getState().tasks.byId(10);
			expect(store.getTaskCalendar(task)).toBeInstanceOf(
				CompositeCalendar
			);
			expect(task.end).toEqual(new Date(2024, 0, 23));
		});
	});

	describe("resource calendar date recalculation", () => {
		const resources: IResource[] = [
			{ id: "r1", name: "Alex", calendar: "default" },
			{ id: "r2", name: "Bob", calendar: "wednesday-off" },
		];
		const leafTask = {
			id: 1,
			text: "Task",
			start: monday,
			duration: 5,
			type: "task",
			parent: 0,
		};
		const defaultEnd = new Date(2024, 0, 20);
		const wednesdayOffEnd = new Date(2024, 0, 23);

		test("parses dates against the composite on load", () => {
			initStore({
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r2" }],
				tasks: [leafTask],
				links: [],
			});

			const task = store.getState().tasks.byId(1);
			expect(task.start).toEqual(monday);
			expect(task.end).toEqual(wednesdayOffEnd);
			expect(task.end).not.toEqual(defaultEnd);
		});

		test("reassigning assignments keeps task dates", () => {
			const config = initStore({
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				tasks: [leafTask],
				links: [],
			});
			expect(store.getState().tasks.byId(1).end).toEqual(defaultEnd);

			store.init({
				...config,
				assignments: [{ id: 1, task: 1, resource: "r2" }],
			});
			vi.advanceTimersByTime(1);

			const task = store.getState().tasks.byId(1);
			expect(task.start).toEqual(monday);
			expect(task.end).toEqual(defaultEnd);
		});

		test("reassigning assignments with aligned tasks loads them as supplied", () => {
			const config = initStore({
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				tasks: [leafTask],
				links: [],
			});

			store.init({
				...config,
				assignments: [{ id: 1, task: 1, resource: "r2" }],
				tasks: [{ ...leafTask, end: wednesdayOffEnd }],
			});
			vi.advanceTimersByTime(1);

			const task = store.getState().tasks.byId(1);
			expect(task.end).toEqual(wednesdayOffEnd);
			expect(task.duration).to.eq(5);
		});

		test("changing a resource calendar keeps task dates", () => {
			const config = initStore({
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources: [{ id: "r1", name: "Alex", calendar: "default" }],
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				tasks: [leafTask],
				links: [],
			});
			expect(store.getState().tasks.byId(1).end).toEqual(defaultEnd);

			store.init({
				...config,
				resources: [
					{ id: "r1", name: "Alex", calendar: "wednesday-off" },
				],
			});
			vi.advanceTimersByTime(1);

			expect(store.getState().tasks.byId(1).end).toEqual(defaultEnd);
		});

		test("toggling resourceCalendars keeps task dates", () => {
			const config = initStore({
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r2" }],
				tasks: [leafTask],
				links: [],
			});
			expect(store.getState().tasks.byId(1).end).toEqual(wednesdayOffEnd);

			store.init({ ...config, schedule: { resourceCalendars: false } });
			vi.advanceTimersByTime(1);

			expect(store.getState().tasks.byId(1).end).toEqual(wednesdayOffEnd);
		});

		test("calendar prop changes run no scheduling call", () => {
			const config = initStore({
				calendar: "default",
				schedule: { resourceCalendars: true, auto: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				tasks: [leafTask],
				links: [],
			});
			const scheduler = (store as any)._modules.get("autoScheduler");
			const schedule = vi.spyOn(scheduler, "schedule");
			const sweep = vi.spyOn(scheduler, "sweep");

			const updates = [
				{ calendar: "wednesday-off" },
				{ assignments: [{ id: 1, task: 1, resource: "r2" }] },
				{
					resources: [
						{ id: "r1", name: "Alex", calendar: "part-time" },
						resources[1],
					],
				},
				{ schedule: { resourceCalendars: false, auto: true } },
			];
			let current = config;
			updates.forEach(update => {
				current = { ...current, ...update };
				store.init(current);
				vi.advanceTimersByTime(1);
			});

			expect(schedule).not.toHaveBeenCalled();
			expect(sweep).not.toHaveBeenCalled();
		});

		test("add-assignment keeps start and recomputes end", () => {
			initStore({
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources,
				assignments: [],
				tasks: [leafTask],
				links: [],
			});
			expect(store.getState().tasks.byId(1).end).toEqual(defaultEnd);

			store.in.exec("add-assignment", {
				assignment: { task: 1, resource: "r2" },
			});
			vi.advanceTimersByTime(1);

			const task = store.getState().tasks.byId(1);
			expect(task.start).toEqual(monday);
			expect(task.end).toEqual(wednesdayOffEnd);
		});

		test("add-assignment re-derives the summary and schedules successors", () => {
			initStore({
				calendar: "default",
				schedule: { resourceCalendars: true, auto: true },
				resources,
				assignments: [],
				tasks: [
					{
						id: 5,
						text: "S",
						type: "summary",
						parent: 0,
						open: true,
					},
					{ ...leafTask, parent: 5 },
					{
						id: 3,
						text: "C",
						start: defaultEnd,
						duration: 2,
						type: "task",
						parent: 0,
					},
				],
				links: [{ id: 1, source: 1, target: 3, type: "e2s" }],
			});

			store.in.exec("add-assignment", {
				assignment: { task: 1, resource: "r2" },
			});
			vi.advanceTimersByTime(20);

			const { tasks } = store.getState();
			expect(tasks.byId(1).end).toEqual(wednesdayOffEnd);
			expect(tasks.byId(5).end).toEqual(wednesdayOffEnd);
			expect(tasks.byId(3).start).toEqual(wednesdayOffEnd);
		});

		test("delete-assignment recomputes end against the task calendar", () => {
			initStore({
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r2" }],
				tasks: [leafTask],
				links: [],
			});

			store.in.exec("delete-assignment", { id: 1 });
			vi.advanceTimersByTime(1);

			expect(store.getState().tasks.byId(1).end).toEqual(defaultEnd);
		});

		test("update-assignment resource swap recomputes end", () => {
			initStore({
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				tasks: [leafTask],
				links: [],
			});

			store.in.exec("update-assignment", {
				id: 1,
				assignment: { resource: "r2" },
			});
			vi.advanceTimersByTime(1);

			expect(store.getState().tasks.byId(1).end).toEqual(wednesdayOffEnd);
		});

		test("update-assignment units does not recompute dates", () => {
			initStore({
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r2", units: 100 }],
				tasks: [leafTask],
				links: [],
			});
			const updateTask = vi.fn();
			store.in.on("update-task", updateTask);
			const { start, end, duration } = store.getState().tasks.byId(1);

			store.in.exec("update-assignment", {
				id: 1,
				assignment: { units: 50 },
			});
			vi.advanceTimersByTime(1);

			const task = store.getState().tasks.byId(1);
			expect(task.start).toEqual(start);
			expect(task.end).toEqual(end);
			expect(task.duration).to.eq(duration);
			expect(updateTask).not.toHaveBeenCalled();
		});

		test("zero-units assignment is not a member", () => {
			initStore({
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources,
				assignments: [
					{ id: 1, task: 1, resource: "r1", units: 0 },
					{ id: 2, task: 1, resource: "r2", units: 100 },
				],
				tasks: [leafTask],
				links: [],
			});

			// counted, r1 would make Wednesday working again
			const task = store.getState().tasks.byId(1);
			const wednesday = new Date(2024, 0, 17);
			expect(store.getTaskCalendar(task)!.isWorkingDay(wednesday)).to.eq(
				false
			);
			expect(task.end).toEqual(wednesdayOffEnd);
		});

		test("only zero-units assignments resolve to the own calendar", () => {
			initStore({
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r2", units: 0 }],
				tasks: [leafTask],
				links: [],
			});

			const task = store.getState().tasks.byId(1);
			expect(store.getTaskCalendar(task)).toBe(store.getCalendar());
			expect(task.end).toEqual(defaultEnd);
		});

		test("update-assignment units crossing zero recomputes end", () => {
			initStore({
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources,
				assignments: [{ id: 1, task: 1, resource: "r2", units: 100 }],
				tasks: [leafTask],
				links: [],
			});
			expect(store.getState().tasks.byId(1).end).toEqual(wednesdayOffEnd);

			store.in.exec("update-assignment", {
				id: 1,
				assignment: { units: 0 },
			});
			vi.advanceTimersByTime(1);

			let task = store.getState().tasks.byId(1);
			expect(task.start).toEqual(monday);
			expect(task.end).toEqual(defaultEnd);

			store.in.exec("update-assignment", {
				id: 1,
				assignment: { units: 50 },
			});
			vi.advanceTimersByTime(1);

			task = store.getState().tasks.byId(1);
			expect(task.start).toEqual(monday);
			expect(task.end).toEqual(wednesdayOffEnd);
		});

		test("summary ignores its assignments", () => {
			initStore({
				calendar: "default",
				schedule: { resourceCalendars: true },
				resources,
				assignments: [
					{ id: 1, task: 1, resource: "r2" },
					{ id: 2, task: 2, resource: "r2" },
				],
				tasks: [
					{
						id: 1,
						text: "Summary",
						type: "summary",
						parent: 0,
						open: true,
					},
					{ ...leafTask, id: 2, parent: 1 },
				],
				links: [],
			});

			const { tasks } = store.getState();
			expect(store.getTaskCalendar(tasks.byId(1))).toBe(
				store.getCalendar()
			);
			expect(store.getTaskCalendar(tasks.byId(2))).toBeInstanceOf(
				CompositeCalendar
			);
		});

		describe("runtime edits align the task", () => {
			const wednesday = new Date(2024, 0, 17);
			const thursday = new Date(2024, 0, 18);

			test("add-assignment snaps start forward and keeps duration", () => {
				initStore({
					calendar: "default",
					schedule: { resourceCalendars: true },
					resources,
					assignments: [],
					tasks: [{ ...leafTask, start: wednesday }],
					links: [],
				});

				store.in.exec("add-assignment", {
					assignment: { task: 1, resource: "r2" },
				});
				vi.advanceTimersByTime(1);

				const task = store.getState().tasks.byId(1);
				expect(task.start).toEqual(thursday);
				expect(task.duration).to.eq(5);
				expect(task.end).toEqual(new Date(2024, 0, 26));
			});

			test("an edit resolving to the same calendar aligns nothing", () => {
				initStore({
					calendar: "default",
					schedule: { resourceCalendars: true },
					resources: [
						...resources,
						{ id: "r3", name: "Carol", calendar: "wednesday-off" },
					],
					assignments: [{ id: 1, task: 1, resource: "r2" }],
					tasks: [leafTask],
					links: [],
				});
				const updateTask = vi.fn();
				store.in.on("update-task", updateTask);

				store.in.exec("add-assignment", {
					assignment: { task: 1, resource: "r3" },
				});
				store.in.exec("add-assignment", {
					assignment: { task: 1, resource: "r1", units: 0 },
				});
				vi.advanceTimersByTime(1);

				expect(updateTask).not.toHaveBeenCalled();
			});

			test("a second resource leaving the task in empty overlap aligns nothing", () => {
				initStore({
					calendar: "default",
					schedule: { resourceCalendars: true },
					resources,
					assignments: [{ id: 1, task: 1, resource: "r1" }],
					// weekends-only against weekday resources: no shared weekday
					tasks: [{ ...leafTask, calendar: "weekends" }],
					links: [],
				});
				const updateTask = vi.fn();
				store.in.on("update-task", updateTask);

				// re-keys the composite to a different member set, but both
				// answer as the task's own calendar
				store.in.exec("add-assignment", {
					assignment: { task: 1, resource: "r2" },
				});
				vi.advanceTimersByTime(1);

				expect(updateTask).not.toHaveBeenCalled();
			});

			test("dropping the last assignment in empty overlap aligns nothing", () => {
				initStore({
					calendar: "default",
					schedule: { resourceCalendars: true },
					resources,
					assignments: [{ id: 1, task: 1, resource: "r1" }],
					tasks: [{ ...leafTask, calendar: "weekends" }],
					links: [],
					undo: true,
				});
				const { start, end } = store.getState().tasks.byId(1);

				// the composite gives way to the own calendar it already answered as;
				// only the mark changes
				store.in.exec("delete-assignment", { id: 1 });
				vi.advanceTimersByTime(1);

				const t = store.getState().tasks.byId(1);
				expect([t.start, t.end]).toEqual([start, end]);
				expect(t.$noWorkingTime).to.eq(undefined);

				store.in.exec("undo");
				vi.advanceTimersByTime(1);
				expect(store.getState().tasks.byId(1).$noWorkingTime).to.eq(
					true
				);
			});

			test("update-task changing calendar snaps start and recomputes end", () => {
				initStore({
					calendar: "default",
					tasks: [{ ...leafTask, start: wednesday }],
					links: [],
				});

				store.in.exec("update-task", {
					id: 1,
					task: { calendar: "wednesday-off" },
				});
				vi.advanceTimersByTime(1);

				const task = store.getState().tasks.byId(1);
				expect(task.start).toEqual(thursday);
				expect(task.duration).to.eq(5);
				expect(task.end).toEqual(new Date(2024, 0, 26));
			});

			test("update-task with a calendar id resolving to the same calendar aligns nothing", () => {
				const saturday = new Date(2024, 0, 20);
				initStore({
					calendar: "default",
					tasks: [{ ...leafTask, start: saturday, duration: 1 }],
					links: [],
				});

				store.in.exec("update-task", {
					id: 1,
					task: { calendar: "default" },
				});
				vi.advanceTimersByTime(1);

				expect(store.getState().tasks.byId(1).start).toEqual(saturday);
			});

			test("update-task changing a summary's calendar aligns nothing", () => {
				initStore({
					calendar: "default",
					tasks: [
						{
							id: 1,
							text: "Summary",
							type: "summary",
							parent: 0,
							open: true,
							deadline: thursday,
						},
						{ ...leafTask, id: 2, parent: 1, start: wednesday },
					],
					links: [],
				});

				store.in.exec("update-task", {
					id: 1,
					task: { calendar: "wednesday-off" },
				});
				vi.advanceTimersByTime(1);

				const { tasks } = store.getState();
				expect(tasks.byId(1).start).toEqual(wednesday);
				expect(tasks.byId(1).deadline).toEqual(thursday);
				expect(tasks.byId(2).start).toEqual(wednesday);
			});

			test("an edited deadline snaps so the day before it is a working day", () => {
				const friday = new Date(2024, 0, 19);
				const saturday = new Date(2024, 0, 20);
				const sunday = new Date(2024, 0, 21);
				const nextMonday = new Date(2024, 0, 22);
				initStore({
					calendar: "default",
					deadlines: true,
					tasks: [{ ...leafTask }],
					links: [],
				});
				const enter = (deadline: Date) => {
					store.in.exec("update-task", { id: 1, task: { deadline } });
					vi.advanceTimersByTime(1);
					return store.getState().tasks.byId(1).deadline;
				};

				expect(enter(sunday)).toEqual(saturday);
				expect(enter(nextMonday)).toEqual(saturday);
				expect(enter(friday)).toEqual(friday);
			});

			test("a loaded or calendar-less deadline is kept", () => {
				const nextMonday = new Date(2024, 0, 22);
				initStore({
					calendar: "default",
					deadlines: true,
					tasks: [{ ...leafTask, deadline: nextMonday }],
					links: [],
				});
				expect(store.getState().tasks.byId(1).deadline).toEqual(
					nextMonday
				);

				initStore({
					calendar: null,
					calendars: [],
					deadlines: true,
					tasks: [{ ...leafTask }],
					links: [],
				});
				store.in.exec("update-task", {
					id: 1,
					task: { deadline: nextMonday },
				});
				vi.advanceTimersByTime(1);
				expect(store.getState().tasks.byId(1).deadline).toEqual(
					nextMonday
				);
			});

			test("segments are re-laid from start", () => {
				initStore({
					calendar: "default",
					splitTasks: true,
					tasks: [
						{
							...leafTask,
							segments: [
								{ start: monday, duration: 1 },
								{ start: wednesday, duration: 2 },
							],
						},
					],
					links: [],
				});

				store.in.exec("update-task", {
					id: 1,
					task: { calendar: "wednesday-off" },
				});
				vi.advanceTimersByTime(1);

				const task = store.getState().tasks.byId(1);
				const [first, second] = task.segments;
				expect(first.start).toEqual(monday);
				expect(first.duration).to.eq(1);
				expect(second.start).toEqual(thursday);
				expect(second.duration).to.eq(2);
				expect(task.end).toEqual(second.end);
				expect(task.duration).to.eq(3);
			});

			test("constraint and deadline snap to the new calendar", () => {
				initStore({
					calendar: "default",
					deadlines: true,
					tasks: [
						{
							...leafTask,
							duration: 1,
							constraint: { type: "snet", date: wednesday },
							deadline: thursday,
						},
					],
					links: [],
				});

				store.in.exec("update-task", {
					id: 1,
					task: { calendar: "wednesday-off" },
				});
				vi.advanceTimersByTime(1);

				const task = store.getState().tasks.byId(1);
				expect(task.start).toEqual(monday);
				expect(task.constraint.date).toEqual(thursday);
				// the day before it, Wednesday, is off: back to after Tuesday
				expect(task.deadline).toEqual(wednesday);
			});

			test("with deadlines off nothing snaps the deadline", () => {
				initStore({
					calendar: "default",
					tasks: [{ ...leafTask, deadline: thursday }],
					links: [],
				});

				store.in.exec("update-task", {
					id: 1,
					task: { calendar: "wednesday-off" },
				});
				vi.advanceTimersByTime(1);
				expect(store.getState().tasks.byId(1).deadline).toEqual(
					thursday
				);

				store.in.exec("update-task", {
					id: 1,
					task: { deadline: new Date(2024, 0, 21) },
				});
				vi.advanceTimersByTime(1);
				expect(store.getState().tasks.byId(1).deadline).toEqual(
					new Date(2024, 0, 21)
				);
			});

			test("an alignment moving dates runs a pass named at the task", () => {
				initStore({
					calendar: "default",
					schedule: { resourceCalendars: true, auto: true },
					resources,
					assignments: [],
					tasks: [leafTask],
					links: [],
				});
				const scheduler = (store as any)._modules.get("autoScheduler");
				const schedule = vi.spyOn(scheduler, "schedule");

				store.in.exec("add-assignment", {
					assignment: { task: 1, resource: "r2" },
				});
				vi.advanceTimersByTime(1);

				expect(schedule).toHaveBeenCalledTimes(1);
				expect(schedule.mock.calls[0][0]).to.eq(1);
			});

			test("an alignment keeping dates runs no pass", () => {
				initStore({
					calendar: "default",
					schedule: { resourceCalendars: true, auto: true },
					resources,
					assignments: [],
					tasks: [{ ...leafTask, duration: 2 }],
					links: [],
				});
				const scheduler = (store as any)._modules.get("autoScheduler");
				const schedule = vi.spyOn(scheduler, "schedule");

				store.in.exec("add-assignment", {
					assignment: { task: 1, resource: "r2" },
				});
				vi.advanceTimersByTime(1);

				expect(schedule).not.toHaveBeenCalled();
			});
		});

		describe("undo does not re-run auto-schedule", () => {
			const successor = {
				id: 2,
				text: "Successor",
				start: monday,
				duration: 5,
				type: "task",
				parent: 0,
			};
			const e2s = { id: 1, source: 1, target: 2, type: "e2s" as const };

			function initLinkedStore(
				assignments: { id: number; task: number; resource: string }[]
			) {
				initStore({
					calendar: "default",
					undo: true,
					schedule: { resourceCalendars: true, auto: true },
					resources,
					assignments,
					tasks: [{ ...leafTask }, { ...successor }],
					links: [e2s],
				});
			}

			function taskDates(id: number) {
				const t = store.getState().tasks.byId(id);
				return { start: t.start, end: t.end, duration: t.duration };
			}

			function scheduler() {
				return (store as any)._modules.get("autoScheduler");
			}

			test("add-assignment undo restores successor dates without a new pass", () => {
				initLinkedStore([]);
				const before = { 1: taskDates(1), 2: taskDates(2) };

				store.in.exec("add-assignment", {
					assignment: { task: 1, resource: "r2" },
				});
				vi.advanceTimersByTime(1);

				const after = { 1: taskDates(1), 2: taskDates(2) };
				expect(after[1].end).toEqual(wednesdayOffEnd);
				expect(after[1].end).not.toEqual(before[1].end);
				expect(after[2].start).not.toEqual(before[2].start);

				const schedule = vi.spyOn(scheduler(), "schedule");
				store.in.exec("undo");
				vi.advanceTimersByTime(1);

				expect(schedule).not.toHaveBeenCalled();
				expect(taskDates(1)).toEqual(before[1]);
				expect(taskDates(2)).toEqual(before[2]);
				expect(
					store.getState()._assignments!.byTask[1]
				).toBeUndefined();

				schedule.mockClear();
				store.in.exec("redo");
				vi.advanceTimersByTime(1);

				expect(schedule).not.toHaveBeenCalled();
				expect(taskDates(1)).toEqual(after[1]);
				expect(taskDates(2)).toEqual(after[2]);
			});

			test("add-assignment undo restores a start off a working day", () => {
				const saturday = new Date(2024, 0, 20);
				initStore({
					calendar: "default",
					undo: true,
					schedule: { resourceCalendars: true },
					resources,
					assignments: [],
					tasks: [{ ...leafTask, start: saturday, duration: 2 }],
					links: [],
				});
				const before = taskDates(1);

				store.in.exec("add-assignment", {
					assignment: { task: 1, resource: "r2" },
				});
				vi.advanceTimersByTime(1);
				const after = taskDates(1);
				expect(after.start).not.toEqual(saturday);

				store.in.exec("undo");
				vi.advanceTimersByTime(1);
				expect(taskDates(1)).toEqual(before);

				store.in.exec("redo");
				vi.advanceTimersByTime(1);
				expect(taskDates(1)).toEqual(after);
			});

			test("delete-assignment undo restores successor dates without a new pass", () => {
				initLinkedStore([{ id: 1, task: 1, resource: "r2" }]);
				const before = { 1: taskDates(1), 2: taskDates(2) };
				expect(before[1].end).toEqual(wednesdayOffEnd);

				store.in.exec("delete-assignment", { id: 1 });
				vi.advanceTimersByTime(1);
				const after = { 1: taskDates(1), 2: taskDates(2) };
				expect(after[1].end).toEqual(defaultEnd);
				expect(after[1].end).not.toEqual(before[1].end);

				const schedule = vi.spyOn(scheduler(), "schedule");
				store.in.exec("undo");
				vi.advanceTimersByTime(1);

				expect(schedule).not.toHaveBeenCalled();
				expect(taskDates(1)).toEqual(before[1]);
				expect(taskDates(2)).toEqual(before[2]);

				schedule.mockClear();
				store.in.exec("redo");
				vi.advanceTimersByTime(1);

				expect(schedule).not.toHaveBeenCalled();
				expect(taskDates(1)).toEqual(after[1]);
				expect(taskDates(2)).toEqual(after[2]);
			});
		});
	});
});
