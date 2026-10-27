import { describe, test, expect, beforeEach, vi } from "vitest";
import { DataStore, normalizeLinks } from "../src/index";
import { writable } from "svelte/store";
import { getData } from "./stubs/data";
import { deriveUnscheduled, normalizeDates } from "../src/normalizeDates";
import type { ITask } from "../src/types";

function getDataStore(data: any) {
	const store = new DataStore(writable);
	if (data.links) data.links = normalizeLinks(data.links);
	store.init({ ...data });
	return store;
}

describe("unscheduledTasks", () => {
	describe("normalizeDates", () => {
		test("marks task without start as unscheduled", () => {
			const task: Partial<ITask> = {
				type: "task",
				end: new Date(2024, 3, 10),
				duration: 2,
			};

			normalizeDates(
				task,
				{ unscheduledTasks: true, durationUnit: "day" },
				undefined
			);

			expect(task.unscheduled).to.eq(true);
			expect(task.start).to.eq(null);
		});

		test("marks summary task without start as unscheduled", () => {
			const task: Partial<ITask> = { type: "summary" };

			deriveUnscheduled(task);

			expect(task.unscheduled).to.eq(true);
		});

		test("takes start and type from the previous task for partial updates", () => {
			const prev: Partial<ITask> = {
				type: "task",
				start: new Date(2024, 3, 2),
				end: new Date(2024, 3, 5),
				duration: 3,
			};

			const progress: Partial<ITask> = { progress: 50 };
			deriveUnscheduled(progress, prev);
			expect(progress.unscheduled).to.eq(false);

			const summary: Partial<ITask> = { progress: 50 };
			deriveUnscheduled(summary, { ...prev, type: "summary" });
			expect(summary.unscheduled).to.eq(false);

			const cleared: Partial<ITask> = { start: null };
			deriveUnscheduled(cleared, prev);
			expect(cleared.unscheduled).to.eq(true);

			const stillUnscheduled: Partial<ITask> = { progress: 50 };
			deriveUnscheduled(stillUnscheduled, { type: "task", duration: 3 });
			expect(stillUnscheduled.unscheduled).to.eq(true);
		});

		test("recalculates dates of a partial update from the previous task", () => {
			const prev: Partial<ITask> = {
				type: "task",
				start: new Date(2024, 3, 2),
				end: new Date(2024, 3, 5),
				duration: 3,
			};
			const state = { unscheduledTasks: true, durationUnit: "day" };

			const duration: Partial<ITask> = { duration: 5 };
			normalizeDates(duration, state, undefined, prev);
			expect(duration.end).to.deep.eq(new Date(2024, 3, 7));

			const end: Partial<ITask> = { end: new Date(2024, 3, 4) };
			normalizeDates(end, state, undefined, prev);
			expect(end.duration).to.eq(2);
		});
	});

	describe("DataStore", () => {
		let store: DataStore;

		beforeEach(() => {
			store = getDataStore({
				...getData(),
				unscheduledTasks: true,
				tasks: [
					{
						id: 1,
						text: "Scheduled",
						type: "task",
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 5),
						duration: 3,
					},
					{
						id: 2,
						text: "Unscheduled",
						type: "task",
						parent: 0,
						end: new Date(2024, 3, 8),
						duration: 2,
					},
				],
			});
		});

		test("skips chart bar for unscheduled task", () => {
			const { _tasks } = store.getState();
			const scheduled = _tasks.find(t => t.id === 1);
			const unscheduled = _tasks.find(t => t.id === 2);

			expect(unscheduled?.$skip).to.eq(true);
			expect(scheduled?.$skip).to.not.eq(true);
		});

		test("clears end and keeps duration when start is cleared on update-task", () => {
			const { tasks } = store.getState();
			const duration = tasks.byId(1).duration;

			store.in.exec("update-task", {
				id: 1,
				task: { start: null },
			});

			expect(tasks.byId(1).unscheduled).to.eq(true);
			expect(tasks.byId(1).start).to.eq(null);
			expect(tasks.byId(1).end).to.eq(null);
			expect(tasks.byId(1).duration).to.eq(duration);
		});

		test("schedules task again when start date is set", () => {
			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: { start: null },
			});
			store.in.exec("update-task", {
				id: 1,
				task: { start: new Date(2024, 3, 4) },
			});

			expect(tasks.byId(1).unscheduled).to.eq(false);
			expect(tasks.byId(1).start).to.deep.eq(new Date(2024, 3, 4));
		});

		test("keeps task scheduled on updates that carry no dates", () => {
			const { tasks } = store.getState();
			const start = tasks.byId(1).start;

			store.in.exec("update-task", { id: 1, task: { progress: 50 } });

			expect(tasks.byId(1).progress).to.eq(50);
			expect(tasks.byId(1).unscheduled).to.not.eq(true);
			expect(tasks.byId(1).start).to.deep.eq(start);
			expect(tasks.byId(1).duration).to.eq(3);

			store.in.exec("update-task", {
				id: 1,
				task: { progress: 70 },
				eventSource: "update-task",
			});

			expect(tasks.byId(1).progress).to.eq(70);
			expect(tasks.byId(1).unscheduled).to.not.eq(true);
			expect(tasks.byId(1).start).to.deep.eq(start);
			expect(tasks.byId(1).duration).to.eq(3);
		});

		test("keeps unscheduled task unscheduled on updates that carry no dates", () => {
			const { tasks } = store.getState();

			store.in.exec("update-task", { id: 2, task: { progress: 50 } });

			expect(tasks.byId(2).progress).to.eq(50);
			expect(tasks.byId(2).unscheduled).to.eq(true);
			expect(tasks.byId(2).start).to.eq(null);
		});

		test("keeps dates when a grouped field changes", () => {
			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: { priority: "low" },
				eventSource: "move-task",
			});

			expect(tasks.byId(1).unscheduled).to.eq(false);
			expect(tasks.byId(1).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(1).duration).to.eq(3);
		});

		test("recalculates dates on partial date updates", () => {
			const { tasks } = store.getState();

			store.in.exec("update-task", { id: 1, task: { duration: 5 } });
			expect(tasks.byId(1).end).to.deep.eq(new Date(2024, 3, 7));
			expect(tasks.byId(1).unscheduled).to.not.eq(true);

			store.in.exec("update-task", {
				id: 1,
				task: { end: new Date(2024, 3, 4) },
			});
			expect(tasks.byId(1).duration).to.eq(2);
			expect(tasks.byId(1).unscheduled).to.not.eq(true);
		});

		test("creates unscheduled task via add-task", () => {
			const { tasks } = store.getState();

			store.in.exec("add-task", {
				target: 1,
				mode: "child",
				task: { id: 5, text: "New Task" },
			});

			expect(tasks.byId(5).unscheduled).to.eq(true);
			expect(tasks.byId(5).start).to.eq(null);
		});
	});

	describe("summary move", () => {
		test("leaves unscheduled kids in place", () => {
			const store = getDataStore({
				...getData(),
				unscheduledTasks: true,
				tasks: [
					{
						id: 1,
						text: "Summary",
						type: "summary",
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 12),
						duration: 10,
					},
					{
						id: 2,
						text: "Scheduled kid",
						type: "task",
						parent: 1,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 5),
						duration: 3,
					},
					{
						id: 3,
						text: "Unscheduled kid",
						type: "task",
						parent: 1,
						duration: 2,
					},
				],
			});
			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: {
					start: new Date(2024, 3, 4),
					end: new Date(2024, 3, 14),
				},
			});

			expect(tasks.byId(2).start).to.deep.eq(new Date(2024, 3, 4));
			expect(tasks.byId(3).start).to.eq(null);
			expect(tasks.byId(3).duration).to.eq(2);
			expect(tasks.byId(3).unscheduled).to.eq(true);
		});
	});

	describe("without unscheduledTasks", () => {
		test("restores the start date when an update clears it", () => {
			const store = getDataStore({
				...getData(),
				tasks: [
					{
						id: 1,
						text: "A",
						type: "task",
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 5),
						duration: 3,
					},
				],
			});
			const { tasks } = store.getState();

			store.in.exec("update-task", { id: 1, task: { start: null } });

			expect(tasks.byId(1).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(1).duration).to.eq(3);
		});
	});

	describe("autoProgress", () => {
		test("keeps the summary scheduled when its progress is recalculated", () => {
			const store = getDataStore({
				...getData(),
				unscheduledTasks: true,
				summary: { autoProgress: true },
				tasks: [
					{
						id: 1,
						text: "Summary",
						type: "summary",
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 5),
						duration: 3,
					},
					{
						id: 2,
						text: "Kid",
						type: "task",
						parent: 1,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 5),
						duration: 3,
						progress: 0,
					},
				],
			});
			const { tasks } = store.getState();

			store.in.exec("update-task", { id: 2, task: { progress: 40 } });

			expect(tasks.byId(1).progress).to.eq(40);
			expect(tasks.byId(1).unscheduled).to.eq(false);
			expect(tasks.byId(1).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(1).end).to.deep.eq(new Date(2024, 3, 5));
		});

		const progressStore = (tasks: any[], config: any = {}) =>
			getDataStore({
				...getData(),
				unscheduledTasks: true,
				summary: { autoProgress: true },
				links: [],
				tasks,
				...config,
			});

		test("leaves unscheduled members out of the rollup", () => {
			const store = progressStore([
				{ id: 1, type: "summary", parent: 0 },
				{
					id: 2,
					type: "task",
					parent: 1,
					start: new Date(2024, 3, 2),
					duration: 2,
					progress: 0,
				},
				{ id: 3, type: "task", parent: 1, duration: 8, progress: 0 },
				{ id: 4, type: "task", parent: 1, progress: 0 },
			]);
			const { tasks } = store.getState();

			store.in.exec("update-task", { id: 2, task: { progress: 100 } });
			expect(tasks.byId(1).progress).to.eq(100);

			store.in.exec("update-task", { id: 4, task: { progress: 50 } });
			expect(tasks.byId(1).progress).to.eq(100);
		});

		test("recalculates after a task becomes a summary and back", () => {
			const store = progressStore(
				[
					{ id: 1, type: "summary", parent: 0, manual: true },
					{
						id: 2,
						type: "task",
						parent: 1,
						duration: 2,
						manual: true,
					},
				],
				{ schedule: { auto: true } }
			);
			const { tasks } = store.getState();

			store.in.exec("update-task", { id: 2, task: { type: "summary" } });
			store.in.exec("update-task", { id: 2, task: { type: "task" } });
			store.in.exec("update-task", { id: 2, task: { progress: 50 } });

			expect(tasks.byId(1).progress).to.eq(0);
		});
	});

	describe("summary", () => {
		const day = (d: number) => new Date(2024, 3, d);
		const summaryStore = (tasks: any[], config: any = {}) =>
			getDataStore({
				...getData(),
				unscheduledTasks: true,
				links: [],
				tasks,
				...config,
			});
		const expectUnscheduled = (task: ITask) => {
			expect(task.unscheduled).to.eq(true);
			expect(task.start).to.eq(null);
			expect(task.end).to.eq(null);
			expect(task.duration).to.eq(null);
		};

		test("is unscheduled on load when all members are unscheduled", () => {
			const store = summaryStore([
				{ id: 1, type: "summary", parent: 0 },
				{ id: 2, type: "task", parent: 1, duration: 2 },
			]);
			const { tasks, _tasks } = store.getState();

			expectUnscheduled(tasks.byId(1));
			expect(_tasks.find(t => t.id === 1)?.$skip).to.eq(true);
		});

		test("clears its dates when the last scheduled member is unscheduled", () => {
			const store = summaryStore([
				{ id: 1, type: "summary", parent: 0 },
				{ id: 2, type: "task", parent: 1, start: day(2), duration: 3 },
				{ id: 3, type: "task", parent: 1, duration: 2 },
			]);
			const { tasks } = store.getState();

			store.in.exec("update-task", { id: 2, task: { start: null } });
			expectUnscheduled(tasks.byId(1));

			store.in.exec("update-task", { id: 3, task: { start: day(4) } });
			expect(tasks.byId(1).unscheduled).to.eq(false);
			expect(tasks.byId(1).start).to.deep.eq(day(4));
			expect(tasks.byId(1).end).to.deep.eq(day(6));
		});

		test("sends the cleared dates of a summary to the server", () => {
			const store = summaryStore([
				{ id: 1, type: "summary", parent: 0 },
				{ id: 2, type: "task", parent: 1, start: day(2), duration: 3 },
			]);
			const updates: any[] = [];
			store.in.on("update-task", (ev: any) => updates.push(ev));

			store.in.exec("update-task", { id: 2, task: { start: null } });
			const sent = (id: number) =>
				JSON.parse(
					JSON.stringify(updates.find(ev => ev.id === id).task)
				);
			expect(sent(1)).to.include({
				start: null,
				end: null,
				duration: null,
			});
			expect(sent(2)).to.include({ start: null, end: null });
		});

		test("clears its dates when the last scheduled member is deleted", () => {
			const store = summaryStore([
				{ id: 1, type: "summary", parent: 0 },
				{ id: 2, type: "milestone", parent: 1, start: day(2) },
				{ id: 3, type: "task", parent: 1, duration: 2 },
			]);

			store.in.exec("delete-task", { id: 2 });
			expectUnscheduled(store.getState().tasks.byId(1));
		});

		test("passes the unscheduled state up to a parent summary", () => {
			const store = summaryStore([
				{ id: 1, type: "summary", parent: 0 },
				{ id: 2, type: "summary", parent: 1 },
				{ id: 3, type: "task", parent: 2, start: day(2), duration: 3 },
				{ id: 4, type: "task", parent: 1, duration: 2 },
			]);
			const { tasks } = store.getState();

			store.in.exec("update-task", { id: 3, task: { start: null } });
			expectUnscheduled(tasks.byId(2));
			expectUnscheduled(tasks.byId(1));
		});

		test("keeps the dates of a manual summary", () => {
			const store = summaryStore(
				[
					{
						id: 1,
						type: "summary",
						parent: 0,
						manual: true,
						start: day(1),
						end: day(10),
					},
					{
						id: 2,
						type: "task",
						parent: 1,
						start: day(2),
						duration: 3,
					},
				],
				{ schedule: { auto: true } }
			);
			const { tasks } = store.getState();

			store.in.exec("update-task", { id: 2, task: { start: null } });
			expect(tasks.byId(1).unscheduled).to.eq(false);
			expect(tasks.byId(1).start).to.deep.eq(day(1));
			expect(tasks.byId(1).end).to.deep.eq(day(10));
		});

		describe("manual without dates", () => {
			const manualTasks = () => [
				{ id: 1, type: "summary", parent: 0, manual: true },
				{ id: 2, type: "task", parent: 1, duration: 2 },
			];
			const auto = { schedule: { auto: true } };

			test("stays unscheduled when a member is scheduled", () => {
				const store = summaryStore(manualTasks(), auto);
				const { tasks } = store.getState();
				expectUnscheduled(tasks.byId(1));

				store.in.exec("update-task", {
					id: 2,
					task: { start: day(4) },
				});
				expectUnscheduled(tasks.byId(1));
			});

			test("is not derived on load from scheduled members", () => {
				const data = manualTasks();
				data[1] = { ...data[1], start: day(4) } as any;
				const store = summaryStore(data, auto);

				expectUnscheduled(store.getState().tasks.byId(1));
			});

			test("is scheduled and unscheduled through its own dates", () => {
				const store = summaryStore(manualTasks(), auto);
				const { tasks } = store.getState();

				store.in.exec("update-task", {
					id: 1,
					task: { start: day(2), duration: 7 },
				});
				expect(tasks.byId(1).unscheduled).to.eq(false);
				expect(tasks.byId(1).start).to.deep.eq(day(2));
				expect(tasks.byId(1).end).to.deep.eq(day(9));

				store.in.exec("update-task", { id: 1, task: { start: null } });
				expect(tasks.byId(1).unscheduled).to.eq(true);
				expect(tasks.byId(1).start).to.eq(null);
				expect(tasks.byId(1).end).to.eq(null);
			});
		});

		test("stays unscheduled after autoConvert until its child is scheduled", () => {
			vi.useFakeTimers();
			const store = summaryStore([], { summary: { autoConvert: true } });
			const { tasks } = store.getState();

			store.in.exec("add-task", {
				id: "A",
				task: { id: "A", text: "A" },
			});
			store.in.exec("add-task", {
				id: "B",
				target: "A",
				mode: "child",
				task: { id: "B", text: "B" },
			});
			vi.advanceTimersByTime(1);

			expect(tasks.byId("A").type).to.eq("summary");
			expectUnscheduled(tasks.byId("A"));
			const bar = store.getState()._tasks.find(t => t.id === "A");
			expect(bar?.$skip).to.eq(true);

			store.in.exec("update-task", {
				id: "B",
				task: { start: day(8), duration: 2 },
			});
			vi.advanceTimersByTime(1);

			expect(tasks.byId("A").unscheduled).to.eq(false);
			expect(tasks.byId("A").start).to.deep.eq(day(8));
			expect(tasks.byId("A").end).to.deep.eq(day(10));
			vi.useRealTimers();
		});

		test("restores its dates on undo", () => {
			const store = summaryStore(
				[
					{ id: 1, type: "summary", parent: 0 },
					{
						id: 2,
						type: "task",
						parent: 1,
						start: day(2),
						duration: 3,
					},
				],
				{ undo: true }
			);
			const { tasks } = store.getState();

			store.in.exec("update-task", { id: 2, task: { start: null } });
			expectUnscheduled(tasks.byId(1));

			store.in.exec("undo");
			expect(tasks.byId(1).unscheduled).to.eq(false);
			expect(tasks.byId(1).start).to.deep.eq(day(2));
			expect(tasks.byId(1).end).to.deep.eq(day(5));
		});
	});
});
