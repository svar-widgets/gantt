import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import { DataStore } from "../src/index";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";

function makeStore(tasks: any[], links: any[] = [], over: any = {}) {
	const data: any = getData();
	data.tasks = tasks.map(t => ({ ...t }));
	data.links = links;
	const store = new DataStore(writable);
	store.init({
		...data,
		schedule: { auto: true },
		projectStart: new Date(2026, 3, 1),
		projectEnd: new Date(2026, 6, 1),
		...over,
	});
	vi.advanceTimersByTime(10);
	return store;
}

const task = (over: any = {}) => ({
	id: 1,
	text: "A",
	type: "task",
	parent: 0,
	start: new Date(2026, 3, 10),
	duration: 5,
	...over,
});

// A: Apr 10 → 15 (5 days), B: Apr 10 → 13 (3 days), overlapping at the start
const pair = () => [
	task(),
	task({ id: 2, text: "B", start: new Date(2026, 3, 10), duration: 3 }),
];

const apr = (day: number) => new Date(2026, 3, day);

function drag(store: DataStore, id: number, day: number, duration: number) {
	store.in.exec("update-task", {
		id,
		task: { start: apr(day), end: apr(day + duration) },
	} as any);
	vi.advanceTimersByTime(10);
}

const span = (store: DataStore, id: number) => {
	const t = store.getState().tasks.byId(id);
	return [t.start, t.end];
};
const linkIds = (store: DataStore) =>
	store.getState().links.map((l: any) => l.id);

