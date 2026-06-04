import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { DataStore } from "../src/index";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";
import type {
	IResource,
	IAssignment,
	ITask,
	IGroupByConfig,
} from "../src/types";

let store: DataStore;

const resources: IResource[] = [
	{ id: "dev", name: "Development Team" },
	{ id: "r1", name: "Alex", role: "Developer", parent: "dev" },
	{ id: "r2", name: "Sophie", role: "Designer", parent: "dev" },
	{ id: "qa", name: "QA Team" },
	{ id: "r3", name: "James", role: "QA Engineer", parent: "qa" },
];

/** Task 1: r1 + r2. Task 2: r1 + r3. Matches default getData() task ids. */
const assignments: IAssignment[] = [
	{ id: 1, task: 1, resource: "r1" },
	{ id: 2, task: 1, resource: "r2", units: 50 },
	{ id: 3, task: 2, resource: "r1" },
	{ id: 4, task: 2, resource: "r3" },
];

function initStore(
	extra?: Partial<{
		resources: IResource[];
		assignments: IAssignment[];
		tasks: ITask[];
		groupBy: IGroupByConfig | null;
		wbs: boolean;
	}>
) {
	const data = getData();
	const tasks = extra?.tasks ?? data.tasks;
	store = new DataStore(writable);
	store.init({
		...data,
		tasks,
		resources: extra?.resources ?? resources,
		assignments: extra?.assignments ?? assignments,
		...(extra && "groupBy" in extra ? { groupBy: extra.groupBy } : {}),
		...(extra?.wbs ? { wbs: true } : {}),
	});
}

function delay() {
	vi.advanceTimersByTime(1);
}

function rootChildren() {
	return store.getState().tree.byId(0).data;
}

function collectTaskOriginalIds(): (number | string)[] {
	const ids: (number | string)[] = [];
	const walk = (nodes: any[]) => {
		for (const n of nodes || []) {
			if (n.$id != null) ids.push(n.$id);
			if (n.data?.length) walk(n.data);
		}
	};
	walk(rootChildren() as any);
	return ids;
}

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
	vi.useRealTimers();
});

