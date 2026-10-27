import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { DataStore, normalizeLinks, getEditorItems } from "../src/index";
import { writable } from "svelte/store";
import { getData } from "./stubs/data";

const day = (d: number) => new Date(2024, 3, d);

function getStore(tasks: any[], config: any = {}) {
	const store = new DataStore(writable);
	store.init({
		...getData(),
		tasks,
		schedule: { auto: true },
		...config,
		links: normalizeLinks(config.links ?? []),
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

describe("manual summaries", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	describe("load", () => {
		test("a manual summary keeps its dates on load with inactiveTasks on", () => {
			const store = getStore(plan({}, { start: day(8), duration: 5 }), {
				inactiveTasks: true,
			});

			expect(span(store, "M")).to.deep.eq([day(1), day(10)]);
		});

		test("a manual summary derives its inactive flag on load", () => {
			const store = getStore(plan({}, { inactive: true }), {
				inactiveTasks: true,
			});

			expect(byId(store, "M").inactive).to.eq(true);
			expect(span(store, "M")).to.deep.eq([day(1), day(10)]);
		});
	});

	describe("members", () => {
		test("a manual summary keeps its dates when a member moves", () => {
			const store = getStore(plan());

			store.in.exec("update-task", {
				id: "K",
				task: { start: day(12), duration: 3 },
			});
			vi.advanceTimersByTime(1);

			expect(span(store, "M")).to.deep.eq([day(1), day(10)]);
			expect(byId(store, "K").start).to.deep.eq(day(12));
		});

		test("a manual summary follows its members with auto scheduling off", () => {
			const store = getStore(plan(), { schedule: { auto: false } });

			store.in.exec("update-task", {
				id: "K",
				task: { start: day(12), duration: 3 },
			});

			expect(span(store, "M")).to.deep.eq([day(12), day(15)]);
		});

		test("a summary above a manual summary follows the manual summary's dates", () => {
			const store = getStore([
				{ id: "S", type: "summary" },
				...plan({ parent: "S" }),
			]);

			store.in.exec("update-task", {
				id: "K",
				task: { start: day(12), duration: 3 },
			});
			vi.advanceTimersByTime(1);

			expect(span(store, "S")).to.deep.eq([day(1), day(10)]);
		});
	});

	describe("drag", () => {
		test("moving a manual summary leaves its members in place", () => {
			const store = getStore(plan());
			const m = byId(store, "M");

			store.in.exec("update-task", {
				id: "M",
				diff: 2,
				task: { start: m.start, end: m.end },
			});
			vi.advanceTimersByTime(1);

			expect(span(store, "M")).to.deep.eq([day(3), day(12)]);
			expect(span(store, "K")).to.deep.eq([day(2), day(5)]);
		});

		test("moving an ordinary summary shifts its members", () => {
			const store = getStore(
				plan({ manual: false, start: undefined, end: undefined })
			);
			const m = byId(store, "M");

			store.in.exec("update-task", {
				id: "M",
				diff: 2,
				task: { start: m.start, end: m.end },
			});
			vi.advanceTimersByTime(1);

			expect(byId(store, "K").start).to.deep.eq(day(4));
		});

		test("resizing a manual summary changes only its own end", () => {
			const store = getStore(plan());

			store.in.exec("update-task", {
				id: "M",
				diff: 2,
				task: { end: byId(store, "M").end },
			});
			vi.advanceTimersByTime(1);

			expect(span(store, "M")).to.deep.eq([day(1), day(12)]);
			expect(span(store, "K")).to.deep.eq([day(2), day(5)]);
		});

		test("dragging a manual summary or a member leaves the other's bar in place", () => {
			const store = getStore(plan());
			const m = byId(store, "M");
			const k = byId(store, "K");
			const [mx, mw, kx] = [m.$x, m.$w, k.$x];

			store.in.exec("drag-task", { id: "M", left: mx + 200 });
			expect(k.$x).to.eq(kx);

			store.in.exec("drag-task", { id: "M", left: mx });
			store.in.exec("drag-task", { id: "K", left: kx + 1000 });
			expect([m.$x, m.$w]).to.deep.eq([mx, mw]);
		});

		test("dragging the summary above a manual summary leaves its bar and its members' bars in place", () => {
			const store = getStore([
				{ id: "S", type: "summary", open: true },
				...plan({ parent: "S", open: true }),
				{ id: "R", parent: "S", start: day(2), duration: 3 },
			]);
			const s = byId(store, "S");
			const m = byId(store, "M");
			const k = byId(store, "K");
			const r = byId(store, "R");
			const [mx, kx, rx] = [m.$x, k.$x, r.$x];

			store.in.exec("drag-task", { id: "S", left: s.$x + 200 });

			expect([m.$x, k.$x, r.$x]).to.deep.eq([mx, kx, rx + 200]);
		});
	});

	describe("manual flag", () => {
		test("clearing manual respans the summary and the summary above it", () => {
			const store = getStore([
				{ id: "S", type: "summary" },
				...plan({ parent: "S" }),
			]);

			store.in.exec("update-task", { id: "M", task: { manual: false } });
			vi.advanceTimersByTime(1);

			expect(span(store, "M")).to.deep.eq([day(2), day(5)]);
			expect(span(store, "S")).to.deep.eq([day(2), day(5)]);
		});

		test("switching auto scheduling off and on leaves a manual summary on its members' span", () => {
			const store = getStore([
				...plan(),
				{
					id: "D",
					type: "summary",
					start: day(1),
					end: day(20),
				},
				{ id: "E", parent: "D", start: day(2), duration: 1 },
			]);

			store.init({ schedule: { auto: false } });
			expect(span(store, "M")).to.deep.eq([day(2), day(5)]);
			expect(span(store, "D")).to.deep.eq([day(1), day(20)]);

			store.init({ schedule: { auto: true } });
			vi.advanceTimersByTime(1);
			expect(span(store, "M")).to.deep.eq([day(2), day(5)]);
			expect(byId(store, "M").manual).to.eq(true);
		});

		test("with autoConvert, a manual task gaining a child becomes a manual summary", () => {
			const store = getStore(
				[{ id: "A", start: day(1), duration: 2, manual: true }],
				{ summary: { autoConvert: true } }
			);

			store.in.exec("add-task", {
				target: "A",
				mode: "child",
				task: { start: day(5), duration: 3 },
			});
			vi.advanceTimersByTime(1);

			const a = byId(store, "A");
			expect([a.type, a.manual]).to.deep.eq(["summary", true]);
			expect(span(store, "A")).to.deep.eq([day(1), day(3)]);
		});
	});

	describe("editor", () => {
		const items = getEditorItems({ schedule: { auto: true } } as any);
		const hidden = (key: string, task: any, auto = true) =>
			items.find(i => i.key === key)!.isHidden!(task, {
				schedule: { auto },
			} as any);

		test("the editor shows the manual flag and the dates for a manual summary", () => {
			const task = { type: "summary", manual: true, parent: 0 };

			expect(hidden("manual", task)).to.eq(false);
			expect(hidden("start", task)).to.eq(false);
			expect(hidden("end", task)).to.eq(false);
			expect(hidden("duration", task)).to.eq(false);
		});

		test("the editor hides the dates for an ordinary summary and with auto scheduling off", () => {
			const task = { type: "summary", manual: true, parent: 0 };

			expect(hidden("start", { ...task, manual: false })).to.eq(true);
			expect(hidden("start", task, false)).to.eq(true);
		});
	});
});
