import { describe, test, expect } from "vitest";
import { DataStore, normalizeLinks } from "../src/index";
import { writable } from "svelte/store";
import { getData } from "./stubs/data";

const day = (d: number) => new Date(2024, 3, d);
const REMOTE = { eventSource: "remote" };

function getStore(config: any = {}) {
	const store = new DataStore(writable);
	store.init({
		...getData(),
		tasks: [
			{ id: 10, type: "summary", text: "Release", open: false },
			{
				id: 11,
				parent: 10,
				text: "QA",
				start: day(1),
				end: day(3),
				duration: 2,
			},
			{
				id: 12,
				parent: 10,
				text: "Regression",
				start: day(3),
				end: day(5),
				duration: 2,
			},
			{ id: 20, text: "Launch", start: day(8), end: day(9), duration: 1 },
		],
		links: normalizeLinks([{ id: 1, source: 11, target: 12, type: "e2s" }]),
		...config,
	});
	// what a data provider would send: every data action without skipProvider
	const sent: string[] = [];
	["add-task", "update-task", "move-task", "delete-task", "add-link"].forEach(
		action =>
			store.in.on(action as any, (ev: any) => {
				if (!ev.skipProvider) sent.push(`${action}:${ev.id}`);
			})
	);
	return { store, sent };
}

const task = (store: DataStore, id: number) => store.getState().tasks.byId(id);

describe("remote events", () => {
	test("are not sent to the provider", () => {
		const { store, sent } = getStore();
		store.in.exec("update-task", {
			id: 11,
			task: { text: "QA 2" },
			...REMOTE,
		});
		store.in.exec("add-task", {
			task: {
				id: 30,
				text: "Docs",
				start: day(2),
				end: day(3),
				duration: 1,
			},
			...REMOTE,
		});
		store.in.exec("delete-task", { id: 20, ...REMOTE });
		expect(sent).toEqual([]);
	});

	test("write a leaf as it arrives, without recalculating its summary", () => {
		const { store, sent } = getStore();
		store.in.exec("update-task", {
			id: 12,
			task: { start: day(10), end: day(12), duration: 2 },
			...REMOTE,
		});
		expect(task(store, 12).start).toEqual(day(10));
		expect(task(store, 10).end).toEqual(day(5));
		expect(sent).toEqual([]);
	});

	test("write a summary's dates without moving its subtasks", () => {
		const { store } = getStore();
		store.in.exec("update-task", {
			id: 10,
			task: { start: day(3), end: day(7), duration: 4 },
			...REMOTE,
		});
		expect(task(store, 10).start).toEqual(day(3));
		expect(task(store, 11).start).toEqual(day(1));
		expect(task(store, 12).start).toEqual(day(3));
	});

	test("do not propagate a summary's inactive flag", () => {
		const { store, sent } = getStore({ inactiveTasks: true });
		store.in.exec("update-task", {
			id: 10,
			task: { inactive: true },
			...REMOTE,
		});
		expect(task(store, 10).inactive).toBe(true);
		expect(task(store, 11).inactive).toBeFalsy();
		expect(sent).toEqual([]);
	});

	test("are not recorded in history and close the open step", () => {
		const { store } = getStore({ undo: true });
		store.in.exec("update-task", { id: 20, task: { text: "Go live" } });
		store.in.exec("update-task", {
			id: 11,
			task: { text: "QA 2" },
			...REMOTE,
		});
		expect(store.getState().history).toEqual({ undo: 1, redo: 0 });

		store.in.exec("undo", {});
		expect(task(store, 20).text).toBe("Launch");
		expect(task(store, 11).text).toBe("QA 2");
	});

	test("add without selecting, opening or recalculating the summary", () => {
		const { store } = getStore();
		store.in.exec("add-task", {
			task: {
				id: 30,
				text: "Docs",
				start: day(20),
				end: day(21),
				duration: 1,
			},
			target: 10,
			mode: "child",
			...REMOTE,
		});
		expect(task(store, 30).parent).toBe(10);
		expect(task(store, 30).start).toEqual(day(20));
		expect(store.getState().selected).toEqual([]);
		expect(task(store, 10).open).toBeFalsy();
		expect(task(store, 10).end).toEqual(day(5));
	});

	test("move without opening or recalculating summaries", () => {
		const { store } = getStore();
		store.in.exec("move-task", {
			id: 20,
			target: 10,
			mode: "child",
			...REMOTE,
		});
		expect(task(store, 20).parent).toBe(10);
		expect(task(store, 10).open).toBeFalsy();
		expect(task(store, 10).end).toEqual(day(5));
	});

	test("move inside the saved tree while grouped", () => {
		const { store } = getStore({ groupBy: { field: "text" } });
		store.in.exec("move-task", {
			id: 20,
			target: 10,
			mode: "child",
			...REMOTE,
		});
		expect(task(store, 20).parent).toBe(10);

		store.in.exec("move-task", {
			id: 20,
			target: 11,
			mode: "before",
			...REMOTE,
		});
		expect(
			store
				.getState()
				.tasks.byId(10)
				.data.map(t => t.id)
		).toEqual([20, 11, 12]);
		// the grouped view is rebuilt from the saved tree
		const row = store.getState().tree.byId(20);
		expect(store.getState().tree.byId(row.parent).$group).toBe(true);
	});

	test("delete the subtree and its links, without recalculating the summary", () => {
		const { store } = getStore();
		store.in.exec("delete-task", { id: 12, ...REMOTE });
		expect(task(store, 12)).toBeUndefined();
		expect(store.getState().links.byId(1)).toBeUndefined();
		expect(task(store, 10).end).toEqual(day(5));

		store.in.exec("delete-task", { id: 10, ...REMOTE });
		expect(task(store, 11)).toBeUndefined();
	});
});
