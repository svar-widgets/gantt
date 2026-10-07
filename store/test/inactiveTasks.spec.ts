import { describe, test, expect } from "vitest";
import { DataStore, normalizeLinks } from "../src/index";
import { writable } from "svelte/store";
import { setSummaryDates } from "../src/tasks";
import { parseTreeDates } from "../src/normalizeDates";
import GanttDataTree from "../src/GanttDataTree";
import { getData } from "./stubs/data";
import type { ITask } from "../src/types";

const day = (d: number) => new Date(2024, 3, d);

function getStore(tasks: any[], config: any = {}) {
	const store = new DataStore(writable);
	store.init({
		...getData(),
		tasks,
		inactiveTasks: true,
		...config,
		links: normalizeLinks(config.links || []),
	});
	return store;
}

const byId = (store: DataStore, id: any) => store.getState().tasks.byId(id);
// an absent flag reads as active
const isInactive = (store: DataStore, id: any) => !!byId(store, id).inactive;

describe("inactive tasks", () => {
	describe("derivation on load", () => {
		test("a summary is inactive when every member is", () => {
			const store = getStore([
				{ id: 1, type: "summary", text: "Phase 1" },
				{
					id: 2,
					parent: 1,
					start: day(2),
					duration: 2,
					inactive: true,
				},
				{
					id: 3,
					parent: 1,
					start: day(4),
					duration: 2,
					inactive: true,
				},
			]);

			expect(byId(store, 1).inactive).to.eq(true);
		});

		test("a supplied flag on a summary is kept", () => {
			const store = getStore([
				{ id: 4, type: "summary", text: "Phase 2", inactive: true },
				{ id: 5, parent: 4, start: day(2), duration: 2 },
			]);

			expect(byId(store, 4).inactive).to.eq(true);
			// a load is not a toggle, nothing is written down
			expect(byId(store, 5).inactive).to.be.undefined;
		});

		test("derives bottom-up whatever the array order", () => {
			const store = getStore([
				{ id: 1, type: "summary" },
				{ id: 2, parent: 1, type: "summary" },
				{
					id: 3,
					parent: 2,
					start: day(2),
					duration: 2,
					inactive: true,
				},
			]);

			expect(byId(store, 2).inactive).to.eq(true);
			expect(byId(store, 1).inactive).to.eq(true);
		});

		test("a branch task's descendants are members of the summary above", () => {
			const store = getStore([
				{ id: 1, type: "summary", text: "Release" },
				{ id: 2, parent: 1, start: day(2), duration: 2, text: "QA" },
				{
					id: 3,
					parent: 2,
					start: day(4),
					duration: 2,
					inactive: true,
				},
				{
					id: 4,
					parent: 2,
					start: day(6),
					duration: 2,
					inactive: true,
				},
				{
					id: 5,
					parent: 1,
					start: day(8),
					duration: 2,
					inactive: true,
				},
			]);

			// QA is active, so not every member of Release is inactive
			expect(isInactive(store, 1)).to.eq(false);
			// and the span is taken over the active members alone
			expect(byId(store, 1).start).to.deep.eq(day(2));
			expect(byId(store, 1).end).to.deep.eq(day(4));
		});

		test("leaves the flag alone while the option is off", () => {
			const store = getStore(
				[
					{ id: 1, type: "summary", inactive: true },
					{ id: 2, parent: 1, start: day(2), duration: 2 },
				],
				{ inactiveTasks: false }
			);

			expect(byId(store, 1).inactive).to.eq(true);
		});
	});

	describe("span over counted members", () => {
		test("an active summary skips its inactive members", () => {
			const store = getStore([
				{ id: 1, type: "summary" },
				{ id: 2, parent: 1, start: day(2), duration: 2 },
				{
					id: 3,
					parent: 1,
					start: day(10),
					duration: 2,
					inactive: true,
				},
			]);

			expect(byId(store, 1).end).to.deep.eq(day(4));
		});

		test("an inactive summary counts all of them", () => {
			const store = getStore([
				{ id: 1, type: "summary" },
				{
					id: 2,
					parent: 1,
					start: day(2),
					duration: 2,
					inactive: true,
				},
				{
					id: 3,
					parent: 1,
					start: day(10),
					duration: 2,
					inactive: true,
				},
			]);

			expect(byId(store, 1).inactive).to.eq(true);
			expect(byId(store, 1).start).to.deep.eq(day(2));
			expect(byId(store, 1).end).to.deep.eq(day(12));
		});

		test("an inactive branch task drops its own dates, not its children's", () => {
			const summary = setSummaryDates(
				{
					id: 1,
					type: "summary",
					data: [
						{
							id: 2,
							start: day(1),
							end: day(20),
							inactive: true,
							data: [{ id: 3, start: day(5), end: day(8) }],
						},
					],
				} as ITask,
				false,
				true
			);

			expect(summary.inactive).to.eq(false);
			expect(summary.start).to.deep.eq(day(5));
			expect(summary.end).to.deep.eq(day(8));
		});

		test("a nested summary is excluded as one unit", () => {
			const summary = setSummaryDates(
				{
					id: 1,
					type: "summary",
					data: [
						{ id: 2, start: day(2), end: day(4) },
						{
							id: 3,
							type: "summary",
							start: day(1),
							end: day(20),
							inactive: true,
							data: [{ id: 4, start: day(1), end: day(20) }],
						},
					],
				} as ITask,
				false,
				true
			);

			expect(summary.start).to.deep.eq(day(2));
			expect(summary.end).to.deep.eq(day(4));
		});
	});

	describe("derivation on edit", () => {
		const tree = () => [
			{ id: 1, type: "summary", text: "Release" },
			{ id: 2, parent: 1, start: day(2), duration: 2, inactive: true },
			{ id: 3, parent: 1, start: day(4), duration: 2, inactive: true },
		];

		test("activating one member activates the summary only", () => {
			const store = getStore(tree());
			expect(byId(store, 1).inactive).to.eq(true);

			store.in.exec("update-task", {
				id: 3,
				task: { inactive: false },
			});

			expect(byId(store, 1).inactive).to.eq(false);
			expect(byId(store, 2).inactive).to.eq(true);
			expect(byId(store, 3).inactive).to.eq(false);
		});

		test("deactivating the last active member deactivates the summary", () => {
			const store = getStore([
				{ id: 1, type: "summary" },
				{ id: 2, parent: 1, start: day(2), duration: 2 },
			]);

			store.in.exec("update-task", { id: 2, task: { inactive: true } });

			expect(byId(store, 1).inactive).to.eq(true);
		});

		test("an active task added under an inactive summary activates the chain", () => {
			const store = getStore([
				{ id: 1, type: "summary" },
				{ id: 2, parent: 1, type: "summary" },
				{
					id: 3,
					parent: 2,
					start: day(2),
					duration: 2,
					inactive: true,
				},
			]);
			expect(byId(store, 1).inactive).to.eq(true);

			store.in.exec("add-task", {
				task: { start: day(4), duration: 2, parent: 2 },
			});

			expect(byId(store, 2).inactive).to.eq(false);
			expect(byId(store, 1).inactive).to.eq(false);
		});

		test("deleting the last active member deactivates the chain", () => {
			const store = getStore([
				{ id: 1, type: "summary" },
				{
					id: 2,
					parent: 1,
					start: day(2),
					duration: 2,
					inactive: true,
				},
				{ id: 3, parent: 1, start: day(4), duration: 2 },
			]);
			expect(isInactive(store, 1)).to.eq(false);

			store.in.exec("delete-task", { id: 3 });

			expect(byId(store, 1).inactive).to.eq(true);
		});

		test("a move re-derives both the source and the target chain", () => {
			const store = getStore([
				{ id: 1, type: "summary" },
				{ id: 2, parent: 1, start: day(2), duration: 2 },
				{
					id: 5,
					parent: 1,
					start: day(6),
					duration: 2,
					inactive: true,
				},
				{ id: 3, type: "summary" },
				{
					id: 4,
					parent: 3,
					start: day(4),
					duration: 2,
					inactive: true,
				},
			]);
			expect(isInactive(store, 3)).to.eq(true);

			store.in.exec("move-task", { id: 2, mode: "child", target: 3 });

			expect(isInactive(store, 1)).to.eq(true);
			expect(isInactive(store, 3)).to.eq(false);
		});

		test("a flag change is not a container drag", () => {
			const store = getStore([
				{ id: 1, type: "summary" },
				{ id: 2, parent: 1, start: day(2), duration: 2 },
				{ id: 3, parent: 1, start: day(10), duration: 2 },
			]);

			store.in.exec("update-task", { id: 3, task: { inactive: true } });

			expect(byId(store, 2).start).to.deep.eq(day(2));
			expect(byId(store, 3).start).to.deep.eq(day(10));
			expect(byId(store, 1).end).to.deep.eq(day(4));
		});
	});

	describe("propagation", () => {
		test("an explicit toggle writes down onto every descendant", () => {
			const store = getStore([
				{ id: 1, type: "summary" },
				{ id: 2, parent: 1, start: day(2), duration: 2 },
				{ id: 3, parent: 1, type: "summary" },
				{ id: 4, parent: 3, start: day(4), duration: 2 },
			]);

			store.in.exec("update-task", { id: 1, task: { inactive: true } });

			[1, 2, 3, 4].forEach(id =>
				expect(byId(store, id).inactive, `task ${id}`).to.eq(true)
			);
		});

		test("reactivating a summary resets its subtree to active", () => {
			const store = getStore([
				{ id: 1, type: "summary" },
				{ id: 2, parent: 1, start: day(2), duration: 2 },
				{
					id: 3,
					parent: 1,
					start: day(4),
					duration: 2,
					inactive: true,
				},
			]);

			store.in.exec("update-task", { id: 1, task: { inactive: true } });
			store.in.exec("update-task", { id: 1, task: { inactive: false } });

			expect(byId(store, 2).inactive).to.eq(false);
			expect(byId(store, 3).inactive).to.eq(false);
		});

		test("a nested summary's span follows the toggle", () => {
			const store = getStore([
				{ id: 1, type: "summary" },
				{ id: 2, parent: 1, type: "summary" },
				{ id: 3, parent: 2, start: day(2), duration: 2 },
				{
					id: 4,
					parent: 2,
					start: day(10),
					duration: 2,
					inactive: true,
				},
			]);
			expect(byId(store, 2).end).to.deep.eq(day(4));

			store.in.exec("update-task", { id: 1, task: { inactive: true } });

			expect(byId(store, 2).end).to.deep.eq(day(12));
		});

		test("a nested summary's re-derived span is sent", () => {
			const store = getStore([
				{ id: 1, type: "summary" },
				{ id: 2, parent: 1, type: "summary" },
				{ id: 3, parent: 2, start: day(2), duration: 2 },
				{
					id: 4,
					parent: 2,
					start: day(10),
					duration: 2,
					inactive: true,
				},
			]);
			const updates: any[] = [];
			store.in.on("update-task", (ev: any) => {
				if (ev.id === 2) updates.push(ev);
			});

			store.in.exec("update-task", { id: 1, task: { inactive: true } });

			updates.forEach(ev => expect(ev.skipProvider).to.eq(undefined));
			const last = updates[updates.length - 1];
			expect(last.eventSource).to.eq("update-task");
			expect(last.task.inactive).to.eq(true);
			expect(last.task.start).to.deep.eq(day(2));
			expect(last.task.end).to.deep.eq(day(12));
		});

		test("a derived write pushes nothing down", () => {
			const store = getStore([
				{ id: 1, type: "summary" },
				{
					id: 2,
					parent: 1,
					start: day(2),
					duration: 2,
					inactive: true,
				},
				{
					id: 3,
					parent: 1,
					start: day(4),
					duration: 2,
					inactive: true,
				},
			]);

			store.in.exec("update-task", { id: 3, task: { inactive: false } });

			// Release went active by derivation, and did not clear Design
			expect(byId(store, 1).inactive).to.eq(false);
			expect(byId(store, 2).inactive).to.eq(true);
		});
	});

	describe("undo and redo", () => {
		const mixed = () => [
			{ id: 1, type: "summary" },
			{ id: 2, parent: 1, start: day(2), duration: 2 },
			{ id: 3, parent: 1, start: day(10), duration: 2, inactive: true },
		];

		test("one toggle is one step", () => {
			const store = getStore(mixed(), { undo: true });

			store.in.exec("update-task", { id: 1, task: { inactive: true } });

			expect(store.getState().history.undo).to.eq(1);
		});

		test("undo restores every descendant the toggle wrote", () => {
			const store = getStore(mixed(), { undo: true });

			store.in.exec("update-task", { id: 1, task: { inactive: true } });
			expect(isInactive(store, 2)).to.eq(true);

			store.in.exec("undo", {});

			expect(isInactive(store, 1)).to.eq(false);
			expect(isInactive(store, 2)).to.eq(false);
			expect(isInactive(store, 3)).to.eq(true);
		});

		test("the summary span is re-derived on the way back", () => {
			const store = getStore(mixed(), { undo: true });
			expect(byId(store, 1).end).to.deep.eq(day(4));

			store.in.exec("update-task", { id: 1, task: { inactive: true } });
			expect(byId(store, 1).end).to.deep.eq(day(12));

			store.in.exec("undo", {});

			expect(byId(store, 1).end).to.deep.eq(day(4));
		});

		test("redo reapplies it", () => {
			const store = getStore(mixed(), { undo: true });

			store.in.exec("update-task", { id: 1, task: { inactive: true } });
			store.in.exec("undo", {});
			store.in.exec("redo", {});

			expect(isInactive(store, 1)).to.eq(true);
			expect(isInactive(store, 2)).to.eq(true);
			expect(byId(store, 1).end).to.deep.eq(day(12));
		});

		test("a nested summary's span follows undo and redo", () => {
			const store = getStore(
				[
					{ id: 1, type: "summary" },
					{ id: 2, parent: 1, type: "summary" },
					{ id: 3, parent: 2, start: day(2), duration: 2 },
					{
						id: 4,
						parent: 2,
						start: day(10),
						duration: 2,
						inactive: true,
					},
				],
				{ undo: true }
			);

			store.in.exec("update-task", { id: 1, task: { inactive: true } });
			expect(byId(store, 2).end).to.deep.eq(day(12));
			expect(store.getState().history.undo).to.eq(1);

			store.in.exec("undo", {});
			expect(isInactive(store, 2)).to.eq(false);
			expect(byId(store, 2).end).to.deep.eq(day(4));

			store.in.exec("redo", {});
			expect(isInactive(store, 2)).to.eq(true);
			expect(byId(store, 2).end).to.deep.eq(day(12));
		});
	});

	describe("split tasks", () => {
		test("a split task is excluded as a single unit", () => {
			const store = getStore(
				[
					{ id: 1, type: "summary" },
					{ id: 2, parent: 1, start: day(2), duration: 2 },
					{
						id: 3,
						parent: 1,
						start: day(10),
						end: day(20),
						segments: [
							{ start: day(10), end: day(12) },
							{ start: day(18), end: day(20) },
						],
					},
				],
				{ splitTasks: true }
			);
			expect(byId(store, 1).end).to.deep.eq(day(20));

			store.in.exec("update-task", { id: 3, task: { inactive: true } });

			expect(byId(store, 3).inactive).to.eq(true);
			expect(byId(store, 3).segments.length).to.eq(2);
			expect(byId(store, 1).end).to.deep.eq(day(4));
		});
	});

	describe("the option toggle", () => {
		test("turning it on derives the flag and reselects the span", () => {
			const tasks = [
				{ id: 1, type: "summary" },
				{
					id: 2,
					parent: 1,
					start: day(2),
					duration: 2,
					inactive: true,
				},
				{
					id: 3,
					parent: 1,
					start: day(10),
					duration: 2,
					inactive: true,
				},
			];
			const store = getStore(tasks, { inactiveTasks: false });
			expect(byId(store, 1).inactive).to.be.undefined;

			store.init({ inactiveTasks: true });

			expect(byId(store, 1).inactive).to.eq(true);
			expect(byId(store, 1).end).to.deep.eq(day(12));
		});

		test("turning it off leaves the flag and counts every member", () => {
			const store = getStore([
				{ id: 1, type: "summary" },
				{ id: 2, parent: 1, start: day(2), duration: 2 },
				{
					id: 3,
					parent: 1,
					start: day(10),
					duration: 2,
					inactive: true,
				},
			]);
			expect(byId(store, 1).end).to.deep.eq(day(4));

			store.init({ inactiveTasks: false });

			expect(byId(store, 1).end).to.deep.eq(day(12));
			expect(byId(store, 3).inactive).to.eq(true);
		});
	});

	describe("resource load", () => {
		const withLoad = (inactive: boolean) =>
			getStore(
				[
					{ id: 1, start: day(2), duration: 2 },
					{ id: 2, start: day(6), duration: 2, inactive },
				],
				{
					resources: [{ id: "r1", name: "Alex" }],
					assignments: [
						{ id: 1, task: 1, resource: "r1" },
						{ id: 2, task: 2, resource: "r1" },
					],
				}
			);

		const totalOf = (store: DataStore) =>
			store.getState()._resources.find(r => r.id === "r1").$total;

		test("an inactive task's assignment carries no load", () => {
			expect(totalOf(withLoad(true))).to.be.lessThan(
				totalOf(withLoad(false))
			);
		});

		test("the assignment itself is kept", () => {
			const store = withLoad(true);

			expect(store.getTaskResources(2).length).to.eq(1);
		});

		test("reactivating restores the load unchanged", async () => {
			const store = withLoad(true);

			store.in.exec("update-task", { id: 2, task: { inactive: false } });
			// derived state lands a tick after the raw write
			await new Promise(r => setTimeout(r, 5));

			expect(totalOf(store)).to.eq(totalOf(withLoad(false)));
		});
	});

	describe("parseTreeDates", () => {
		test("keeps a summary's supplied flag and dates", () => {
			const tasks = new GanttDataTree([
				{
					id: 1,
					type: "summary",
					start: day(1),
					end: day(20),
					inactive: true,
				},
				{ id: 2, parent: 1, start: day(2), end: day(4) },
			] as any);

			parseTreeDates(
				tasks,
				{ durationUnit: "day", inactiveTasks: true },
				() => undefined
			);

			const summary = tasks.byId(1);
			expect(summary.inactive).to.eq(true);
			expect(summary.start).to.deep.eq(day(1));
			expect(summary.end).to.deep.eq(day(20));
		});

		test("derives a missing flag and keeps supplied dates", () => {
			const tasks = new GanttDataTree([
				{ id: 1, type: "summary", start: day(1), end: day(20) },
				{
					id: 2,
					parent: 1,
					start: day(2),
					end: day(4),
					inactive: true,
				},
			] as any);

			parseTreeDates(
				tasks,
				{ durationUnit: "day", inactiveTasks: true },
				() => undefined
			);

			const summary = tasks.byId(1);
			expect(summary.inactive).to.eq(true);
			expect(summary.start).to.deep.eq(day(1));
			expect(summary.end).to.deep.eq(day(20));
		});

		test("a supplied flag decides which members a derived span counts", () => {
			const tasks = new GanttDataTree([
				{ id: 1, type: "summary", inactive: false },
				{ id: 2, parent: 1, start: day(2), end: day(4) },
				{
					id: 3,
					parent: 1,
					start: day(10),
					end: day(12),
					inactive: true,
				},
			] as any);

			parseTreeDates(
				tasks,
				{ durationUnit: "day", inactiveTasks: true },
				() => undefined
			);

			const summary = tasks.byId(1);
			expect(summary.start).to.deep.eq(day(2));
			expect(summary.end).to.deep.eq(day(4));
		});
	});
});
