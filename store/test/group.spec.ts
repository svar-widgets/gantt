import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { DataStore, handleAction } from "../src/index";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";
import type {
	IResource,
	IAssignment,
	ITask,
	IGroupByConfig,
	TID,
} from "../src/types";

const imported = vi.hoisted(() => ({ data: null as any }));
vi.mock("@svar/lib-mspx", async importOriginal => ({
	...(await importOriginal<typeof import("@svar/lib-mspx")>()),
	mspx2gantt: () => imported.data,
}));

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
		undo: boolean;
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
		...(extra?.undo ? { undo: true } : {}),
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

	describe("grouped reorder", () => {
		const priorityTasks: ITask[] = [
			{
				id: 1,
				text: "High 1",
				type: "task",
				parent: 0,
				priority: "high",
				start: new Date(2026, 3, 1),
				end: new Date(2026, 3, 3),
			},
			{
				id: 2,
				text: "High 2",
				type: "task",
				parent: 0,
				priority: "high",
				start: new Date(2026, 3, 4),
				end: new Date(2026, 3, 6),
			},
			{
				id: 3,
				text: "Low 1",
				type: "task",
				parent: 0,
				priority: "low",
				start: new Date(2026, 3, 7),
				end: new Date(2026, 3, 9),
			},
		];

		function findItem(id: TID, groupValue?: string | number) {
			let found: any;
			const walk = (nodes: any[]) => {
				for (const n of nodes || []) {
					const taskId = n.$id ?? n.id;
					if (
						!n.$group &&
						taskId === id &&
						(n.$groupValue === groupValue ||
							String(n.$groupValue) === String(groupValue))
					) {
						found = n;
						return;
					}
					if (n.data?.length) walk(n.data);
				}
			};
			walk(rootChildren() as any);
			return found;
		}

		function groupedMove(
			id: TID,
			target: TID,
			mode: "before" | "after" = "after"
		) {
			store.in.exec("move-task", { id, target, mode, inProgress: true });
			store.in.exec("move-task", { id, target, mode, inProgress: false });
			delay();
		}

		test("updates grouped field when moved to another group", () => {
			initStore({
				tasks: priorityTasks,
				resources: [],
				assignments: [],
				groupBy: { field: "priority" },
			});
			delay();

			const source = findItem(1, "high");
			const target = findItem(3, "low");
			groupedMove(source.id, target.id, "after");

			expect(store.getState().tasks.byId(1).priority).toBe("low");
		});

		test("clears grouped field when moved to ungrouped", () => {
			const tasks: ITask[] = [
				...priorityTasks,
				{
					id: 4,
					text: "No priority",
					type: "task",
					parent: 0,
					priority: "",
					start: new Date(2026, 3, 10),
					end: new Date(2026, 3, 12),
				},
			];

			initStore({
				tasks,
				groupBy: { field: "priority", ungrouped: "bottom" },
			});
			delay();

			const source = findItem(1, "high");
			const target = findItem(4, "$ungrouped");
			groupedMove(source.id, target.id, "after");

			expect(store.getState().tasks.byId(1).priority).toBe("");
		});

		test("can undo/redo grouped move with field change", () => {
			initStore({
				tasks: priorityTasks,
				resources: [],
				assignments: [],
				groupBy: { field: "priority" },
				undo: true,
			});
			delay();

			const source = findItem(1, "high");
			const target = findItem(3, "low");
			groupedMove(source.id, target.id, "after");
			expect(store.getState().tasks.byId(1).priority).toBe("low");

			store.in.exec("undo");
			delay();
			expect(store.getState().tasks.byId(1).priority).toBe("high");

			store.in.exec("redo");
			delay();
			expect(store.getState().tasks.byId(1).priority).toBe("low");
		});

		test("multipleResources: assigns all group resources when moved into combo group", () => {
			initStore({
				groupBy: { field: "resource", multipleResources: true },
			});
			delay();

			const target = findItem(1, "r1,r2");
			const source = findItem(2, "r1,r3");
			expect(target).toBeDefined();
			expect(source).toBeDefined();

			groupedMove(source.id, target.id, "after");

			const taskAssignments = (
				store.getState()._assignments.byTask[2] || []
			)
				.map((a: IAssignment) => a.resource)
				.sort();
			expect(taskAssignments).toEqual(["r1", "r2"]);

			const comboGroup = rootChildren().find(
				(g: any) => g.$group && String(g.$groupValue) === "r1,r2"
			);
			expect(comboGroup).toBeDefined();
		});

		test("updates resource assignment when moved between resource groups", () => {
			initStore({ groupBy: { field: "resource" } });
			delay();

			const source = findItem(1, "r1");
			const target = findItem(1, "r2");
			groupedMove(source.id, target.id, "after");

			const taskAssignments = (
				store.getState()._assignments.byTask[1] || []
			).map((a: IAssignment) => a.resource);
			expect(taskAssignments).toContain("r2");
			expect(taskAssignments).not.toContain("r1");
		});

		test("resourceHierarchy: removes empty leaf resource after last task is moved away", () => {
			initStore({
				assignments: [
					{ id: 1, task: 1, resource: "r1" },
					{ id: 2, task: 2, resource: "r2" },
				],
				groupBy: { field: "resource", resourceHierarchy: true },
			});
			delay();

			const dev = () => rootChildren().find((r: any) => r.id === "dev");
			const hasLeaf = (rId: TID) =>
				dev()?.data?.some((c: any) => c.id === rId);

			expect(hasLeaf("r1")).toBe(true);
			expect(hasLeaf("r2")).toBe(true);

			groupedMove(findItem(1, "r1").id, findItem(2, "r2").id, "after");

			expect(hasLeaf("r1")).toBe(false);
			expect(hasLeaf("r2")).toBe(true);
			expect(
				store.getState()._assignments.byTask[1].map(a => a.resource)
			).toEqual(["r2"]);
		});

		test("ignores up/down move-task when grouped", () => {
			initStore({
				tasks: priorityTasks,
				resources: [],
				assignments: [],
				groupBy: { field: "priority" },
			});
			delay();

			const branchBefore = store
				.getState()
				.tasks.getBranch(0)
				.map(t => t.id);

			store.in.exec("move-task", { id: 1, mode: "up" });
			store.in.exec("move-task", { id: 1, mode: "down" });
			delay();

			expect(
				store
					.getState()
					.tasks.getBranch(0)
					.map(t => t.id)
			).toEqual(branchBefore);
			expect(store.getState().tasks.byId(1).priority).toBe("high");
		});

		test("can undo resource assignment change after grouped move", () => {
			initStore({ groupBy: { field: "resource" }, undo: true });
			delay();

			const source = findItem(1, "r1");
			const target = findItem(1, "r2");
			groupedMove(source.id, target.id, "after");

			store.in.exec("undo");
			delay();

			const taskAssignments = (
				store.getState()._assignments.byTask[1] || []
			)
				.map((a: IAssignment) => a.resource)
				.sort();
			expect(taskAssignments).toEqual(["r1", "r2"]);
		});

		test("a skipUndo add-task records nothing, its assignment included", () => {
			initStore({ groupBy: { field: "resource" }, undo: true });
			delay();

			const group1 = rootChildren().find(
				(g: any) => g.$group && g.$groupValue === "r1"
			);

			store.in.exec("update-task", { id: 2, task: { text: "renamed" } });
			delay();

			// the group assigns the resource on add-task, and none of it is
			// undoable
			store.in.exec("add-task", {
				target: group1.id,
				mode: "child",
				task: { text: "New task", type: "task", duration: 1 },
				skipUndo: true,
			});
			delay();

			const newTaskId = store.getState().tasks.toArray().slice(-1)[0].id;
			const resourcesOf = (id: TID) =>
				(store.getState()._assignments.byTask[id] || []).map(
					(a: IAssignment) => a.resource
				);
			expect(resourcesOf(newTaskId)).toEqual(["r1"]);
			expect(store.getState().history).toEqual({ undo: 1, redo: 0 });

			store.in.exec("undo");
			delay();

			expect(store.getState().tasks.byId(2).text).to.eq("Task 2");
			expect(store.getState().tasks.byId(newTaskId)).toBeDefined();
			expect(resourcesOf(newTaskId)).toEqual(["r1"]);
		});

		test("can undo/redo add-task and grouped move without duplicate assignments", () => {
			initStore({ groupBy: { field: "resource" }, undo: true });
			delay();

			const group1 = rootChildren().find(
				(g: any) => g.$group && g.$groupValue === "r1"
			);
			store.in.exec("add-task", {
				target: group1.id,
				mode: "child",
				task: { text: "New task", type: "task", duration: 1 },
			});
			delay();

			const newTaskId = store.getState().tasks.toArray().slice(-1)[0].id;
			const item1 = findItem(newTaskId, "r1");
			const item2 = findItem(1, "r2");
			groupedMove(item1.id, item2.id, "after");

			expect(
				(store.getState()._assignments.byTask[newTaskId] || []).map(
					(a: IAssignment) => a.resource
				)
			).toEqual(["r2"]);

			store.in.exec("undo");
			delay();
			store.in.exec("undo");
			delay();
			expect(store.getState().tasks.byId(newTaskId)).toBeUndefined();

			store.in.exec("redo");
			delay();
			store.in.exec("redo");
			delay();

			expect(
				(store.getState()._assignments.byTask[newTaskId] || []).map(
					(a: IAssignment) => a.resource
				)
			).toEqual(["r2"]);
			expect(findItem(newTaskId, "r1")).toBeUndefined();
			expect(findItem(newTaskId, "r2")).toBeDefined();
		});

		test("toolbar add-task with multi-select uses last selected tree row", () => {
			initStore({ groupBy: { field: "resource" } });
			delay();

			const r1Task = findItem(1, "r1");
			const r2Task = findItem(1, "r2");
			store.in.exec("select-task", { id: r1Task.id, toggle: false });
			store.in.exec("select-task", { id: r2Task.id, toggle: true });
			delay();

			const tasksBefore = store.getState().tasks.toArray().length;
			handleAction(store, "add-task", null, (s: string) => s);
			delay();

			expect(store.getState().tasks.toArray().length).toBe(
				tasksBefore + 1
			);

			const newTaskId = store.getState().tasks.toArray().slice(-1)[0].id;
			expect(
				(store.getState()._assignments.byTask[newTaskId] || []).map(
					(a: IAssignment) => a.resource
				)
			).toEqual(["r2"]);
		});

		test("context menu add-task with multi-select uses menu target only", () => {
			initStore({ groupBy: { field: "resource" } });
			delay();

			const r1Task = findItem(1, "r1");
			const r2Task = findItem(1, "r2");
			store.in.exec("select-task", { id: r1Task.id, toggle: false });
			store.in.exec("select-task", { id: r2Task.id, toggle: true });
			delay();

			const tasksBefore = store.getState().tasks.toArray().length;
			handleAction(store, "add-task:after", r1Task.id, (s: string) => s);
			delay();

			expect(store.getState().tasks.toArray().length).toBe(
				tasksBefore + 1
			);

			const newTaskId = store.getState().tasks.toArray().slice(-1)[0].id;
			expect(
				(store.getState()._assignments.byTask[newTaskId] || []).map(
					(a: IAssignment) => a.resource
				)
			).toEqual(["r1"]);
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

	describe("filter reset on new dataset", () => {
		const newTasks = () =>
			getData().tasks.map(t => ({
				...t,
				id: `n${t.id}`,
				parent: t.parent ? `n${t.parent}` : 0,
			}));

		function visibleTaskIds() {
			return store
				.getState()
				.tree.toArray()
				.filter((t: ITask) => !t.$group)
				.map((t: ITask) => t.$id ?? t.id);
		}

		function initFiltered() {
			initStore({ groupBy: { field: "resource" } });
			delay();
			store.in.exec("filter-tasks", {
				filter: (t: ITask) => t.$id === 1,
			});
			delay();
			expect(visibleTaskIds()).toEqual([1, 1]);
		}

		test("init with new tasks clears the grouped tree filter", () => {
			initFiltered();
			const tasks = newTasks();
			store.init({
				...getData(),
				tasks,
				resources,
				assignments: [],
				groupBy: { field: "resource" },
			});
			delay();

			expect(store.getState()._isFiltered).toBe(false);
			expect(visibleTaskIds().sort()).toEqual(
				tasks.map(t => t.id).sort()
			);
		});

		test("import clears the grouped tree filter", () => {
			initFiltered();
			const tasks = newTasks();
			imported.data = { tasks, links: [] };
			store.in.exec("import-data", { data: "" });
			delay();

			expect(store.getState()._isFiltered).toBe(false);
			expect(visibleTaskIds().sort()).toEqual(
				tasks.map(t => t.id).sort()
			);
		});
	});
});
