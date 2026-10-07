import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { DataStore, normalizeLinks } from "../src/index";
import { writable } from "svelte/store";
import { buildScheduleGraph } from "../src/pro/scheduleGraph";
import { getData } from "./stubs/data";

const downloaded = vi.hoisted(() => ({ xml: "" }));
vi.mock("@svar/lib-mspx", async importOriginal => ({
	...(await importOriginal<typeof import("@svar/lib-mspx")>()),
	downloadAs: (xml: string) => {
		downloaded.xml = xml;
	},
}));

const day = (d: number) => new Date(2024, 3, d);

// A → B → C, one working day each
const chain = () => [
	{ id: "A", start: day(1), duration: 1 },
	{ id: "B", start: day(2), duration: 1 },
	{ id: "C", start: day(3), duration: 1 },
];
const chainLinks = [
	{ id: 1, source: "A", target: "B", type: "e2s" },
	{ id: 2, source: "B", target: "C", type: "e2s" },
];

function getStore(tasks: any[], config: any = {}) {
	const store = new DataStore(writable);
	store.init({
		...getData(),
		tasks,
		schedule: { auto: true },
		...config,
		links: normalizeLinks(config.links ?? chainLinks),
	});
	vi.advanceTimersByTime(1);
	return store;
}

const byId = (store: DataStore, id: any) => store.getState().tasks.byId(id);
const span = (store: DataStore, id: any) => {
	const t = byId(store, id);
	return [t.start, t.end];
};

const plan = (m: any = {}, k: any = {}) => [
	{
		id: "M",
		type: "summary",
		start: day(1),
		end: day(10),
		manual: true,
		...m,
	},
	{ id: "K", parent: "M", start: day(2), duration: 3, ...k },
];

