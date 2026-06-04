import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { DataStore } from "../src/index";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";
import type {
	IDataConfig,
	IResource,
	IAssignment,
	IResourceLoad,
} from "../src/types";

let store: DataStore;

const resources: IResource[] = [
	{ id: "dev", name: "Development Team" },
	{ id: "r1", name: "Alex", role: "Developer", parent: "dev" },
	{ id: "r2", name: "Sophie", role: "Designer", parent: "dev" },
	{ id: "qa", name: "QA Team" },
	{ id: "r3", name: "James", role: "QA Engineer", parent: "qa" },
];

const assignments: IAssignment[] = [
	{ id: 1, task: 1, resource: "r1" },
	{ id: 2, task: 1, resource: "r2", units: 50 },
	{ id: 3, task: 2, resource: "r1" },
	{ id: 4, task: 2, resource: "r3" },
];

function initStore(extra?: Partial<IDataConfig>) {
	const data = getData();
	store = new DataStore(writable);
	store.init({ ...data, ...extra });
}

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
	vi.useRealTimers();
});

describe("resources", () => {
	describe("loading resources", () => {
		test("loads resources into state", () => {
			initStore({ resources });

			const state = store.getState();
			expect(state.resources).toBeDefined();
			// toArray returns root items only (2 teams)
			expect(state.resources!.toArray()).toHaveLength(2);
		});

		test("resources are parsed as DataTree", () => {
			initStore({ resources });

			const state = store.getState();
			expect(state.resources!.toArray).toBeDefined();
			expect(state.resources!.byId).toBeDefined();
		});

		test("resources have correct hierarchy", () => {
			initStore({ resources });

			const state = store.getState();
			const devTeam = state.resources!.byId("dev");
			expect(devTeam).toBeDefined();
			expect(devTeam.name).toBe("Development Team");
			expect(devTeam.data).toHaveLength(2);
		});

		test("can access leaf resources by id", () => {
			initStore({ resources });

			const state = store.getState();
			const alex = state.resources!.byId("r1");
			expect(alex).toBeDefined();
			expect(alex.name).toBe("Alex");
			expect(alex.role).toBe("Developer");
		});

		test("empty resources array is handled", () => {
			initStore({ resources: [] });

			const state = store.getState();
			expect(state.resources).toBeDefined();
			expect(state.resources!.toArray()).toHaveLength(0);
		});
	});

	describe("loading assignments", () => {
		test("loads assignments into state", () => {
			initStore({ resources, assignments });

			const state = store.getState();
			expect(state.assignments).toBeDefined();
		});

		test("assignments are parsed as DataArray", () => {
			initStore({ resources, assignments });

			const state = store.getState();
			expect(state.assignments!.forEach).toBeDefined();
			expect(state.assignments!.byId).toBeDefined();
		});

		test("empty assignments array is handled", () => {
			initStore({ assignments: [] });

			const state = store.getState();
			expect(state.assignments).toBeDefined();
		});
	});

	describe("deleting tasks with assignments", () => {
		test("removes assignment when deleting a task", () => {
			initStore({ resources, assignments });

			store.in.exec("delete-task", { id: 2 });
			vi.advanceTimersByTime(1);

			const state = store.getState();
			expect(state.assignments!.map(a => a.id)).toEqual([1, 2]);
			expect(state._assignments!.byTask[1]).toBeDefined();
			expect(state._assignments!.byTask[2]).toBeUndefined();
			expect(state._assignments!.byResource["r1"]).toBeDefined();
			expect(state._assignments!.byResource["r2"]).toBeDefined();
			expect(state._assignments!.byResource["r3"]).toBeUndefined();
		});

		test("removes assignments from all descendants when deleting a parent", () => {
			initStore({ resources, assignments });

			// create a task width child tasks and assignment
			store.in.exec("add-task", {
				target: 2,
				mode: "child",
				task: {
					id: 3,
					text: "Task 3",
					start: new Date(2024, 3, 6),
					duration: 2,
				},
			});
			vi.advanceTimersByTime(1);

			store.in.exec("add-assignment", {
				id: 5,
				assignment: { task: 3, resource: "r3" },
			});
			vi.advanceTimersByTime(1);

			store.in.exec("delete-task", { id: 2 });
			vi.advanceTimersByTime(1);

			const state = store.getState();
			expect(state.assignments!.map(a => a.id)).toEqual([1, 2]);
			expect(state._assignments!.byTask[1]).toBeDefined();
			expect(state._assignments!.byTask[2]).toBeUndefined();
			expect(state._assignments!.byTask[3]).toBeUndefined();
			expect(state._assignments!.byResource["r1"]).toBeDefined();
			expect(state._assignments!.byResource["r2"]).toBeDefined();
			expect(state._assignments!.byResource["r3"]).toBeUndefined();
		});

		test("removes assignments from all descendants when deleting a task with deep child levels", () => {
			initStore({ resources, assignments });

			// create a task width 2 levels of child tasks and assignments
			store.in.exec("add-task", {
				target: 2,
				mode: "child",
				task: {
					id: 3,
					text: "Task 3",
					start: new Date(2024, 3, 6),
					duration: 2,
				},
			});
			vi.advanceTimersByTime(1);

			store.in.exec("add-task", {
				target: 3,
				mode: "child",
				task: {
					id: 4,
					text: "Task 4",
					start: new Date(2024, 3, 6),
					duration: 2,
				},
			});
			vi.advanceTimersByTime(1);

			store.in.exec("add-assignment", {
				id: 5,
				assignment: { task: 3, resource: "r2" },
			});
			vi.advanceTimersByTime(1);

			store.in.exec("add-assignment", {
				id: 6,
				assignment: { task: 4, resource: "r3" },
			});
			vi.advanceTimersByTime(1);

			store.in.exec("delete-task", { id: 2 });
			vi.advanceTimersByTime(1);

			const state = store.getState();
			expect(state.assignments!.map(a => a.id)).toEqual([1, 2]);
			expect(state._assignments!.byTask[1]).toBeDefined();
			expect(state._assignments!.byTask[2]).toBeUndefined();
			expect(state._assignments!.byTask[4]).toBeUndefined();
			expect(state._assignments!.byResource["r1"]).toBeDefined();
			expect(state._assignments!.byResource["r2"]).toBeDefined();
			expect(state._assignments!.byResource["r3"]).toBeUndefined();
		});

		test("removes all assignments when deleting all assigned tasks", () => {
			initStore({ resources, assignments });

			store.in.exec("delete-task", { id: 1 });
			vi.advanceTimersByTime(1);
			store.in.exec("delete-task", { id: 2 });
			vi.advanceTimersByTime(1);

			const state = store.getState();
			expect(state.assignments!.map(a => a.id)).toEqual([]);
			expect(state._assignments!.byTask).toEqual({});
			expect(state._assignments!.byResource).toEqual({});
		});
	});

	describe("_assignments computation", () => {
		test("computes _assignments from assignments", () => {
			initStore({ resources, assignments });

			const state = store.getState();
			expect(state._assignments).toBeDefined();
			expect(state._assignments!.byTask).toBeDefined();
			expect(state._assignments!.byResource).toBeDefined();
		});

		test("indexes assignments by task", () => {
			initStore({ resources, assignments });

			const state = store.getState();
			const task1Assignments = state._assignments!.byTask[1];
			expect(task1Assignments).toHaveLength(2);
			expect(task1Assignments[0].resource).toBe("r1");
			expect(task1Assignments[1].resource).toBe("r2");
		});

		test("indexes assignments by resource", () => {
			initStore({ resources, assignments });

			const state = store.getState();
			const r1Assignments = state._assignments!.byResource["r1"];
			expect(r1Assignments).toHaveLength(2);
			expect(r1Assignments[0].task).toBe(1);
			expect(r1Assignments[1].task).toBe(2);
		});

		test("sets default units to 100 when not specified", () => {
			initStore({ resources, assignments });

			const state = store.getState();
			const task1Assignments = state._assignments!.byTask[1];
			expect(task1Assignments[0].units).toBe(100);
			expect(task1Assignments[1].units).toBe(50);
		});

		test("handles empty assignments", () => {
			initStore({ resources, assignments: [] });

			const state = store.getState();
			expect(state._assignments).toBeDefined();
			expect(state._assignments!.byTask).toEqual({});
			expect(state._assignments!.byResource).toEqual({});
		});
	});

	describe("resource loads computation", () => {
		test("computes loads and total for each resource", () => {
			initStore({ resources, assignments });

			const state = store.getState();
			const alex = state.resources!.byId("r1");
			const sophie = state.resources!.byId("r2");
			const james = state.resources!.byId("r3");
			const devTeam = state.resources!.byId("dev");
			const qaTeam = state.resources!.byId("qa");

			expect(Object.keys(alex.$load).length).toEqual(5);
			[
				"2024-04-02",
				"2024-04-03",
				"2024-04-04",
				"2024-04-06",
				"2024-04-07",
			].forEach(key => {
				expect(alex.$load[key]).toEqual({ percent: 100, hours: 8 });
			});
			expect(alex.$total).toBe(40);
			expect(alex.$overloaded).toBe(false);

			expect(Object.keys(sophie.$load).length).toEqual(3);
			["2024-04-02", "2024-04-03", "2024-04-04"].forEach(key => {
				expect(sophie.$load[key]).toEqual({ percent: 50, hours: 4 });
			});
			expect(sophie.$total).toBe(12);
			expect(sophie.$overloaded).toBe(false);

			expect(Object.keys(james.$load).length).toEqual(2);
			["2024-04-06", "2024-04-07"].forEach(key => {
				expect(james.$load[key]).toEqual({ percent: 100, hours: 8 });
			});
			expect(james.$total).toBe(16);
			expect(james.$overloaded).toBe(false);

			expect(Object.keys(devTeam.$load).length).toEqual(5);
			["2024-04-02", "2024-04-03", "2024-04-04"].forEach(key => {
				expect(devTeam.$load[key]).toEqual({ percent: 75, hours: 12 });
			});
			["2024-04-06", "2024-04-07"].forEach(key => {
				expect(devTeam.$load[key]).toEqual({ percent: 50, hours: 8 });
			});
			expect(devTeam.$total).toBe(52);
			expect(devTeam.$overloaded).toBe(false);

			expect(Object.keys(qaTeam.$load).length).toEqual(2);
			["2024-04-06", "2024-04-07"].forEach(key => {
				expect(qaTeam.$load[key]).toEqual({ percent: 100, hours: 8 });
			});
			expect(qaTeam.$total).toBe(16);
			expect(qaTeam.$overloaded).toBe(false);
		});

		test("computes loads and total for each resource with splited tasks", () => {
			const tasks = [
				{
					id: 1,
					text: "Task 1",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 6),
					end: new Date(2026, 3, 10),
					segments: [
						{
							start: new Date(2026, 3, 6),
							duration: 2,
							text: "Part A",
						},
						{
							start: new Date(2026, 3, 9),
							duration: 1,
							text: "Part B",
						},
					],
				},
				{
					id: 2,
					text: "Task 2",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 10),
					end: new Date(2026, 3, 16),
					segments: [
						{
							start: new Date(2026, 3, 10),
							duration: 2,
							text: "Part A",
						},
						{
							start: new Date(2026, 3, 14),
							duration: 2,
							text: "Part B",
						},
					],
				},
			];
			initStore({ tasks, resources, assignments, splitTasks: true });

			const state = store.getState();
			const alex = state.resources!.byId("r1");
			const sophie = state.resources!.byId("r2");
			const james = state.resources!.byId("r3");
			const devTeam = state.resources!.byId("dev");
			const qaTeam = state.resources!.byId("qa");

			expect(Object.keys(alex.$load).length).toEqual(7);
			["06", "07", "09", "10", "11", "14", "15"].forEach(key => {
				expect(alex.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(alex.$total).toBe(56);
			expect(alex.$overloaded).toBe(false);

			expect(Object.keys(sophie.$load).length).toEqual(3);
			["06", "07", "09"].forEach(key => {
				expect(sophie.$load[`2026-04-${key}`]).toEqual({
					percent: 50,
					hours: 4,
				});
			});
			expect(sophie.$total).toBe(12);
			expect(sophie.$overloaded).toBe(false);

			expect(Object.keys(james.$load).length).toEqual(4);
			["10", "11", "14", "15"].forEach(key => {
				expect(james.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(james.$total).toBe(32);
			expect(james.$overloaded).toBe(false);

			expect(Object.keys(devTeam.$load).length).toEqual(7);
			["06", "07", "09"].forEach(key => {
				expect(devTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 75,
					hours: 12,
				});
			});
			["10", "11", "14", "15"].forEach(key => {
				expect(devTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 50,
					hours: 8,
				});
			});
			expect(devTeam.$total).toBe(68);
			expect(devTeam.$overloaded).toBe(false);

			expect(Object.keys(qaTeam.$load).length).toEqual(4);
			["10", "11", "14", "15"].forEach(key => {
				expect(qaTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(qaTeam.$total).toBe(32);
			expect(qaTeam.$overloaded).toBe(false);
		});

		test("computes loads and total for each resource when gantt has (default) calendar", () => {
			const tasks = [
				{
					id: 1,
					text: "Task 1",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 6), // monday
					end: new Date(2026, 3, 10),
				},
				{
					id: 2,
					text: "Task 2",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 10), // friday
					end: new Date(2026, 3, 16),
				},
			];
			initStore({ tasks, resources, assignments, calendar: true });

			const state = store.getState();
			const alex = state.resources!.byId("r1");
			const sophie = state.resources!.byId("r2");
			const james = state.resources!.byId("r3");
			const devTeam = state.resources!.byId("dev");
			const qaTeam = state.resources!.byId("qa");

			expect(Object.keys(alex.$load).length).toEqual(8);
			["06", "07", "08", "09", "10", "13", "14", "15"].forEach(key => {
				expect(alex.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(alex.$total).toBe(64);
			expect(alex.$overloaded).toBe(false);

			expect(Object.keys(sophie.$load).length).toEqual(4);
			["06", "07", "08", "09"].forEach(key => {
				expect(sophie.$load[`2026-04-${key}`]).toEqual({
					percent: 50,
					hours: 4,
				});
			});
			expect(sophie.$total).toBe(16);
			expect(sophie.$overloaded).toBe(false);

			expect(Object.keys(james.$load).length).toEqual(4);
			["10", "13", "14", "15"].forEach(key => {
				expect(james.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(james.$total).toBe(32);
			expect(james.$overloaded).toBe(false);

			// no resource calendar, using 8h workday from default calendar for each resource (for parent capacity)
			expect(Object.keys(devTeam.$load).length).toEqual(8);
			["06", "07", "08", "09"].forEach(key => {
				expect(devTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 75,
					hours: 12,
				});
			});
			["10", "13", "14", "15"].forEach(key => {
				expect(devTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 50,
					hours: 8,
				});
			});
			expect(devTeam.$total).toBe(80);
			expect(devTeam.$overloaded).toBe(false);

			expect(Object.keys(qaTeam.$load).length).toEqual(4);
			["10", "13", "14", "15"].forEach(key => {
				expect(qaTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(qaTeam.$total).toBe(32);
			expect(qaTeam.$overloaded).toBe(false);
		});

		test("computes loads and total for each resource when gantt has ('part-time') calendar", () => {
			const tasks = [
				{
					id: 1,
					text: "Task 1",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 6), // monday
					end: new Date(2026, 3, 10),
				},
				{
					id: 2,
					text: "Task 2",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 10), // friday
					end: new Date(2026, 3, 16),
				},
			];
			const calendar = {
				id: "part-time",
				weekHours: {
					monday: 4,
					tuesday: 4,
					wednesday: 4,
					thursday: 4,
					friday: 4,
					saturday: 0,
					sunday: 0,
				},
			};
			initStore({ tasks, resources, assignments, calendar });

			const state = store.getState();
			const alex = state.resources!.byId("r1");
			const sophie = state.resources!.byId("r2");
			const james = state.resources!.byId("r3");
			const devTeam = state.resources!.byId("dev");
			const qaTeam = state.resources!.byId("qa");

			expect(Object.keys(alex.$load).length).toEqual(8);
			["06", "07", "08", "09", "10", "13", "14", "15"].forEach(key => {
				expect(alex.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 4,
				});
			});
			expect(alex.$total).toBe(32);
			expect(alex.$overloaded).toBe(false);

			expect(Object.keys(sophie.$load).length).toEqual(4);
			["06", "07", "08", "09"].forEach(key => {
				expect(sophie.$load[`2026-04-${key}`]).toEqual({
					percent: 50,
					hours: 2,
				});
			});
			expect(sophie.$total).toBe(8);
			expect(sophie.$overloaded).toBe(false);

			expect(Object.keys(james.$load).length).toEqual(4);
			["10", "13", "14", "15"].forEach(key => {
				expect(james.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 4,
				});
			});
			expect(james.$total).toBe(16);
			expect(james.$overloaded).toBe(false);

			// no resource calendar, using 4h workday from calendar for each resource (for parent capacity)
			expect(Object.keys(devTeam.$load).length).toEqual(8);
			["06", "07", "08", "09"].forEach(key => {
				// Math.round((6 / 8) * 100) = 75 %
				expect(devTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 75,
					hours: 6,
				});
			});
			["10", "13", "14", "15"].forEach(key => {
				// Math.round((4 / 8) * 100) = 50 %
				expect(devTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 50,
					hours: 4,
				});
			});
			expect(devTeam.$total).toBe(40);
			expect(devTeam.$overloaded).toBe(false);

			expect(Object.keys(qaTeam.$load).length).toEqual(4);
			["10", "13", "14", "15"].forEach(key => {
				expect(qaTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 4,
				});
			});
			expect(qaTeam.$total).toBe(16);
			expect(qaTeam.$overloaded).toBe(false);
		});

		test("computes loads and total for each resource when gantt has multiple (tasks) calendars", () => {
			const tasks = [
				{
					id: 1,
					text: "Task 1",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 6), // monday
					end: new Date(2026, 3, 10),
					calendar: "part-time",
				},
				{
					id: 2,
					text: "Task 2",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 10), // friday
					end: new Date(2026, 3, 16),
					calendar: "wednesday-off",
				},
			];
			const calendars = [
				{
					id: "part-time",
					weekHours: {
						monday: 4,
						tuesday: 4,
						wednesday: 4,
						thursday: 4,
						friday: 4,
						saturday: 0,
						sunday: 0,
					},
				},
				{
					id: "wednesday-off",
					weekHours: {
						monday: 8,
						tuesday: 8,
						wednesday: 0,
						thursday: 8,
						friday: 8,
						saturday: 0,
						sunday: 0,
					},
				},
			];
			initStore({ tasks, resources, assignments, calendars });

			const state = store.getState();
			const alex = state.resources!.byId("r1");
			const sophie = state.resources!.byId("r2");
			const james = state.resources!.byId("r3");
			const devTeam = state.resources!.byId("dev");
			const qaTeam = state.resources!.byId("qa");

			expect(Object.keys(alex.$load).length).toEqual(7);
			["06", "07", "08", "09"].forEach(key => {
				expect(alex.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 4,
				});
			});
			["10", "13", "14"].forEach(key => {
				expect(alex.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(alex.$total).toBe(40);
			expect(alex.$overloaded).toBe(false);

			expect(Object.keys(sophie.$load).length).toEqual(4);
			["06", "07", "08", "09"].forEach(key => {
				expect(sophie.$load[`2026-04-${key}`]).toEqual({
					percent: 50,
					hours: 2,
				});
			});
			expect(sophie.$total).toBe(8);
			expect(sophie.$overloaded).toBe(false);

			expect(Object.keys(james.$load).length).toEqual(3);
			["10", "13", "14"].forEach(key => {
				expect(james.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(james.$total).toBe(24);
			expect(james.$overloaded).toBe(false);

			// no resource calendar and no default calendar, using default 8h workday for each resource (for parent capacity)
			expect(Object.keys(devTeam.$load).length).toEqual(7);
			["06", "07", "08", "09"].forEach(key => {
				// Math.round((6 / 16) * 100) = 38 %
				expect(devTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 38,
					hours: 6,
				});
			});
			["10", "13", "14"].forEach(key => {
				// Math.round((8 / 16) * 100) = 50 %
				expect(devTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 50,
					hours: 8,
				});
			});
			expect(devTeam.$total).toBe(48);
			expect(devTeam.$overloaded).toBe(false);

			expect(Object.keys(qaTeam.$load).length).toEqual(3);
			["10", "13", "14"].forEach(key => {
				expect(qaTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(qaTeam.$total).toBe(24);
			expect(qaTeam.$overloaded).toBe(false);
		});

		test("computes loads and total for each resource when gantt has multiple (resources) calendars", () => {
			const tasks = [
				{
					id: 1,
					text: "Task 1",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 6), // monday
					end: new Date(2026, 3, 10),
				},
				{
					id: 2,
					text: "Task 2",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 10), // friday
					end: new Date(2026, 3, 16),
				},
			];
			const cResources = resources.map(r => {
				if (r.id === "r1") return { ...r, calendar: "part-time" };
				if (r.id === "r3") return { ...r, calendar: "wednesday-off" };
				return { ...r };
			});
			const calendars = [
				{
					id: "part-time",
					weekHours: {
						monday: 4,
						tuesday: 4,
						wednesday: 4,
						thursday: 4,
						friday: 4,
						saturday: 0,
						sunday: 0,
					},
				},
				{
					id: "wednesday-off",
					weekHours: {
						monday: 8,
						tuesday: 8,
						wednesday: 0,
						thursday: 8,
						friday: 8,
						saturday: 0,
						sunday: 0,
					},
				},
			];
			initStore({ tasks, resources: cResources, assignments, calendars });

			const state = store.getState();
			const alex = state.resources!.byId("r1");
			const sophie = state.resources!.byId("r2");
			const james = state.resources!.byId("r3");
			const devTeam = state.resources!.byId("dev");
			const qaTeam = state.resources!.byId("qa");

			expect(Object.keys(alex.$load).length).toEqual(8);
			["06", "07", "08", "09", "10", "13", "14", "15"].forEach(key => {
				expect(alex.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 4,
				});
			});
			expect(alex.$total).toBe(32);
			expect(alex.$overloaded).toBe(false);

			expect(Object.keys(sophie.$load).length).toEqual(4);
			["06", "07", "08", "09"].forEach(key => {
				expect(sophie.$load[`2026-04-${key}`]).toEqual({
					percent: 50,
					hours: 4,
				});
			});
			expect(sophie.$total).toBe(16);
			expect(sophie.$overloaded).toBe(false);

			expect(Object.keys(james.$load).length).toEqual(3);
			["10", "13", "14"].forEach(key => {
				expect(james.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(james.$total).toBe(24);
			expect(james.$overloaded).toBe(false);

			// use resource calendar, or default 8h workday if not found, for each resource (for parent capacity)
			expect(Object.keys(devTeam.$load).length).toEqual(8);
			["06", "07", "08", "09"].forEach(key => {
				// alex: 4h - "part-time" calendar, sophie: 8h - default 8h
				// Math.round((8 / 12) * 100) = 67 %
				expect(devTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 67,
					hours: 8,
				});
			});
			["10", "13", "14", "15"].forEach(key => {
				// alex: 4h - "part-time" calendar, sophie: 8h - default 8h
				// Math.round((4 / 12) * 100) = 33 %
				expect(devTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 33,
					hours: 4,
				});
			});
			expect(devTeam.$total).toBe(48);
			expect(devTeam.$overloaded).toBe(false);

			expect(Object.keys(qaTeam.$load).length).toEqual(3);
			["10", "13", "14"].forEach(key => {
				expect(qaTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(qaTeam.$total).toBe(24);
			expect(qaTeam.$overloaded).toBe(false);
		});

		test("computes loads and total for each resource when gantt has multiple (tasks + resources) calendars", () => {
			const tasks = [
				{
					id: 1,
					text: "Task 1",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 6), // monday
					end: new Date(2026, 3, 10),
					calendar: "part-time",
				},
				{
					id: 2,
					text: "Task 2",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 10), // friday
					end: new Date(2026, 3, 16),
					calendar: "wednesday-off",
				},
			];
			const cResources = resources.map(r => {
				if (r.id === "r1") return { ...r, calendar: "wednesday-off" };
				if (r.id === "r3") return { ...r, calendar: "part-time" };
				return { ...r };
			});
			const calendars = [
				{
					id: "part-time",
					weekHours: {
						monday: 4,
						tuesday: 4,
						wednesday: 4,
						thursday: 4,
						friday: 4,
						saturday: 0,
						sunday: 0,
					},
				},
				{
					id: "wednesday-off",
					weekHours: {
						monday: 8,
						tuesday: 8,
						wednesday: 0,
						thursday: 8,
						friday: 8,
						saturday: 0,
						sunday: 0,
					},
				},
			];
			initStore({ tasks, resources: cResources, assignments, calendars });

			const state = store.getState();
			const alex = state.resources!.byId("r1");
			const sophie = state.resources!.byId("r2");
			const james = state.resources!.byId("r3");
			const devTeam = state.resources!.byId("dev");
			const qaTeam = state.resources!.byId("qa");

			expect(Object.keys(alex.$load).length).toEqual(6);
			["06", "07", "09"].forEach(key => {
				// 4 hours - minimum value between two calendars (task "part-time")
				// "2026-04-08" is non-working per resource calendar (0h - minimum value between two calendars)
				expect(alex.$load[`2026-04-${key}`]).toEqual({
					percent: 100, // percent follows assignment units; hours are capped by min(calendars)
					hours: 4,
				});
			});
			["10", "13", "14"].forEach(key => {
				expect(alex.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(alex.$total).toBe(36);
			expect(alex.$overloaded).toBe(false);

			expect(Object.keys(sophie.$load).length).toEqual(4);
			["06", "07", "08", "09"].forEach(key => {
				// 2 hours - minimum value between two calendars
				expect(sophie.$load[`2026-04-${key}`]).toEqual({
					percent: 50,
					hours: 2,
				});
			});
			expect(sophie.$total).toBe(8);
			expect(sophie.$overloaded).toBe(false);

			expect(Object.keys(james.$load).length).toEqual(3);
			["10", "13", "14"].forEach(key => {
				// 4 hours - minimum value between two calendars (resource "part-time")
				// "2026-04-15" is non-working per task calendar (0h - minimum value between two calendars)
				expect(james.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 4,
				});
			});
			expect(james.$total).toBe(12);
			expect(james.$overloaded).toBe(false);

			// use resource calendar, or default 8h workday if not found, for each resource (for parent capacity)
			expect(Object.keys(devTeam.$load).length).toEqual(7);
			const devTeamLoad: Record<string, IResourceLoad> = {
				"06": { percent: 38, hours: 6 }, // Math.round(( 6 / 16) * 100) = 38 % (alex: res. calendar 8h + sophie: dafault 8h)
				"07": { percent: 38, hours: 6 }, // Math.round(( 6 / 16) * 100) = 38 %
				"08": { percent: 25, hours: 2 }, // Math.round(( 2 / 8) * 100) = 25 % - (sophie: dafault 8h)
				"09": { percent: 38, hours: 6 }, // Math.round(( 6 / 16) * 100) = 38 %
				"10": { percent: 50, hours: 8 }, // Math.round(( 8 / 16) * 100) = 50 %
				"13": { percent: 50, hours: 8 }, // Math.round(( 8 / 16) * 100) = 50 %
				"14": { percent: 50, hours: 8 }, // Math.round(( 8 / 16) * 100) = 50 %
			};
			for (const day in devTeamLoad) {
				expect(devTeam.$load[`2026-04-${day}`]).toEqual(
					devTeamLoad[day]
				);
			}
			expect(devTeam.$total).toBe(44);
			expect(devTeam.$overloaded).toBe(false);

			expect(Object.keys(qaTeam.$load).length).toEqual(3);
			["10", "13", "14"].forEach(key => {
				expect(qaTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 4,
				});
			});
			expect(qaTeam.$total).toBe(12);
			expect(qaTeam.$overloaded).toBe(false);
		});

		test("can recompute loads and total for each resource when task is updated", () => {
			initStore({ resources, assignments });

			store.in.exec("update-task", {
				id: 1,
				task: {
					start: new Date(2024, 3, 2),
					duration: 4,
				},
			});
			vi.advanceTimersByTime(1);

			let state = store.getState();
			let alex = state.resources!.byId("r1");
			let sophie = state.resources!.byId("r2");
			let devTeam = state.resources!.byId("dev");

			expect(Object.keys(alex.$load).length).toEqual(6);
			[
				"2024-04-02",
				"2024-04-03",
				"2024-04-04",
				"2024-04-05",
				"2024-04-06",
				"2024-04-07",
			].forEach(key => {
				expect(alex.$load[key]).toEqual({ percent: 100, hours: 8 });
			});
			expect(alex.$total).toBe(48);
			expect(alex.$overloaded).toBe(false);

			expect(Object.keys(sophie.$load).length).toEqual(4);
			["2024-04-02", "2024-04-03", "2024-04-04", "2024-04-05"].forEach(
				key => {
					expect(sophie.$load[key]).toEqual({
						percent: 50,
						hours: 4,
					});
				}
			);
			expect(sophie.$total).toBe(16);
			expect(sophie.$overloaded).toBe(false);

			expect(Object.keys(devTeam.$load).length).toEqual(6);
			["2024-04-02", "2024-04-03", "2024-04-04", "2024-04-05"].forEach(
				key => {
					expect(devTeam.$load[key]).toEqual({
						percent: 75,
						hours: 12,
					});
				}
			);
			["2024-04-06", "2024-04-07"].forEach(key => {
				expect(devTeam.$load[key]).toEqual({ percent: 50, hours: 8 });
			});
			expect(devTeam.$total).toBe(64);
			expect(devTeam.$overloaded).toBe(false);

			// update task so alex and devTeam are overloaded
			store.in.exec("update-task", {
				id: 1,
				task: {
					start: new Date(2024, 3, 2),
					duration: 5,
				},
			});
			vi.advanceTimersByTime(1);

			state = store.getState();
			alex = state.resources!.byId("r1");
			sophie = state.resources!.byId("r2");
			devTeam = state.resources!.byId("dev");

			expect(Object.keys(alex.$load).length).toEqual(6);
			[
				"2024-04-02",
				"2024-04-03",
				"2024-04-04",
				"2024-04-05",
				"2024-04-07",
			].forEach(key => {
				expect(alex.$load[key]).toEqual({ percent: 100, hours: 8 });
			});
			expect(alex.$load["2024-04-06"]).toEqual({
				percent: 200,
				hours: 16,
			});
			expect(alex.$total).toBe(56);
			expect(alex.$overloaded).toBe(true);

			expect(Object.keys(devTeam.$load).length).toEqual(6);
			["2024-04-02", "2024-04-03", "2024-04-04", "2024-04-05"].forEach(
				key => {
					expect(devTeam.$load[key]).toEqual({
						percent: 75,
						hours: 12,
					});
				}
			);
			expect(devTeam.$load["2024-04-06"]).toEqual({
				percent: 125,
				hours: 20,
			});
			expect(devTeam.$load["2024-04-07"]).toEqual({
				percent: 50,
				hours: 8,
			});
			expect(devTeam.$total).toBe(76);
			expect(devTeam.$overloaded).toBe(true);
		});

		test("can recompute loads and total for each resource when task is updated (split tasks)", () => {
			const tasks = [
				{
					id: 1,
					text: "Task 1",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 6),
					end: new Date(2026, 3, 9),
					segments: [
						{
							start: new Date(2026, 3, 6),
							duration: 1,
							text: "Part A",
						},
						{
							start: new Date(2026, 3, 8),
							duration: 1,
							text: "Part B",
						},
					],
				},
				{
					id: 2,
					text: "Task 2",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 9),
					end: new Date(2026, 3, 11),
				},
			];
			initStore({ tasks, resources, assignments, splitTasks: true });

			store.in.exec("update-task", {
				id: 1,
				segmentIndex: 0,
				task: { end: new Date(2026, 3, 8) },
			});
			vi.advanceTimersByTime(1);
			store.in.exec("split-task", { id: 2 });
			vi.advanceTimersByTime(1);

			const state = store.getState();
			const alex = state.resources!.byId("r1");
			const sophie = state.resources!.byId("r2");
			const james = state.resources!.byId("r3");
			const devTeam = state.resources!.byId("dev");
			const qaTeam = state.resources!.byId("qa");

			expect(Object.keys(alex.$load).length).toEqual(5);
			["06", "07", "08", "09", "11"].forEach(key => {
				expect(alex.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(alex.$total).toBe(40);
			expect(alex.$overloaded).toBe(false);

			expect(Object.keys(sophie.$load).length).toEqual(3);
			["06", "07", "08"].forEach(key => {
				expect(sophie.$load[`2026-04-${key}`]).toEqual({
					percent: 50,
					hours: 4,
				});
			});
			expect(sophie.$total).toBe(12);
			expect(sophie.$overloaded).toBe(false);

			expect(Object.keys(james.$load).length).toEqual(2);
			["09", "11"].forEach(key => {
				expect(james.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(james.$total).toBe(16);
			expect(james.$overloaded).toBe(false);

			expect(Object.keys(devTeam.$load).length).toEqual(5);
			["06", "07", "08"].forEach(key => {
				expect(devTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 75,
					hours: 12,
				});
			});
			["09", "11"].forEach(key => {
				expect(devTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 50,
					hours: 8,
				});
			});
			expect(devTeam.$total).toBe(52);
			expect(devTeam.$overloaded).toBe(false);

			expect(Object.keys(qaTeam.$load).length).toEqual(2);
			["09", "11"].forEach(key => {
				expect(qaTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(qaTeam.$total).toBe(16);
			expect(qaTeam.$overloaded).toBe(false);
		});

		test("can recompute loads and total for each resource when assignment added", () => {
			const tasks = [
				{
					id: 1,
					text: "Task 1",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 6),
					end: new Date(2026, 3, 9),
				},
			];
			initStore({ tasks, resources });

			store.in.exec("add-assignment", {
				id: 5,
				assignment: { task: 1, resource: "r1" },
			});
			vi.advanceTimersByTime(1);

			const state = store.getState();
			const alex = state.resources!.byId("r1");
			const devTeam = state.resources!.byId("dev");

			expect(Object.keys(alex.$load).length).toEqual(3);
			["06", "07", "08"].forEach(key => {
				expect(alex.$load[`2026-04-${key}`]).toEqual({
					percent: 100,
					hours: 8,
				});
			});
			expect(alex.$total).toBe(24);
			expect(alex.$overloaded).toBe(false);

			expect(Object.keys(devTeam.$load).length).toEqual(3);
			["06", "07", "08"].forEach(key => {
				expect(devTeam.$load[`2026-04-${key}`]).toEqual({
					percent: 50,
					hours: 8,
				});
			});
			expect(devTeam.$total).toBe(24);
			expect(devTeam.$overloaded).toBe(false);
		});

		test("can recompute loads for each resource when task is deleted", () => {
			initStore({ resources, assignments });

			store.in.exec("delete-task", { id: 2 });
			vi.advanceTimersByTime(1);

			let state = store.getState();
			let alex = state.resources!.byId("r1");
			let james = state.resources!.byId("r3");
			let devTeam = state.resources!.byId("dev");
			let qaTeam = state.resources!.byId("qa");

			expect(Object.keys(alex.$load).length).toEqual(3);
			["2024-04-02", "2024-04-03", "2024-04-04"].forEach(key => {
				expect(alex.$load[key]).toEqual({ percent: 100, hours: 8 });
			});
			expect(alex.$total).toBe(24);
			expect(alex.$overloaded).toBe(false);

			expect(Object.keys(james.$load).length).toEqual(0);
			expect(james.$load).toEqual({});
			expect(james.$total).toBe(0);
			expect(james.$overloaded).toBe(false);

			expect(Object.keys(devTeam.$load).length).toEqual(3);
			["2024-04-02", "2024-04-03", "2024-04-04"].forEach(key => {
				expect(devTeam.$load[key]).toEqual({ percent: 75, hours: 12 });
			});
			expect(devTeam.$total).toBe(36);
			expect(devTeam.$overloaded).toBe(false);

			expect(Object.keys(qaTeam.$load).length).toEqual(0);
			expect(qaTeam.$load).toEqual({});
			expect(qaTeam.$total).toBe(0);
			expect(qaTeam.$overloaded).toBe(false);

			store.in.exec("delete-task", { id: 1 });
			vi.advanceTimersByTime(1);

			state = store.getState();
			const sophie = state.resources!.byId("r2");
			alex = state.resources!.byId("r1");
			james = state.resources!.byId("r3");
			devTeam = state.resources!.byId("dev");
			qaTeam = state.resources!.byId("qa");

			[alex, sophie, james, devTeam, qaTeam].forEach(resource => {
				expect(Object.keys(resource.$load).length).toEqual(0);
				expect(resource.$load).toEqual({});
				expect(resource.$total).toBe(0);
				expect(resource.$overloaded).toBe(false);
			});
		});

		test("can recompute loads for each resource when parent task with children is deleted", () => {
			initStore({ resources, assignments });

			store.in.exec("add-task", {
				target: 2,
				mode: "child",
				task: {
					id: 3,
					text: "Task 3",
					start: new Date(2024, 3, 6),
					duration: 2,
				},
			});
			vi.advanceTimersByTime(1);

			store.in.exec("add-assignment", {
				id: 5,
				assignment: { task: 3, resource: "r3" },
			});
			vi.advanceTimersByTime(1);

			store.in.exec("delete-task", { id: 2 });
			vi.advanceTimersByTime(1);

			const state = store.getState();
			const alex = state.resources!.byId("r1");
			const sophie = state.resources!.byId("r2");
			const james = state.resources!.byId("r3");
			const devTeam = state.resources!.byId("dev");
			const qaTeam = state.resources!.byId("qa");

			expect(Object.keys(alex.$load).length).toEqual(3);
			["2024-04-02", "2024-04-03", "2024-04-04"].forEach(key => {
				expect(alex.$load[key]).toEqual({ percent: 100, hours: 8 });
			});
			expect(alex.$total).toBe(24);
			expect(alex.$overloaded).toBe(false);

			expect(Object.keys(sophie.$load).length).toEqual(3);
			["2024-04-02", "2024-04-03", "2024-04-04"].forEach(key => {
				expect(sophie.$load[key]).toEqual({ percent: 50, hours: 4 });
			});
			expect(sophie.$total).toBe(12);
			expect(sophie.$overloaded).toBe(false);

			expect(james.$load).toEqual({});
			expect(james.$total).toBe(0);
			expect(james.$overloaded).toBe(false);

			expect(Object.keys(devTeam.$load).length).toEqual(3);
			["2024-04-02", "2024-04-03", "2024-04-04"].forEach(key => {
				expect(devTeam.$load[key]).toEqual({ percent: 75, hours: 12 });
			});
			expect(devTeam.$total).toBe(36);
			expect(devTeam.$overloaded).toBe(false);

			expect(qaTeam.$load).toEqual({});
			expect(qaTeam.$total).toBe(0);
			expect(qaTeam.$overloaded).toBe(false);
		});
	});
});
