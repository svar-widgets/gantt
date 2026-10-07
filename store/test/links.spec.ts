import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { updateLink } from "../src/links";
import { DataStore } from "../src/index";
import type { TLinkDraft, TLinkType } from "../src/types";
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

const linkIds = (store: DataStore) =>
	store.getState().links.map((l: any) => l.id);

describe("links", () => {
	test("link updating", () => {
		const link = { id: 1, source: 1, target: 2, type: "e2s" };
		const startTask = { $x: 100, $y: 3, $w: 300, $h: 31 };
		const endTask = { $x: 200, $y: 41, $w: 200, $h: 31 };

		const updatedLink = updateLink(
			link as any,
			startTask as any,
			endTask as any,
			38
		);

		expect(updatedLink.id).to.eq(1);
		expect(updatedLink.source).to.eq(1);
		expect(updatedLink.target).to.eq(2);
		expect(updatedLink.type).to.eq("e2s");
		expect(updatedLink.$p).to.eq(
			"400,18.5,420,18.5,420,37.5,180,37.5,180,56.5,200,56.5,195,53.5,195,59.5,200,56.5"
		);
	});
});

describe("link validation", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	// S { A, B }, C and D on their own
	const plan = () => [
		task({ id: 10, text: "S", type: "summary" }),
		task({ id: 1, text: "A", parent: 10 }),
		task({ id: 2, text: "B", parent: 10 }),
		task({ id: 3, text: "C" }),
		task({ id: 4, text: "D" }),
	];
	const exec = (store: DataStore, action: string, ev: any) => {
		store.in.exec(action as any, ev);
		vi.advanceTimersByTime(10);
	};

	const planLinks = () => [
		{ id: 1, source: 3, target: 4, type: "e2s" },
		{ id: 2, source: 10, target: 3, type: "e2s" },
	];
	const getRemoved = (store: DataStore, action: string, ev: any) => {
		const removed: any[] = [];
		store.in.on("delete-link", (e: any) => {
			removed.push(e.reason);
		});
		exec(store, action, ev);
		return removed;
	};

	test.each<[TLinkDraft, string | null]>([
		[{ source: 1, target: 3, type: "e2s" }, null],
		[{ source: 4, target: 3, type: "e2s" }, "cycle"],
		[{ source: 1, target: 10, type: "e2s" }, "parent-chain"],
		[{ source: 10, target: 4, type: "s2s" }, "summary-endpoint"],
	])("agree with the pass after add-link: %o", (link, reason) => {
		const store = makeStore(plan(), planLinks());
		expect(store.getLinkValidator()(link)).toBe(reason);
		const ev = { link: { id: 99, ...link } };
		expect(getRemoved(store, "add-link", ev)).toEqual(
			reason ? [reason] : []
		);
		expect(linkIds(store).includes(99)).toBe(!reason);
	});

	test.each<[number, TLinkType, string | null]>([
		[1, "s2s", null],
		[2, "e2e", null],
		[2, "s2s", "summary-endpoint"],
	])(
		"agree with the pass after update-link: %s to %s",
		(id, type, reason) => {
			const store = makeStore(plan(), planLinks());
			const link = { ...store.getState().links.byId(id), type };
			expect(store.getLinkValidator()(link)).toBe(reason);
			const ev = { id, link: { type } };
			expect(getRemoved(store, "update-link", ev)).toEqual(
				reason ? [reason] : []
			);
			expect(linkIds(store).includes(id)).toBe(!reason);
		}
	);

	test("pass every link while auto-scheduling is off", () => {
		const off = makeStore(plan(), [], { schedule: { auto: false } });
		expect(off.getLinkValidator()({ source: 1, target: 10 } as any)).toBe(
			null
		);
	});

	test("pass what a pass keeps when a task is out of the schedule", () => {
		// P is an ordinary parent, inactive while its child Q is not
		const tasks = [
			...plan(),
			task({ id: 5, text: "P" }),
			task({ id: 6, text: "Q", parent: 5 }),
		];
		const cases = [
			{ source: 6, target: 5, type: "e2s" },
			{ source: 10, target: 3, type: "s2s" },
		];
		for (const link of cases) {
			const store = makeStore(tasks, [], { inactiveTasks: true });
			exec(store, "update-task", { id: 5, task: { inactive: true } });
			exec(store, "update-task", {
				id: 10,
				task: { inactive: true },
			});
			expect(store.getLinkValidator()(link as any)).toBeNull();

			exec(store, "add-link", { link: { id: 99, ...link } });
			expect(linkIds(store)).toContain(99);
		}
	});

	test("answer for the data as it is, pass or no pass", () => {
		// no pass follows an unscheduled task's return
		const store = makeStore(plan(), [], { unscheduledTasks: true });
		exec(store, "update-task", { id: 3, task: { unscheduled: true } });
		exec(store, "add-link", {
			link: { id: 1, source: 3, target: 4, type: "e2s" },
		});
		const cycle = { source: 4, target: 3, type: "e2s" } as const;
		expect(store.getLinkValidator()(cycle)).toBeNull();
		const passes = vi.fn();
		store.in.on("schedule-tasks", passes);
		exec(store, "update-task", { id: 3, task: { unscheduled: false } });
		expect(passes).not.toHaveBeenCalled();
		expect(store.getLinkValidator()(cycle)).toBe("cycle");
	});
});
