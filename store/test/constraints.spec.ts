import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { DataStore } from "../src/index";
import { calcScales } from "../src/scales";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";

function config(tasks: any[], links: any[] = [], undo = false) {
	const data: any = getData();
	data.tasks = tasks.map(t => ({ ...t }));
	data.links = links;
	return {
		...data,
		schedule: { auto: true },
		undo,
		projectStart: new Date(2026, 3, 1),
		projectEnd: new Date(2026, 6, 1),
	};
}

function makeStore(tasks: any[], links: any[] = [], undo = false) {
	const store = new DataStore(writable);
	store.init(config(tasks, links, undo));
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

function setConstraint(store: DataStore, id: number, constraint: any) {
	store.in.exec("update-task", { id, task: { constraint } } as any);
	vi.advanceTimersByTime(10);
}

// B sits on its pin, and stays on it when A, its predecessor, is dragged past it:
// the pin outranks the link, so the link is what breaks
const pinnedPair = () => [
	task(),
	task({
		id: 2,
		text: "B",
		start: new Date(2026, 3, 15),
		constraint: { type: "mso", date: new Date(2026, 3, 15) },
	}),
];
const pinnedLink = [{ id: 1, source: 1, target: 2, type: "e2s" }];

function pushPredecessor(store: DataStore) {
	store.in.exec("update-task", {
		id: 1,
		task: { start: new Date(2026, 3, 14), end: new Date(2026, 3, 19) },
	} as any);
	vi.advanceTimersByTime(10);
}

describe("constraints", () => {
	beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
	afterEach(() => vi.useRealTimers());

	// the store's job is forwarding the constraint to the graph and applying the
	// scheduler's answer; which kind moves a task which way is lib-schedule's
	describe("wiring", () => {
		test("a constraint reaches the scheduler and its move is applied", () => {
			const store = makeStore([task()]);
			setConstraint(store, 1, {
				type: "mso",
				date: new Date(2026, 3, 20),
			});
			expect(store.getState().tasks.byId(1).start).toEqual(
				new Date(2026, 3, 20)
			);
		});
	});

	describe("direct edit", () => {
		test("dragging carries snet to the new start", () => {
			const store = makeStore([
				task({
					constraint: { type: "snet", date: new Date(2026, 3, 10) },
				}),
			]);
			store.in.exec("update-task", {
				id: 1,
				task: {
					start: new Date(2026, 3, 14),
					end: new Date(2026, 3, 19),
				},
			} as any);
			vi.advanceTimersByTime(10);
			expect(store.getState().tasks.byId(1).constraint.date).toEqual(
				new Date(2026, 3, 14)
			);
		});

		test("resizing the far edge leaves snet alone", () => {
			const store = makeStore([
				task({
					constraint: { type: "snet", date: new Date(2026, 3, 10) },
				}),
			]);
			store.in.exec("update-task", {
				id: 1,
				task: { duration: 8 },
			} as any);
			vi.advanceTimersByTime(10);
			expect(store.getState().tasks.byId(1).constraint.date).toEqual(
				new Date(2026, 3, 10)
			);
		});

		test("dragging carries mso to the new start", () => {
			const store = makeStore([
				task({
					constraint: { type: "mso", date: new Date(2026, 3, 10) },
				}),
			]);
			store.in.exec("update-task", {
				id: 1,
				task: {
					start: new Date(2026, 3, 14),
					end: new Date(2026, 3, 19),
				},
			} as any);
			vi.advanceTimersByTime(10);
			expect(store.getState().tasks.byId(1).constraint.date).toEqual(
				new Date(2026, 3, 14)
			);
			expect(store.getState().conflicts).toHaveLength(0);
		});

		test("dragging carries mfo to the new end", () => {
			const store = makeStore([
				task({
					constraint: { type: "mfo", date: new Date(2026, 3, 15) },
				}),
			]);
			store.in.exec("update-task", {
				id: 1,
				task: {
					start: new Date(2026, 3, 14),
					end: new Date(2026, 3, 19),
				},
			} as any);
			vi.advanceTimersByTime(10);
			expect(store.getState().tasks.byId(1).constraint.date).toEqual(
				new Date(2026, 3, 19)
			);
		});

		test("a dragged pin stays put when another task moves", () => {
			const store = makeStore([
				task({
					constraint: { type: "mso", date: new Date(2026, 3, 10) },
				}),
				task({ id: 2, text: "B" }),
			]);
			store.in.exec("update-task", {
				id: 1,
				task: {
					start: new Date(2026, 3, 14),
					end: new Date(2026, 3, 19),
				},
			} as any);
			vi.advanceTimersByTime(10);

			store.in.exec("update-task", {
				id: 2,
				task: {
					start: new Date(2026, 3, 16),
					end: new Date(2026, 3, 21),
				},
			} as any);
			vi.advanceTimersByTime(10);

			expect(store.getState().tasks.byId(1).start).toEqual(
				new Date(2026, 3, 14)
			);
		});

		// the editor saves the whole form, so the unchanged dates come back
		// with the constraint and must not read as a move
		test("a pin set through a full form still places the task", () => {
			const store = makeStore([task()]);
			const t = store.getState().tasks.byId(1);
			store.in.exec("update-task", {
				id: 1,
				task: {
					text: t.text,
					type: t.type,
					start: new Date(t.start),
					end: new Date(t.end),
					duration: t.duration,
					constraint: { type: "mso", date: new Date(2026, 3, 20) },
				},
			} as any);
			vi.advanceTimersByTime(10);
			expect(store.getState().tasks.byId(1).start).toEqual(
				new Date(2026, 3, 20)
			);
		});

		// the other half of the same form: the constraint comes back untouched,
		// so the new dates are the edit and the pin follows them
		test("a form that moves the dates carries an untouched pin", () => {
			const constraint = { type: "mso", date: new Date(2026, 3, 10) };
			const store = makeStore([task({ constraint })]);
			const t = store.getState().tasks.byId(1);
			store.in.exec("update-task", {
				id: 1,
				task: {
					text: t.text,
					type: t.type,
					start: new Date(2026, 3, 14),
					end: new Date(2026, 3, 19),
					duration: t.duration,
					constraint: { ...constraint },
				},
			} as any);
			vi.advanceTimersByTime(10);
			expect(store.getState().tasks.byId(1).start).toEqual(
				new Date(2026, 3, 14)
			);
			expect(store.getState().tasks.byId(1).constraint.date).toEqual(
				new Date(2026, 3, 14)
			);
		});
	});

	// autoSave saves field by field, so only a whole-form save can carry both
	describe("dates and constraint in one save", () => {
		function save(store: DataStore, over: any) {
			const t = store.getState().tasks.byId(1);
			store.in.exec("update-task", {
				id: 1,
				task: {
					text: t.text,
					type: t.type,
					start: new Date(t.start),
					end: new Date(t.end),
					duration: t.duration,
					...over,
				},
			} as any);
			vi.advanceTimersByTime(10);
		}

		test("moving a pinned successor later in one save clears the link report", () => {
			const store = makeStore(
				[
					task({
						id: 1,
						text: "Office",
						type: "summary",
						open: true,
						start: new Date(2026, 3, 8),
						duration: 6,
						constraint: undefined,
					}),
					task({
						id: 14,
						parent: 1,
						text: "Electrical",
						start: new Date(2026, 3, 8),
						duration: 4,
						constraint: {
							type: "snet",
							date: new Date(2026, 3, 8),
						},
					}),
					task({
						id: 16,
						parent: 1,
						text: "Fire",
						start: new Date(2026, 3, 12),
						duration: 2,
						constraint: {
							type: "snet",
							date: new Date(2026, 3, 12),
						},
					}),
				],
				[{ id: 2, source: 14, target: 16, type: "e2s" }],
				true
			);
			setConstraint(store, 16, {
				type: "mso",
				date: new Date(2026, 3, 10),
			});
			expect(store.getState().tasks.byId(16).start).toEqual(
				new Date(2026, 3, 10)
			);
			expect(store.getState().conflicts).toHaveLength(1);

			const t = store.getState().tasks.byId(16);
			store.in.exec("update-task", {
				id: 16,
				task: {
					text: t.text,
					type: t.type,
					start: new Date(2026, 3, 13),
					end: new Date(2026, 3, 15),
					duration: 2,
					constraint: t.constraint,
				},
			} as any);
			vi.advanceTimersByTime(10);

			expect(store.getState().tasks.byId(16).start).toEqual(
				new Date(2026, 3, 13)
			);
			expect(store.getState().tasks.byId(16).constraint.date).toEqual(
				new Date(2026, 3, 13)
			);
			expect(store.getState().conflicts).toHaveLength(0);
		});

		test("a constraint the dates contradict gives way to them", () => {
			const store = makeStore([
				task({
					constraint: { type: "mso", date: new Date(2026, 3, 10) },
				}),
				task({ id: 2, text: "B" }),
			]);
			save(store, {
				start: new Date(2026, 3, 8),
				end: new Date(2026, 3, 13),
				constraint: { type: "mso", date: new Date(2026, 3, 7) },
			});
			expect(store.getState().tasks.byId(1).start).toEqual(
				new Date(2026, 3, 8)
			);
			expect(store.getState().tasks.byId(1).constraint.date).toEqual(
				new Date(2026, 3, 8)
			);
			expect(store.getState().conflicts).toHaveLength(0);

			// nothing is left for a later pass to resolve
			store.in.exec("update-task", {
				id: 2,
				task: {
					start: new Date(2026, 3, 16),
					end: new Date(2026, 3, 21),
				},
			} as any);
			vi.advanceTimersByTime(10);
			expect(store.getState().tasks.byId(1).start).toEqual(
				new Date(2026, 3, 8)
			);
		});

		// the edited end says nothing about the start a pin names, but the dates
		// still win: the pin takes the start the save leaves the task on
		test("a constraint gives way to a date edited on the other side", () => {
			const store = makeStore([
				task({
					constraint: { type: "mso", date: new Date(2026, 3, 10) },
				}),
				task({ id: 2, text: "B" }),
			]);
			save(store, {
				end: new Date(2026, 3, 20),
				duration: undefined,
				constraint: { type: "mso", date: new Date(2026, 3, 8) },
			});
			const t = store.getState().tasks.byId(1);
			expect(t.start).toEqual(new Date(2026, 3, 10));
			expect(t.end).toEqual(new Date(2026, 3, 20));
			expect(t.constraint.date).toEqual(new Date(2026, 3, 10));
			expect(store.getState().conflicts).toHaveLength(0);

			// nothing is left for a later pass to resolve
			store.in.exec("update-task", {
				id: 2,
				task: {
					start: new Date(2026, 3, 16),
					end: new Date(2026, 3, 21),
				},
			} as any);
			vi.advanceTimersByTime(10);
			expect(store.getState().tasks.byId(1).start).toEqual(
				new Date(2026, 3, 10)
			);
		});

		// a bound only forbids the days outside it
		test("a constraint the dates satisfy leaves them alone", () => {
			const store = makeStore([
				task({
					start: new Date(2026, 3, 12),
					constraint: { type: "snet", date: new Date(2026, 3, 12) },
				}),
			]);
			save(store, {
				start: new Date(2026, 3, 14),
				end: new Date(2026, 3, 19),
				constraint: { type: "snet", date: new Date(2026, 3, 10) },
			});
			expect(store.getState().tasks.byId(1).start).toEqual(
				new Date(2026, 3, 14)
			);
			expect(store.getState().tasks.byId(1).constraint.date).toEqual(
				new Date(2026, 3, 10)
			);
		});

		test("relaxing a violated constraint clears its report", () => {
			const store = makeStore(
				[
					// its own floor keeps it from being pulled back to meet the pin
					task({
						id: 2,
						text: "B",
						constraint: {
							type: "snet",
							date: new Date(2026, 3, 10),
						},
					}),
					task({
						start: new Date(2026, 3, 15),
						constraint: {
							type: "mso",
							date: new Date(2026, 3, 8),
						},
					}),
				],
				[{ id: 1, source: 2, target: 1, type: "e2s" }]
			);
			expect(store.getState().conflicts).toHaveLength(1);

			// the pin was holding the task on 04-08 against its predecessor. the
			// new window permits that day, so it decides nothing and the link
			// settles the task behind its predecessor instead
			save(store, {
				constraint: { type: "snet", date: new Date(2026, 3, 1) },
			});
			expect(store.getState().tasks.byId(1).start).toEqual(
				new Date(2026, 3, 15)
			);
			expect(store.getState().tasks.byId(2).start).toEqual(
				new Date(2026, 3, 10)
			);
			expect(store.getState().conflicts).toHaveLength(0);
		});
	});

	describe("violations", () => {
		test("what the scheduler reports lands in state, and leaves with the constraint", () => {
			const store = makeStore(pinnedPair(), pinnedLink);
			pushPredecessor(store);
			// the pin holds B where it is; the link A → B is what gets reported
			expect(store.getState().tasks.byId(2).start).toEqual(
				new Date(2026, 3, 15)
			);
			expect(store.getState().conflicts).toHaveLength(1);

			// with the pin gone nothing anchors B, so it settles behind A
			setConstraint(store, 2, null);
			expect(store.getState().tasks.byId(2).constraint).to.be.null;
			expect(store.getState().tasks.byId(2).start).toEqual(
				new Date(2026, 3, 19)
			);
			expect(store.getState().conflicts).toHaveLength(0);
		});

		test("a pin relaxed to a floor keeps its date when the link moves the task", () => {
			const store = makeStore(pinnedPair(), pinnedLink);
			pushPredecessor(store);

			setConstraint(store, 2, {
				type: "snet",
				date: new Date(2026, 3, 15),
			});
			const b = store.getState().tasks.byId(2);
			expect(b.start).toEqual(new Date(2026, 3, 19));
			expect(b.constraint.date).toEqual(new Date(2026, 3, 15));
			expect(store.getState().conflicts).toHaveLength(0);
		});

		test("a floor dragged against a pinned predecessor goes back with the task", () => {
			const store = makeStore(
				[
					task({
						constraint: {
							type: "mso",
							date: new Date(2026, 3, 10),
						},
					}),
					task({
						id: 2,
						text: "B",
						start: new Date(2026, 3, 15),
						constraint: {
							type: "snet",
							date: new Date(2026, 3, 15),
						},
					}),
				],
				pinnedLink
			);
			store.in.exec("update-task", {
				id: 2,
				task: {
					start: new Date(2026, 3, 12),
					end: new Date(2026, 3, 17),
				},
			} as any);
			vi.advanceTimersByTime(10);

			const b = store.getState().tasks.byId(2);
			expect(b.start).toEqual(new Date(2026, 3, 15));
			expect(b.constraint.date).toEqual(new Date(2026, 3, 15));
		});

		// the editor clears a lag with "", the api may send null or undefined. each
		// leaves the link at lag 0, which the pin satisfies, so the report has to go
		test.each(["", null, undefined])(
			"clearing a lag (%j) drops the violation it caused",
			lag => {
				const store = makeStore(pinnedPair(), pinnedLink);

				// the pin holds B right behind A, a day short of the lag
				store.in.exec("update-link", {
					id: 1,
					link: { lag: 1 },
				} as any);
				vi.advanceTimersByTime(10);
				expect(store.getState().conflicts).toHaveLength(1);

				store.in.exec("update-link", { id: 1, link: { lag } } as any);
				vi.advanceTimersByTime(10);
				expect(store.getState().links.byId(1).lag).toBe(0);
				expect(store.getState().tasks.byId(2).start).toEqual(
					new Date(2026, 3, 15)
				);
				expect(store.getState().conflicts).toHaveLength(0);
			}
		);
		test("deleting a task in a link violation drops the report", () => {
			const store = makeStore(pinnedPair(), pinnedLink);
			pushPredecessor(store);
			expect(store.getState().conflicts).toHaveLength(1);

			store.in.exec("delete-task", { id: 2 } as any);
			vi.advanceTimersByTime(10);
			expect(store.getState().tasks.byId(2)).toBeUndefined();
			expect(store.getState().conflicts).toHaveLength(0);
		});

		test("deleting the other end of a broken link drops the report too", () => {
			const store = makeStore(pinnedPair(), pinnedLink);
			pushPredecessor(store);
			expect(store.getState().conflicts).toHaveLength(1);

			store.in.exec("delete-task", { id: 1 } as any);
			vi.advanceTimersByTime(10);
			expect(store.getState().conflicts).toHaveLength(0);
		});

		test("deleting several tasks only resweeps once", () => {
			const store = makeStore(
				[...pinnedPair(), task({ id: 3, text: "C" })],
				pinnedLink
			);
			pushPredecessor(store);
			expect(store.getState().conflicts).toHaveLength(1);

			const scheduler = (store as any)._modules.get("autoScheduler");
			const spy = vi.spyOn(scheduler, "sweep");

			store.in.exec("delete-task", { id: 3 } as any);
			store.in.exec("delete-task", { id: 2 } as any);
			expect(spy).not.toHaveBeenCalled();

			vi.advanceTimersByTime(10);
			expect(spy).toHaveBeenCalledTimes(1);
			expect(store.getState().conflicts).toHaveLength(0);
		});

		// the link the user just drew is the one to lose, whichever member of the
		// cycle a walk of the graph happens to reach first
		test("a cycle costs the link that was just drawn", () => {
			const store = makeStore(
				[
					task({ id: 1, text: "A", duration: 2 }),
					task({ id: 2, text: "B", start: new Date(2026, 3, 12) }),
					task({ id: 3, text: "C", start: new Date(2026, 3, 14) }),
				],
				[
					{ id: 1, source: 1, target: 2, type: "e2s" },
					{ id: 2, source: 3, target: 1, type: "e2s" },
				]
			);

			// closes A → B → C → A, and the walk reaches 3 → 1 before it
			store.in.exec("add-link", {
				link: { id: 3, source: 2, target: 3, type: "e2s" },
			} as any);
			vi.advanceTimersByTime(10);

			expect(store.getState().links.map((l: any) => l.id)).toEqual([
				1, 2,
			]);
		});

		// a cycle takes its whole group out of the graph, but only the link that
		// closed it is deleted, so the pass reports on a topology that never lands
		test("a rejected link leaves the report on the surviving graph", () => {
			const store = makeStore(
				[
					// its own floor keeps it from being pulled back to meet B's pin
					task({
						id: 1,
						text: "A",
						duration: 2,
						constraint: {
							type: "snet",
							date: new Date(2026, 3, 10),
						},
					}),
					task({
						id: 2,
						text: "B",
						start: new Date(2026, 3, 12),
						duration: 2,
						constraint: {
							type: "mso",
							date: new Date(2026, 3, 10),
						},
					}),
					task({
						id: 3,
						text: "C",
						start: new Date(2026, 3, 14),
						duration: 2,
					}),
				],
				[
					{ id: 1, source: 1, target: 2, type: "e2s" },
					{ id: 2, source: 2, target: 3, type: "e2s" },
				]
			);
			expect(store.getState().conflicts).toHaveLength(1);

			// closes the loop, so all three links drop out of the graph
			store.in.exec("add-link", {
				link: { id: 3, source: 3, target: 1, type: "e2s" },
			} as any);
			vi.advanceTimersByTime(10);

			expect(store.getState().links.map((l: any) => l.id)).toEqual([
				1, 2,
			]);
			expect(store.getState().conflicts).toHaveLength(1);
		});

		// the pass moves the tasks the rejected link reaches, and the constraint
		// on one of them makes that move visible
		test("a rejected link leaves no task on the position it caused", () => {
			const store = makeStore(
				[
					task({ id: 1, text: "A", duration: 2 }),
					task({
						id: 2,
						text: "B",
						start: new Date(2026, 3, 12),
						duration: 2,
						constraint: {
							type: "fnlt",
							date: new Date(2026, 3, 11),
						},
					}),
					task({
						id: 3,
						text: "C",
						start: new Date(2026, 3, 14),
						duration: 2,
					}),
				],
				[
					{ id: 1, source: 1, target: 2, type: "e2s" },
					{ id: 2, source: 2, target: 3, type: "e2s" },
				]
			);
			const before = store.getState().tasks.byId(2).start;

			store.in.exec("add-link", {
				link: { id: 3, source: 3, target: 1, type: "e2s" },
			} as any);
			vi.advanceTimersByTime(10);

			expect(store.getState().links.map((l: any) => l.id)).toEqual([
				1, 2,
			]);
			expect(store.getState().tasks.byId(2).start).toEqual(before);
		});
	});

	describe("marker", () => {
		// an unscheduled task has no bar and is kept out of the graph
		test("is not drawn for an unscheduled task", () => {
			const data: any = getData();
			const constraint = { type: "mso", date: new Date(2026, 3, 10) };
			data.tasks = [
				task({ unscheduled: true, start: undefined, constraint }),
				task({ id: 2, constraint }),
			];
			data.links = [];
			const store = new DataStore(writable);
			store.init({
				...data,
				unscheduledTasks: true,
				schedule: { auto: true },
				projectStart: new Date(2026, 3, 1),
			});
			vi.advanceTimersByTime(10);

			const marked = (store.getState()._tasks as any[]).filter(
				t => typeof t.$x_constraint === "number"
			);
			expect(marked.map(t => t.id)).toEqual([2]);
		});
	});

	describe("non-working days", () => {
		// Apr 11 2026 is a Saturday; the default calendar works Mon-Fri
		const saturday = new Date(2026, 3, 11);
		const sunday = new Date(2026, 3, 12);

		function withCalendar() {
			const data: any = getData();
			data.tasks = [task()];
			data.links = [];
			const store = new DataStore(writable);
			store.init({
				...data,
				calendar: "default",
				schedule: { auto: true },
				projectStart: new Date(2026, 3, 1),
			});
			return store;
		}

		test.each([
			["snet", new Date(2026, 3, 13)],
			["mso", new Date(2026, 3, 13)],
		])("%s snaps a start to a working day", (type, expected) => {
			const store = withCalendar();
			setConstraint(store, 1, { type, date: saturday });
			expect(store.getState().tasks.byId(1).constraint.date).toEqual(
				expected
			);
		});

		// a finish-side date is an exclusive end like task.end, so Saturday is a
		// valid one: it names a task that stops working on Friday
		test.each([["fnlt"], ["mfo"], ["fnet"]])(
			"%s keeps an end that follows a working day",
			type => {
				const store = withCalendar();
				setConstraint(store, 1, { type, date: saturday });
				expect(store.getState().tasks.byId(1).constraint.date).toEqual(
					saturday
				);
			}
		);

		test.each([
			["fnlt", new Date(2026, 3, 11)],
			["mfo", new Date(2026, 3, 11)],
			["fnet", new Date(2026, 3, 14)],
		])("%s snaps an end by its worked day", (type, expected) => {
			const store = withCalendar();
			setConstraint(store, 1, { type, date: sunday });
			expect(store.getState().tasks.byId(1).constraint.date).toEqual(
				expected
			);
		});

		// a milestone has no span, so its finish date is the single date itself
		test("a finish-side date on a milestone snaps like a start", () => {
			const store = withCalendar();
			store.in.exec("update-task", {
				id: 1,
				task: { type: "milestone" },
			} as any);
			vi.advanceTimersByTime(10);
			setConstraint(store, 1, { type: "mfo", date: saturday });
			expect(store.getState().tasks.byId(1).constraint.date).toEqual(
				new Date(2026, 3, 10)
			);
		});

		test("a working day is left untouched", () => {
			const store = withCalendar();
			const friday = new Date(2026, 3, 10);
			setConstraint(store, 1, { type: "snet", date: friday });
			expect(store.getState().tasks.byId(1).constraint.date).toEqual(
				friday
			);
		});

		// no direction preserves a pin, so it follows the edit that moved it
		test("a pin moved back off a working day snaps back", () => {
			const store = withCalendar();
			setConstraint(store, 1, {
				type: "mso",
				date: new Date(2026, 3, 13),
			});
			setConstraint(store, 1, { type: "mso", date: saturday });
			expect(store.getState().tasks.byId(1).constraint.date).toEqual(
				new Date(2026, 3, 10)
			);
		});

		test("a pin moved forward off a valid end snaps forward", () => {
			const store = withCalendar();
			setConstraint(store, 1, { type: "mfo", date: saturday });
			setConstraint(store, 1, { type: "mfo", date: sunday });
			expect(store.getState().tasks.byId(1).constraint.date).toEqual(
				new Date(2026, 3, 14)
			);
		});

		// a bound keeps its meaning instead: a floor never loosens
		test("a boundary moved back off a working day still snaps forward", () => {
			const store = withCalendar();
			setConstraint(store, 1, {
				type: "snet",
				date: new Date(2026, 3, 13),
			});
			setConstraint(store, 1, { type: "snet", date: saturday });
			expect(store.getState().tasks.byId(1).constraint.date).toEqual(
				new Date(2026, 3, 13)
			);
		});
	});

	// the report is derived state, never stored in history: the scheduler
	// abstains on undo, and the sweep re-reads the restored positions
	describe("undo", () => {
		test("clears the report when the move it describes is undone", () => {
			const store = makeStore(pinnedPair(), pinnedLink, true);
			pushPredecessor(store);
			expect(store.getState().conflicts).toHaveLength(1);

			store.in.exec("undo", {} as any);
			vi.advanceTimersByTime(10);

			expect(store.getState().tasks.byId(2).start).toEqual(
				new Date(2026, 3, 15)
			);
			expect(store.getState().conflicts).toHaveLength(0);
			expect(store.getState().history.undo).toBe(0);
		});

		test("reports again when undo brings a violated constraint back", () => {
			const store = makeStore(pinnedPair(), pinnedLink, true);
			pushPredecessor(store);

			setConstraint(store, 2, null);
			expect(store.getState().conflicts).toHaveLength(0);

			// the pass that freed B joined the same batch, so undo brings back both
			// the pin and the day it was holding, and the link is broken again
			store.in.exec("undo", {} as any);
			vi.advanceTimersByTime(10);

			expect(store.getState().tasks.byId(2).start).toEqual(
				new Date(2026, 3, 15)
			);
			expect(store.getState().conflicts).toHaveLength(1);
		});

		// history replays the whole recorded task, constraint included, and that
		// replay is no edit: a violated constraint comes back as it was recorded
		test("restores a constraint the dates it brings back violate", () => {
			const store = makeStore(
				[
					// its own floor keeps it from being pulled back to meet the deadline
					task({
						duration: 8,
						constraint: {
							type: "snet",
							date: new Date(2026, 3, 10),
						},
					}),
					task({
						id: 2,
						text: "B",
						start: new Date(2026, 3, 18),
						constraint: {
							type: "fnlt",
							date: new Date(2026, 3, 14),
						},
					}),
				],
				[{ id: 1, source: 1, target: 2, type: "e2s" }],
				true
			);
			expect(store.getState().conflicts).toHaveLength(1);
			const before = store.getState().tasks.byId(2);

			store.in.exec("update-task", {
				id: 2,
				task: {
					start: new Date(2026, 3, 24),
					end: new Date(2026, 3, 29),
				},
			} as any);
			vi.advanceTimersByTime(10);
			expect(store.getState().conflicts).toHaveLength(0);

			store.in.exec("undo", {} as any);
			vi.advanceTimersByTime(10);

			const after = store.getState().tasks.byId(2);
			expect(after.start).toEqual(before.start);
			expect(after.constraint.date).toEqual(new Date(2026, 3, 14));
			expect(store.getState().conflicts).toHaveLength(1);
		});

		test("redo re-derives the report as well", () => {
			const store = makeStore(pinnedPair(), pinnedLink, true);
			pushPredecessor(store);

			store.in.exec("undo", {} as any);
			vi.advanceTimersByTime(10);
			expect(store.getState().conflicts).toHaveLength(0);

			store.in.exec("redo", {} as any);
			vi.advanceTimersByTime(10);
			expect(store.getState().conflicts).toHaveLength(1);
		});
	});

	// the wrapper re-inits on any prop change, and only a data change reschedules
	describe("re-init", () => {
		// B's pin sits before A's finish, and A's own floor stops A being pulled
		// back to meet it, so the pin holds B and the link stays broken
		const violating = () => [
			task({ constraint: { type: "snet", date: new Date(2026, 3, 10) } }),
			task({
				id: 2,
				text: "B",
				start: new Date(2026, 3, 15),
				constraint: { type: "mso", date: new Date(2026, 3, 8) },
			}),
		];
		const links = [{ id: 1, source: 1, target: 2, type: "e2s" }];

		test("one that changes no data keeps the report", () => {
			const store = new DataStore(writable);
			store.init(config(violating(), links));
			vi.advanceTimersByTime(10);
			expect(store.getState().conflicts).toHaveLength(1);

			store.init(config(violating(), links));
			vi.advanceTimersByTime(10);
			expect(store.getState().conflicts).toHaveLength(1);
		});

		test("one that only turns auto scheduling on reports what it finds", () => {
			const store = new DataStore(writable);
			store.init({ ...config(violating(), links), schedule: {} });
			vi.advanceTimersByTime(10);
			expect(store.getState().conflicts).toHaveLength(0);

			store.init(config(violating(), links));
			vi.advanceTimersByTime(10);
			expect(store.getState().conflicts).toHaveLength(1);
		});

		// Apr 13 2026 is a Monday: five days end Apr 18 on the default calendar,
		// and Apr 21 once Wednesdays stop being worked
		const deadlined = () => [
			task({
				start: new Date(2026, 3, 13),
				duration: 5,
				constraint: { type: "fnlt", date: new Date(2026, 3, 18) },
			}),
		];

		test("one that only swaps the calendar keeps the report", () => {
			const store = new DataStore(writable);
			store.init({ ...config(deadlined()), calendar: "default" });
			vi.advanceTimersByTime(10);
			expect(store.getState().conflicts).toHaveLength(0);

			store.init({ ...config(deadlined()), calendar: "wednesday-off" });
			vi.advanceTimersByTime(10);
			expect(store.getState().conflicts).toHaveLength(0);
		});

		test("one that swaps the calendar with aligned tasks reschedules them", () => {
			const store = new DataStore(writable);
			store.init({ ...config(deadlined()), calendar: "default" });
			vi.advanceTimersByTime(10);
			expect(store.getState().conflicts).toHaveLength(0);

			const aligned = [
				task({
					start: new Date(2026, 3, 13),
					end: new Date(2026, 3, 21),
					constraint: { type: "fnlt", date: new Date(2026, 3, 18) },
				}),
			];
			store.init({ ...config(aligned), calendar: "wednesday-off" });
			vi.advanceTimersByTime(10);
			// the ceiling pulls the five days back to finish by Apr 18
			const t = store.getState().tasks.byId(1);
			expect(t.start).toEqual(new Date(2026, 3, 10));
			expect(t.end).toEqual(new Date(2026, 3, 18));
			expect(store.getState().conflicts).toHaveLength(0);
		});

		test("one that drops the constraint reschedules and clears it", () => {
			const store = new DataStore(writable);
			store.init(config(violating(), links));
			vi.advanceTimersByTime(10);
			expect(store.getState().conflicts).toHaveLength(1);

			const tasks = violating().map(t =>
				t.id === 2 ? { ...t, constraint: null } : t
			);
			store.init(config(tasks, links));
			vi.advanceTimersByTime(10);
			expect(store.getState().conflicts).toHaveLength(0);
		});
	});

	// constraints bound the CPM window, so they belong to the analysis even
	// with no scheduler running to act on them
	describe("critical path", () => {
		// C is long enough to fix the project end, leaving B slack to lose
		const network = () => [
			task({
				id: 1,
				text: "A",
				start: new Date(2026, 3, 6),
				duration: 2,
			}),
			task({
				id: 2,
				text: "B",
				start: new Date(2026, 3, 8),
				duration: 3,
			}),
			task({
				id: 3,
				text: "C",
				start: new Date(2026, 3, 6),
				duration: 15,
			}),
		];
		const links = [{ id: 1, source: 1, target: 2, type: "e2s" }];

		function cpmConfig(over: any = {}) {
			const data: any = getData();
			return {
				...data,
				tasks: network(),
				links,
				// no auto scheduling: nothing moves, only the analysis reacts
				schedule: {},
				criticalPath: { type: "flexible" },
				slack: true,
				projectStart: new Date(2026, 3, 6),
				...over,
			};
		}

		function cpmStore(over: any = {}) {
			const store = new DataStore(writable);
			store.init(cpmConfig(over));
			vi.advanceTimersByTime(20);
			return store;
		}

		const slackOf = (store: DataStore, id: number) =>
			store.getState().tasks.byId(id).slack?.totalSlack;

		test("a constraint edit refreshes the slack it changes", () => {
			const store = cpmStore();
			expect(slackOf(store, 2)).toBe(10);

			setConstraint(store, 2, {
				type: "snlt",
				date: new Date(2026, 3, 8),
			});
			expect(slackOf(store, 2)).toBe(0);
			// nothing moved, the constraint only narrowed the window
			expect(store.getState().tasks.byId(2).start).toEqual(
				new Date(2026, 3, 8)
			);
		});

		// nothing enforces a constraint here, so a violation is not an event:
		// the pressure it names is the negative slack
		test("no violation is reported without auto scheduling", () => {
			const store = cpmStore();
			expect(store.getState().conflicts).toHaveLength(0);

			setConstraint(store, 2, {
				type: "snlt",
				date: new Date(2026, 3, 6),
			});
			expect(slackOf(store, 2)).toBe(-2);
			expect(store.getState().conflicts).toHaveLength(0);
		});

		// the scheduler owns the report, so it ends with the scheduler
		test("turning auto scheduling off drops the report", () => {
			// A's own floor stops it being pulled back to meet B's ceiling, so the
			// ceiling holds B and the link between them is what breaks
			const tasks = network().map(t =>
				t.id === 1
					? {
							...t,
							constraint: {
								type: "snet",
								date: new Date(2026, 3, 6),
							},
						}
					: t
			);
			const store = cpmStore({ schedule: { auto: true }, tasks });
			setConstraint(store, 2, {
				type: "snlt",
				date: new Date(2026, 3, 6),
			});
			expect(store.getState().conflicts).toHaveLength(1);

			store.init(cpmConfig({ schedule: {}, tasks }));
			vi.advanceTimersByTime(20);
			expect(store.getState().conflicts).toHaveLength(0);
			// the path still measures what the constraint costs
			expect(slackOf(store, 2)).toBe(-2);
		});

		test("a re-init that moves the project end refreshes slack", () => {
			const store = new DataStore(writable);
			store.init(cpmConfig({ projectEnd: new Date(2026, 3, 27) }));
			vi.advanceTimersByTime(20);
			const before = slackOf(store, 2);

			store.init(cpmConfig({ projectEnd: new Date(2026, 4, 8) }));
			vi.advanceTimersByTime(20);
			expect(slackOf(store, 2)).toBeGreaterThan(before);
		});
	});

	describe("summaries", () => {
		test("turning a task into a summary drops its constraint", () => {
			const store = makeStore([
				task({
					constraint: { type: "mso", date: new Date(2026, 3, 10) },
				}),
			]);
			store.in.exec("update-task", {
				id: 1,
				task: { type: "summary" },
			} as any);
			vi.advanceTimersByTime(10);
			expect(store.getState().tasks.byId(1).constraint).to.be.null;
		});
	});

	describe("unscheduled tasks", () => {
		const fnet = { type: "fnet", date: new Date(2026, 3, 15) };

		function unscheduledStore(tasks: any[]) {
			const store = new DataStore(writable);
			store.init({
				...config(tasks, [], true),
				calendar: "default",
				unscheduledTasks: true,
			});
			vi.advanceTimersByTime(10);
			return store;
		}

		test("an unscheduled task keeps its constraint", () => {
			const store = unscheduledStore([
				task({ start: undefined, unscheduled: true, constraint: fnet }),
				task({ id: 2, start: undefined, unscheduled: true }),
			]);
			setConstraint(store, 2, fnet);

			const { tasks } = store.getState();
			expect(tasks.byId(1).constraint).toEqual(fnet);
			expect(tasks.byId(2).constraint).toEqual(fnet);
		});

		// the editor takes the date from the start, which an unscheduled task lacks
		test("a constraint without a date is not saved", () => {
			const store = unscheduledStore([
				task({ start: undefined, unscheduled: true, constraint: fnet }),
			]);
			store.in.exec("update-task", {
				id: 1,
				task: { text: "B", constraint: { type: "snet", date: null } },
			} as any);
			vi.advanceTimersByTime(10);

			// the rest of the update is saved
			const t = store.getState().tasks.byId(1);
			expect(t.text).toBe("B");
			expect(t.constraint).toEqual(fnet);
		});
	});
});

describe("constraint and scale range", () => {
	function bounds(constraints: boolean, type = "task") {
		const tasks: any = [
			{
				id: 1,
				type,
				start: new Date(2024, 3, 2),
				end: new Date(2024, 3, 5),
				constraint: { type: "fnlt", date: new Date(2024, 3, 25) },
			},
		];

		return calcScales(null, null, false, "day", tasks, { constraints });
	}

	test("extends the flexible scale when constraints are enabled", () => {
		expect(bounds(true)._end).to.eql(new Date(2024, 3, 26));
	});

	test("does not extend the scale when constraints are disabled", () => {
		expect(bounds(false)._end).to.eql(new Date(2024, 3, 6));
	});

	// the range reads the constraints, so it has to follow what switches them
	// on. turning auto scheduling off touches no task, so only the dependency
	// brings the range back
	test("turning the constraints off alone re-runs the range", () => {
		const data: any = getData();
		const cfg = (schedule: any) => ({
			...data,
			tasks: [
				{
					id: 1,
					type: "task",
					parent: 0,
					start: new Date(2024, 3, 2),
					end: new Date(2024, 3, 5),
					constraint: {
						type: "fnlt",
						date: new Date(2024, 3, 25),
					},
				},
			],
			links: [],
			start: null,
			end: null,
			schedule,
		});

		const store = new DataStore(writable);
		store.init(cfg({ auto: true }));
		expect(store.getState()._end).to.eql(new Date(2024, 3, 26));

		store.init(cfg({}));
		expect(store.getState()._end).to.eql(new Date(2024, 3, 6));
	});
});