describe("groupBy and group-tasks", () => {
	describe("groupBy field resource (resources + assignments)", () => {
		test("groups by resource; multi-assigned task appears under each resource", () => {
			initStore({ groupBy: { field: "resource" } });
			delay();

			expect(store.getState().groupBy).toMatchObject({
				field: "resource",
			});
			const roots = rootChildren();
			const groupIds = roots.filter(r => r.$group).map(r => r.id);
			expect(groupIds.some(id => String(id).includes("r1"))).toBe(true);
			expect(groupIds.some(id => String(id).includes("r2"))).toBe(true);
			expect(groupIds.some(id => String(id).includes("r3"))).toBe(true);

			const originals = collectTaskOriginalIds();
			expect(originals.filter(id => id === 1).length).toBe(2);
			expect(originals.filter(id => id === 2).length).toBe(2);
		});

		test("multipleResources: true keeps one row per task with combined key", () => {
			initStore({
				groupBy: { field: "resource", multipleResources: true },
			});
			delay();

			expect(store.getState().groupBy).toMatchObject({
				field: "resource",
				multipleResources: true,
			});
			const originals = collectTaskOriginalIds();
			expect(originals.filter(id => id === 1).length).toBe(1);
			expect(originals.filter(id => id === 2).length).toBe(1);
			const comboGroup = rootChildren().find(
				g => g.$group && String(g.$groupValue) === "r1,r2"
			);
			expect(comboGroup).toBeDefined();
		});

		test("resourceHierarchy and taskHierarchy nest tasks under resource tree", () => {
			initStore({
				groupBy: {
					field: "resource",
					resourceHierarchy: true,
					taskHierarchy: true,
				},
			});
			delay();

			const roots = rootChildren();
			const dev = roots.find(
				r => r.$group && r.$resource && r.id === "dev"
			);
			expect(dev).toBeDefined();
			const alex = dev?.data?.find((c: any) => c.id === "r1");
			expect(alex?.data?.some((t: any) => t.$id === 1)).toBe(true);
			const sophie = dev?.data?.find((c: any) => c.id === "r2");
			expect(sophie?.data?.some((t: any) => t.$id === 1)).toBe(true);
		});
	});

	describe("groupBy field duration", () => {
		const durationTasks: ITask[] = [
			{
				id: 1,
				text: "Parent task",
				type: "task",
				parent: 0,
				open: true,
				start: new Date(2026, 3, 1),
				end: new Date(2026, 3, 20),
			},
			{
				id: 10,
				text: "Three days",
				type: "task",
				parent: 1,
				start: new Date(2026, 3, 1),
				end: new Date(2026, 3, 4),
			},
			{
				id: 11,
				text: "Two days",
				type: "task",
				parent: 1,
				start: new Date(2026, 3, 10),
				end: new Date(2026, 3, 12),
			},
			{
				id: 20,
				text: "Ungrouped placeholder",
				type: "task",
				parent: 0,
				unscheduled: true,
			},
		];

		test("groups leaf tasks by duration value", () => {
			initStore({
				tasks: durationTasks,
				resources: [],
				assignments: [],
				groupBy: { field: "duration" },
			});
			delay();

			const roots = rootChildren();
			const durationGroups = roots.filter(
				r => r.$group && r.$groupValue !== "$ungrouped"
			);
			const values = durationGroups.map(g => g.$groupValue).sort();
			expect(values).toContain(2);
			expect(values).toContain(3);
		});

		test("taskHierarchy preserves parent/child under duration; ungrouped top lists unscheduled first", () => {
			initStore({
				tasks: durationTasks,
				resources: [],
				assignments: [],
				groupBy: {
					field: "duration",
					taskHierarchy: true,
					ungrouped: "top",
				},
			});
			delay();

			const roots = rootChildren();
			expect(roots[0].$groupValue).toBe("$ungrouped");
			expect(roots[0].data?.some((t: any) => t.$id === 20)).toBe(true);

			const threeDay = roots.find(
				(r: any) => r.$group && r.$groupValue === 3
			);
			expect(threeDay?.data?.some((t: any) => t.$id === 1)).toBe(true);
		});
	});

	describe("wbs + groupBy", () => {
		const wbsTasks: ITask[] = [
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
				text: "Three days",
				type: "task",
				parent: 1,
				start: new Date(2026, 3, 1),
				end: new Date(2026, 3, 4),
			},
			{
				id: 11,
				text: "Two days",
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
		];

		function findTaskInTree(originalId: number) {
			let found: any;
			const walk = (nodes: any[]) => {
				for (const n of nodes || []) {
					if (n.$id === originalId) {
						found = n;
						return;
					}
					if (n.data?.length) walk(n.data);
				}
			};
			walk(rootChildren() as any);
			return found;
		}

		test("leaf $wbs codes reflect original tree position, not grouped position", () => {
			initStore({
				tasks: wbsTasks,
				resources: [],
				assignments: [],
				wbs: true,
				groupBy: { field: "duration" },
			});
			delay();

			// Original tree position: 1.10 → "1.1", 1.11 → "1.2", 2 → "2"
			expect(findTaskInTree(10)?.$wbs).toBe("1.1");
			expect(findTaskInTree(11)?.$wbs).toBe("1.2");
			expect(findTaskInTree(2)?.$wbs).toBe("2");
		});

		test("group header rows do not get a $wbs code", () => {
			initStore({
				tasks: wbsTasks,
				resources: [],
				assignments: [],
				wbs: true,
				groupBy: { field: "duration" },
			});
			delay();

			const groupHeaders = rootChildren().filter((r: any) => r.$group);
			expect(groupHeaders.length).toBeGreaterThan(0);
			groupHeaders.forEach((g: any) => expect(g.$wbs).toBeUndefined());
		});

		test("task duplicated across groups carries the same $wbs in every copy", () => {
			initStore({
				wbs: true,
				groupBy: { field: "resource" },
			});
			delay();

			// task 1 is assigned to r1 and r2 — it appears under both groups
			const copies: any[] = [];
			const walk = (nodes: any[]) => {
				for (const n of nodes || []) {
					if (n.$id === 1) copies.push(n);
					if (n.data?.length) walk(n.data);
				}
			};
			walk(rootChildren() as any);

			expect(copies.length).toBe(2);
			const wbsCodes = copies.map(c => c.$wbs);
			expect(new Set(wbsCodes).size).toBe(1);
			expect(wbsCodes[0]).toBeTruthy();
		});
	});

	describe("group-tasks action", () => {
		test("sets groupBy and builds resource tree with taskHierarchy", () => {
			initStore();
			expect(store.getState().groupBy?.field).toBeNull();

			store.in.exec("group-tasks", {
				field: "resource",
				taskHierarchy: true,
			});
			delay();

			expect(store.getState().groupBy).toEqual({
				field: "resource",
				taskHierarchy: true,
			});
			const originals = collectTaskOriginalIds();
			expect(originals.filter(id => id === 1).length).toBe(2);
			const r1Group = rootChildren().find(
				(r: any) => r.$group && r.$groupValue === "r1"
			);
			expect(r1Group?.data?.some((t: any) => t.$id === 1)).toBe(true);
		});

		test("group-tasks with falsy field disables grouping", () => {
			initStore();
			store.in.exec("group-tasks", { field: "resource" });
			delay();
			store.in.exec("group-tasks", { field: null });
			delay();

			expect(store.getState().groupBy).toEqual({ field: null });
			expect(store.getState().tree.byId(1).text).toBe("Task 1");
		});
	});
});