describe("link types", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	describe("propagation", () => {
		test("e2s puts the successor after the predecessor's end", () => {
			const store = makeStore(pair(), [
				{ id: 1, source: 1, target: 2, type: "e2s" },
			]);
			expect(span(store, 2)).toEqual([apr(15), apr(18)]);

			drag(store, 1, 20, 5);
			expect(span(store, 2)).toEqual([apr(25), apr(28)]);
		});

		test("s2s holds the two starts together", () => {
			const store = makeStore(pair(), [
				{ id: 1, source: 1, target: 2, type: "s2s" },
			]);
			expect(span(store, 2)).toEqual([apr(10), apr(13)]);

			drag(store, 1, 20, 5);
			expect(span(store, 2)).toEqual([apr(20), apr(23)]);
		});

		test("e2e holds the two ends together", () => {
			const store = makeStore(pair(), [
				{ id: 1, source: 1, target: 2, type: "e2e" },
			]);
			// B is pulled forward so its end reaches A's, keeping its 3 days
			expect(span(store, 2)).toEqual([apr(12), apr(15)]);

			drag(store, 1, 20, 5);
			expect(span(store, 2)).toEqual([apr(22), apr(25)]);
		});

		test("s2e puts the successor's end after the predecessor's start", () => {
			const store = makeStore(pair(), [
				{ id: 1, source: 1, target: 2, type: "s2e" },
			]);
			// B already ends after A starts, so nothing moves
			expect(span(store, 2)).toEqual([apr(10), apr(13)]);

			drag(store, 1, 20, 5);
			expect(span(store, 2)).toEqual([apr(17), apr(20)]);
		});

		test("dragging the successor earlier leaves an s2s predecessor in place", () => {
			const store = makeStore(pair(), [
				{ id: 1, source: 1, target: 2, type: "s2s" },
			]);
			drag(store, 2, 3, 3);
			// the successor goes back to the predecessor's start
			expect(span(store, 1)).toEqual([apr(10), apr(15)]);
			expect(span(store, 2)).toEqual([apr(10), apr(13)]);
			expect(store.getState().conflicts).toHaveLength(0);
		});

		test("resizing a predecessor carries an e2e successor", () => {
			const store = makeStore(pair(), [
				{ id: 1, source: 1, target: 2, type: "e2e" },
			]);
			store.in.exec("update-task", {
				id: 1,
				task: { duration: 10 },
			} as any);
			vi.advanceTimersByTime(10);

			expect(span(store, 1)).toEqual([apr(10), apr(20)]);
			expect(span(store, 2)).toEqual([apr(17), apr(20)]);
		});

		test("a chain of mixed types propagates end to end", () => {
			const store = makeStore(
				[
					task(),
					task({ id: 2, text: "B", duration: 4 }),
					task({ id: 3, text: "C", duration: 2 }),
					task({ id: 4, text: "D", duration: 6 }),
				],
				[
					{ id: 1, source: 1, target: 2, type: "e2s" },
					{ id: 2, source: 2, target: 3, type: "s2s" },
					{ id: 3, source: 3, target: 4, type: "e2e" },
				]
			);
			drag(store, 1, 20, 5);

			expect(span(store, 2)).toEqual([apr(25), apr(29)]); // e2s from A
			expect(span(store, 3)).toEqual([apr(25), apr(27)]); // s2s from B
			expect(span(store, 4)).toEqual([apr(21), apr(27)]); // e2e from C
			expect(store.getState().conflicts).toHaveLength(0);
		});
	});

	describe("lag", () => {
		test("a lag on s2s pins the successor to the offset", () => {
			const store = makeStore(pair(), [
				{ id: 1, source: 1, target: 2, type: "s2s", lag: 2 },
			]);
			expect(span(store, 2)).toEqual([apr(12), apr(15)]);

			drag(store, 1, 20, 5);
			expect(span(store, 2)).toEqual([apr(22), apr(25)]);
		});

		test("a negative lag on e2e leads the successor's end", () => {
			const store = makeStore(pair(), [
				{ id: 1, source: 1, target: 2, type: "e2e", lag: -2 },
			]);
			// A ends Apr 15, so B ends two days before it
			expect(span(store, 2)).toEqual([apr(10), apr(13)]);
		});
	});

	describe("link events", () => {
		for (const type of ["s2s", "e2e", "s2e"]) {
			test(`drawing a ${type} link sets a pass going`, () => {
				const store = makeStore(pair());
				store.in.exec("add-link", {
					link: { id: 5, source: 1, target: 2, type },
				} as any);
				vi.advanceTimersByTime(10);

				expect(linkIds(store)).toEqual([5]);
				const [, end] = span(store, 2);
				// e2e is the one of the three that has to move B here
				expect(end).toEqual(type === "e2e" ? apr(15) : apr(13));
			});
		}

		test("changing a link's type reschedules against the new endpoints", () => {
			const store = makeStore(pair(), [
				{ id: 1, source: 1, target: 2, type: "s2s" },
			]);
			expect(span(store, 2)).toEqual([apr(10), apr(13)]);

			store.in.exec("update-link", {
				id: 1,
				link: { type: "e2s" },
			} as any);
			vi.advanceTimersByTime(10);

			expect(span(store, 2)).toEqual([apr(15), apr(18)]);
		});

		test("deleting a non-e2s link leaves the positions it produced", () => {
			const store = makeStore(pair(), [
				{ id: 1, source: 1, target: 2, type: "e2e" },
			]);
			expect(span(store, 2)).toEqual([apr(12), apr(15)]);

			store.in.exec("delete-link", { id: 1 } as any);
			vi.advanceTimersByTime(10);

			expect(linkIds(store)).toHaveLength(0);
			expect(span(store, 2)).toEqual([apr(12), apr(15)]);
			expect(store.getState().conflicts).toHaveLength(0);
		});

		test("undo and redo carry a move made over an s2s link", () => {
			const store = makeStore(
				pair(),
				[{ id: 1, source: 1, target: 2, type: "s2s" }],
				{ undo: true }
			);
			drag(store, 1, 20, 5);
			expect(span(store, 2)).toEqual([apr(20), apr(23)]);

			store.in.exec("undo", {} as any);
			vi.advanceTimersByTime(10);
			expect(span(store, 1)).toEqual([apr(10), apr(15)]);
			expect(span(store, 2)).toEqual([apr(10), apr(13)]);

			store.in.exec("redo", {} as any);
			vi.advanceTimersByTime(10);
			expect(span(store, 2)).toEqual([apr(20), apr(23)]);
		});
	});

	describe("rejected links", () => {
		test("a cycle of two s2s links costs one of them", () => {
			const store = makeStore(pair(), [
				{ id: 1, source: 1, target: 2, type: "s2s" },
				{ id: 2, source: 2, target: 1, type: "s2s" },
			]);
			expect(linkIds(store)).toHaveLength(1);
		});

		test("s2s and e2e between the same pair is a cycle", () => {
			const store = makeStore(pair(), [
				{ id: 1, source: 1, target: 2, type: "s2s" },
				{ id: 2, source: 2, target: 1, type: "e2e" },
			]);
			expect(linkIds(store)).toHaveLength(1);
		});

		const summary = () => [
			task({ id: 1, text: "S", type: "summary" }),
			task({ id: 2, text: "A", parent: 1 }),
			task({ id: 3, text: "C", start: apr(20) }),
		];

		test("a removed link carries the reason it was removed", () => {
			const seen: any[] = [];
			const store = makeStore(summary(), [
				{ id: 1, source: 1, target: 3, type: "s2s" },
			]);
			store.in.on("delete-link", (ev: any) => {
				seen.push(ev);
			});

			// a second one, drawn after the handler is attached
			store.in.exec("add-link", {
				link: { id: 2, source: 3, target: 1, type: "e2e" },
			} as any);
			vi.advanceTimersByTime(10);

			expect(linkIds(store)).toHaveLength(0);
			expect(seen).toHaveLength(1);
			expect(seen[0].id).toBe(2);
			expect(seen[0].reason).toBe("summary-endpoint");
		});

		test("a link off a summary's start is dropped", () => {
			const store = makeStore(summary(), [
				{ id: 1, source: 1, target: 3, type: "s2s" },
			]);
			expect(linkIds(store)).toHaveLength(0);
			expect(span(store, 3)).toEqual([apr(20), apr(25)]);
		});

		test("a link into a summary's end is dropped", () => {
			const store = makeStore(summary(), [
				{ id: 1, source: 3, target: 1, type: "e2e" },
			]);
			expect(linkIds(store)).toHaveLength(0);
		});

		test("turning a task into a summary drops the link it invalidates", () => {
			// B has no children, so as a summary it keeps its dates: the type
			// change alone has to set the pass going
			const store = makeStore(
				[
					task(),
					task({ id: 2, text: "B", start: apr(16), duration: 3 }),
				],
				[{ id: 1, source: 1, target: 2, type: "e2e" }]
			);
			const seen: any[] = [];
			store.in.on("delete-link", (ev: any) => {
				seen.push([ev.id, ev.reason]);
			});

			store.in.exec("update-task", {
				id: 2,
				task: { type: "summary" },
			} as any);
			vi.advanceTimersByTime(10);

			expect(span(store, 2)).toEqual([apr(16), apr(19)]);
			expect(linkIds(store)).toHaveLength(0);
			expect(seen).toEqual([[1, "summary-endpoint"]]);
		});

		test("a summary's derived end drives an e2e successor", () => {
			const store = makeStore(
				[
					task({ id: 1, text: "S", type: "summary" }),
					task({ id: 2, text: "A", parent: 1 }),
					task({ id: 3, text: "C", start: apr(10), duration: 3 }),
				],
				[{ id: 1, source: 1, target: 3, type: "e2e" }]
			);
			expect(linkIds(store)).toEqual([1]);
			// the summary ends with its only leaf, Apr 15, and C ends with it
			expect(span(store, 3)).toEqual([apr(12), apr(15)]);

			drag(store, 2, 20, 5);
			expect(span(store, 3)).toEqual([apr(22), apr(25)]);
		});

		test("a link into a summary's start expands onto its leaves", () => {
			const store = makeStore(summary(), [
				{ id: 1, source: 3, target: 1, type: "s2s" },
			]);
			expect(linkIds(store)).toEqual([1]);
			// C starts Apr 20, so the summary's leaf starts with it
			expect(span(store, 2)).toEqual([apr(20), apr(25)]);
		});
	});

	describe("interaction with the rest of scheduling", () => {
		const cpmStore = (tasks: any[], links: any[]) => {
			const data: any = getData();
			data.tasks = tasks;
			data.links = links;
			const store = new DataStore(writable);
			store.init({
				...data,
				schedule: {},
				criticalPath: { type: "flexible" },
				slack: true,
				projectStart: apr(10),
			});
			vi.advanceTimersByTime(20);
			return store;
		};

		test("an unscheduled endpoint keeps its link out of the graph", () => {
			const store = makeStore(
				[task(), task({ id: 2, text: "B", start: null, duration: 3 })],
				[{ id: 1, source: 1, target: 2, type: "s2s" }],
				{ unscheduledTasks: true }
			);
			// the link survives in the store, the task stays unscheduled
			expect(linkIds(store)).toEqual([1]);
			expect(store.getState().tasks.byId(2).unscheduled).toBe(true);
		});

		test("a constraint clamps an e2e link and the miss is reported", () => {
			const store = makeStore(pair(), [
				{ id: 1, source: 1, target: 2, type: "e2e" },
			]);
			store.in.exec("update-task", {
				id: 2,
				task: { constraint: { type: "mso", date: apr(10) } },
			} as any);
			vi.advanceTimersByTime(10);

			// the pin places B; the link wanted B to end with A, a start at Apr 12
			expect(span(store, 2)).toEqual([apr(10), apr(13)]);
			const conflicts = store.getState().conflicts;
			expect(conflicts).toHaveLength(1);
			expect(conflicts[0].type).toBe("link");
			expect(conflicts[0].task).toBe(2);
		});

		test("the critical path runs through an s2s link", () => {
			const store = cpmStore(
				[
					task({ duration: 2 }),
					task({ id: 2, text: "B", duration: 3 }),
					task({ id: 3, text: "C", duration: 15 }),
				],
				[{ id: 1, source: 1, target: 2, type: "s2s" }]
			);

			const slack = (id: number) =>
				store.getState().tasks.byId(id).slack?.totalSlack;
			// A and B share a start, so they share their slack; C fixes the end
			expect(slack(1)).toBe(12);
			expect(slack(2)).toBe(12);
			expect(slack(3)).toBe(0);
		});
	});
});