describe("scheduling flags", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	describe("graph membership", () => {
		test("drops inactive tasks and every link that touched them", () => {
			const store = getStore(
				[
					{ id: "A", start: day(1), duration: 1 },
					{ id: "B", start: day(2), duration: 1, inactive: true },
					{ id: "C", start: day(3), duration: 1 },
				],
				{ inactiveTasks: true }
			);

			const { tasks, links } = buildScheduleGraph(store.getState());

			expect(tasks.map(t => t.id)).to.deep.eq(["A", "C"]);
			expect(links.length).to.eq(0);
		});

		test("keeps them while the option is off", () => {
			const store = getStore([
				{ id: "A", start: day(1), duration: 1 },
				{ id: "B", start: day(2), duration: 1, inactive: true },
				{ id: "C", start: day(3), duration: 1 },
			]);

			const { tasks, links } = buildScheduleGraph(store.getState());

			expect(tasks.length).to.eq(3);
			expect(links.length).to.eq(2);
		});

		test("hands manual through to the graph unchanged", () => {
			const store = getStore([
				{ id: "A", start: day(1), duration: 1, manual: true },
				{ id: "B", start: day(2), duration: 1 },
				{ id: "C", start: day(3), duration: 1 },
			]);

			const { tasks } = buildScheduleGraph(store.getState());

			expect(tasks.find(t => t.id === "A")!.manual).to.eq(true);
		});

		test("clears manual in the graph with auto scheduling off", () => {
			const store = getStore(
				[
					{ id: "A", start: day(1), duration: 1, manual: true },
					...plan(),
				],
				{ links: [], schedule: { auto: false } }
			);

			const { tasks } = buildScheduleGraph(store.getState());

			expect(tasks.find(t => t.id === "A")!.manual).to.eq(false);
			expect(tasks.find(t => t.id === "M")!.manual).to.eq(false);
			expect(byId(store, "A").manual).to.eq(true);
		});
	});

	describe("manual", () => {
		test("the autoscheduler does not reposition a manual task", () => {
			const store = getStore([
				{ id: "A", start: day(1), duration: 1 },
				{ id: "B", start: day(10), duration: 1, manual: true },
				{ id: "C", start: day(11), duration: 1 },
			]);

			store.in.exec("update-task", {
				id: "A",
				task: { start: day(5), duration: 1 },
			});
			vi.advanceTimersByTime(1);

			expect(byId(store, "B").start).to.deep.eq(day(10));
		});

		test("a direct edit still moves it", () => {
			const store = getStore([
				{ id: "A", start: day(1), duration: 1 },
				{ id: "B", start: day(10), duration: 1, manual: true },
				{ id: "C", start: day(11), duration: 1 },
			]);

			store.in.exec("update-task", {
				id: "B",
				task: { start: day(15), duration: 1 },
			});
			vi.advanceTimersByTime(1);

			expect(byId(store, "B").start).to.deep.eq(day(15));
		});

		test("turning it off returns the task to the plan", () => {
			// B sits earlier than A → B allows; manual holds it there
			const store = getStore([
				{ id: "A", start: day(5), duration: 1 },
				{ id: "B", start: day(1), duration: 1, manual: true },
				{ id: "C", start: day(2), duration: 1 },
			]);
			expect(byId(store, "B").start).to.deep.eq(day(1));

			store.in.exec("update-task", { id: "B", task: { manual: false } });
			vi.advanceTimersByTime(1);

			// the position it held carries no authority once the engine owns it
			expect(byId(store, "B").start).to.deep.eq(day(6));
			expect(byId(store, "C").start).to.deep.eq(day(7));
		});

		test("a manual task leaves the critical path unchanged with auto scheduling off", () => {
			const store = getStore(
				[
					{ id: "A", start: day(1), duration: 2 },
					{ id: "B", start: day(10), duration: 2, manual: true },
					{ id: "C", start: day(12), duration: 2 },
				],
				{
					schedule: { auto: false },
					criticalPath: { type: "strict" },
					slack: true,
				}
			);

			expect(byId(store, "B").critical).to.not.eq(true);
			expect(byId(store, "B").slack.totalSlack).to.eq(7);
		});

		test("turning it on runs no pass", () => {
			const store = getStore(chain());
			const before = byId(store, "C").start;

			store.in.exec("update-task", { id: "B", task: { manual: true } });
			vi.advanceTimersByTime(1);

			expect(byId(store, "B").start).to.deep.eq(day(2));
			expect(byId(store, "C").start).to.deep.eq(before);
		});

		describe("MS Project export", () => {
			const exported = (auto: boolean) => {
				const store = getStore(
					[
						{ id: "S", type: "summary", open: true },
						{ id: "A", parent: "S", start: day(1), duration: 1 },
						{
							id: "B",
							parent: "S",
							start: day(5),
							duration: 1,
							manual: true,
						},
					],
					{ links: [], schedule: { auto } }
				);
				store.in.exec("export-data", { format: "mspx" });
				return Array.from(
					downloaded.xml.matchAll(/<Manual>(\d)<\/Manual>/g),
					m => m[1]
				).slice(1);
			};

			test("writes every task manual with auto scheduling off", () => {
				expect(exported(false)).to.deep.eq(["1", "1", "1"]);
			});

			test("writes only a task marked manual with auto scheduling on", () => {
				expect(exported(true)).to.deep.eq(["0", "0", "1"]);
			});
		});
	});

	describe("manual summaries", () => {
		test("a manual summary enters the graph with its manual flag", () => {
			const store = getStore(plan(), { links: [] });
			const { tasks } = buildScheduleGraph(store.getState());

			const m = tasks.find(t => t.id === "M")!;
			expect([m.type, m.manual]).to.deep.eq(["summary", true]);
		});

		test("a link from a manual summary binds to the summary, not to its members", () => {
			const store = getStore(
				[
					...plan({}, { start: day(8), duration: 5 }),
					{ id: "B", start: day(10), duration: 1 },
				],
				{ links: [{ id: 1, source: "M", target: "B", type: "e2s" }] }
			);

			store.in.exec("update-task", {
				id: "M",
				diff: 1,
				task: { end: byId(store, "M").end },
			});
			vi.advanceTimersByTime(1);

			expect(byId(store, "B").start).to.deep.eq(day(11));
		});

		test("a predecessor does not move a manual summary", () => {
			const store = getStore(
				[{ id: "A", start: day(5), duration: 3 }, ...plan()],
				{ links: [{ id: 1, source: "A", target: "M", type: "e2s" }] }
			);

			expect(span(store, "M")).to.deep.eq([day(1), day(10)]);
		});

		test("a member pushed past a manual summary does not widen the summary above", () => {
			const store = getStore(
				[
					{ id: "S", type: "summary" },
					...plan({ parent: "S" }),
					{ id: "A", start: day(1), duration: 1 },
				],
				{ links: [{ id: 1, source: "A", target: "K", type: "e2s" }] }
			);

			store.in.exec("update-task", {
				id: "A",
				task: { start: day(12), duration: 1 },
			});
			vi.advanceTimersByTime(1);

			expect(byId(store, "K").start).to.deep.eq(day(13));
			expect(span(store, "S")).to.deep.eq([day(1), day(10)]);
		});

		test("dragging the summary above a manual summary holds its subtree and widens the summary", () => {
			const store = getStore(
				[
					{ id: "S", type: "summary" },
					...plan(
						{ parent: "S", start: day(10), end: day(20) },
						{ start: day(5), duration: 2 }
					),
					{ id: "R", parent: "S", start: day(12), duration: 2 },
				],
				{ links: [] }
			);
			const s = byId(store, "S");

			store.in.exec("update-task", {
				id: "S",
				diff: -3,
				task: { start: s.start, end: s.end },
			});
			vi.advanceTimersByTime(1);

			expect(span(store, "M")).to.deep.eq([day(10), day(20)]);
			expect(byId(store, "K").start).to.deep.eq(day(5));
			expect(byId(store, "R").start).to.deep.eq(day(9));
			expect(span(store, "S")).to.deep.eq([day(9), day(20)]);
		});
	});

	describe("inactive", () => {
		test("an inactive task is not moved and cascades nothing", () => {
			const store = getStore(
				[
					{ id: "A", start: day(1), duration: 1 },
					{ id: "B", start: day(20), duration: 1, inactive: true },
					{ id: "C", start: day(3), duration: 1 },
				],
				{ inactiveTasks: true }
			);

			store.in.exec("update-task", {
				id: "A",
				task: { start: day(5), duration: 1 },
			});
			vi.advanceTimersByTime(1);

			expect(byId(store, "B").start).to.deep.eq(day(20));
			// C's only link came through B, so it is unconstrained
			expect(byId(store, "C").start).to.deep.eq(day(3));
		});

		test("reactivating puts the task and its links back in the graph", () => {
			// B drifted below what A → B allows while it was out of the graph
			const store = getStore(
				[
					{ id: "A", start: day(5), duration: 1 },
					{ id: "B", start: day(1), duration: 1, inactive: true },
					{ id: "C", start: day(2), duration: 1 },
				],
				{ inactiveTasks: true }
			);
			expect(byId(store, "B").start).to.deep.eq(day(1));

			store.in.exec("update-task", {
				id: "B",
				task: { inactive: false },
			});
			vi.advanceTimersByTime(1);

			expect(byId(store, "B").start).to.deep.eq(day(6));
			expect(byId(store, "C").start).to.deep.eq(day(7));
		});

		test("deactivating takes it and its links out of the plan", () => {
			const store = getStore(
				[
					{ id: "A", start: day(1), duration: 1 },
					{ id: "B", start: day(2), duration: 1 },
					{ id: "C", start: day(3), duration: 1 },
				],
				{ inactiveTasks: true }
			);

			store.in.exec("update-task", { id: "B", task: { inactive: true } });
			vi.advanceTimersByTime(1);

			store.in.exec("update-task", {
				id: "A",
				task: { start: day(10), duration: 1 },
			});
			vi.advanceTimersByTime(1);

			// neither B nor the link through it is in the graph any more
			expect(byId(store, "B").start).to.deep.eq(day(2));
			expect(byId(store, "C").start).to.deep.eq(day(3));
		});
	});

	describe("critical path", () => {
		test("an inactive task carries neither critical nor slack", () => {
			const store = getStore(
				[
					{ id: "A", start: day(1), duration: 1 },
					{ id: "B", start: day(2), duration: 1, inactive: true },
					{ id: "C", start: day(3), duration: 1 },
				],
				{
					inactiveTasks: true,
					criticalPath: { type: "flexible" },
					slack: true,
				}
			);
			vi.advanceTimersByTime(20);

			expect(byId(store, "B").critical).to.be.undefined;
			expect(byId(store, "B").slack).to.be.undefined;
		});

		test("a link touching an inactive task is never critical", () => {
			const store = getStore(
				[
					{ id: "A", start: day(1), duration: 1 },
					{ id: "B", start: day(2), duration: 1, inactive: true },
					{ id: "C", start: day(3), duration: 1 },
				],
				{ inactiveTasks: true, criticalPath: { type: "flexible" } }
			);
			vi.advanceTimersByTime(20);

			store.getState().links.forEach((l: any) => {
				expect(l.critical, `link ${l.id}`).to.be.undefined;
			});
		});
	});
});
