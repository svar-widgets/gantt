import { describe, expect, test } from "vitest";
import { writable } from "svelte/store";
import { DataStore, getDefaultColumns } from "../src/index";

// A summary can only be derived once everything below it is dated. Load does that
// in one post-order walk, so these pin the ordering: flip the walk to pre-order and
// the first case fails, because a leaf's computed end is not there yet.

const d = (n: number) => new Date(2026, 2, n);
const iso = (x: Date) => (x ? x.toDateString() : String(x));

function makeStore(tasks: any[]) {
	const store = new DataStore(writable);
	store.init({
		tasks,
		links: [],
		scales: [{ unit: "day", step: 1, format: "%d" }],
		cellWidth: 70,
		columns: getDefaultColumns(),
		start: d(1),
		end: d(40),
	} as any);
	return store;
}

const load = (tasks: any[]) => makeStore(tasks).getState().tasks;

describe("deeply nested dateless summaries", () => {
	// 1 ─ 2 ─ 3 ─ 4 (Mar 10, duration 2 -> end Mar 12)
	//     │   └── 5 (Mar 20 .. Mar 25)
	//     └── 6 (Mar 5, duration 2)
	// └─── 7 ─ 8 (Apr 1 .. Apr 3)
	// declared kids-before-parents, to rule out array order mattering
	const tree = () => [
		{ id: 4, parent: 3, text: "leaf 4", start: d(10), duration: 2 },
		{ id: 5, parent: 3, text: "leaf 5", start: d(20), end: d(25) },
		{ id: 3, parent: 2, text: "sum 3", type: "summary" },
		{ id: 6, parent: 2, text: "leaf 6", start: d(5), duration: 2 },
		{ id: 2, parent: 1, text: "sum 2", type: "summary" },
		{ id: 8, parent: 7, text: "leaf 8", start: d(32), end: d(34) },
		{ id: 7, parent: 1, text: "sum 7", type: "summary" },
		{ id: 1, text: "sum 1", type: "summary" },
	];

	test("every level derives from the level below", () => {
		const tasks = load(tree());
		const span = (id: number) => [
			iso(tasks.byId(id).start),
			iso(tasks.byId(id).end),
		];

		// leaf 4 has no authored end: it exists only if the leaf was dated first
		expect(span(4)).toEqual([iso(d(10)), iso(d(12))]);
		expect(span(3)).toEqual([iso(d(10)), iso(d(25))]);
		expect(span(2)).toEqual([iso(d(5)), iso(d(25))]);
		expect(span(7)).toEqual([iso(d(32)), iso(d(34))]);
		expect(span(1)).toEqual([iso(d(5)), iso(d(34))]);
	});

	test("a nested summary with its own dates keeps them and feeds the parent", () => {
		const tasks = load([
			...tree().filter(t => t.id !== 3),
			{
				id: 3,
				parent: 2,
				text: "sum 3",
				type: "summary",
				start: d(8),
				end: d(28),
			},
		]);
		expect(iso(tasks.byId(3).start)).toBe(iso(d(8)));
		expect(iso(tasks.byId(3).end)).toBe(iso(d(28)));
		// the parent widens to the pinned span, not to the leaves under it
		expect(iso(tasks.byId(2).start)).toBe(iso(d(5)));
		expect(iso(tasks.byId(2).end)).toBe(iso(d(28)));
	});

	test("a plain task with children still reaches the summary above", () => {
		// 9 is type "task" with kids and no dates of its own
		const tasks = load([
			{ id: 1, text: "sum 1", type: "summary" },
			{ id: 9, parent: 1, text: "container", type: "task" },
			{ id: 10, parent: 9, text: "leaf", start: d(3), duration: 4 },
			{ id: 11, parent: 9, text: "leaf", start: d(15), end: d(18) },
		]);
		expect(iso(tasks.byId(1).start)).toBe(iso(d(3)));
		expect(iso(tasks.byId(1).end)).toBe(iso(d(18)));
	});

	test("a milestone contributes its start at both ends", () => {
		const tasks = load([
			{ id: 1, text: "sum 1", type: "summary" },
			{ id: 2, parent: 1, text: "ms", type: "milestone", start: d(9) },
			{ id: 3, parent: 1, text: "leaf", start: d(4), duration: 2 },
		]);
		expect(iso(tasks.byId(1).start)).toBe(iso(d(4)));
		expect(iso(tasks.byId(1).end)).toBe(iso(d(9)));
	});
});

// A lazily loaded branch is dated in two halves that meet at the branch owner:
// everything below it comes from the tree walk, the owner and its ancestors from
// resetSummaryDates. Remove either and one of these three fails.
describe("provide-data into a branch holding a nested summary", () => {
	const lazy = () => [
		{ id: 1, text: "root", type: "summary" },
		{
			id: 2,
			parent: 1,
			text: "lazy branch",
			type: "summary",
			lazy: true,
			start: d(1),
			end: d(2),
		},
		{ id: 3, parent: 1, text: "sibling", start: d(4), duration: 2 },
	];

	test("dates the batch, then propagates upward", () => {
		const store = makeStore(lazy());
		store.in.exec("provide-data", {
			id: 2,
			data: {
				tasks: [
					{ id: 30, parent: 2, text: "sub", type: "summary" },
					{
						id: 31,
						parent: 30,
						text: "a",
						start: d(10),
						duration: 2,
					},
					{ id: 32, parent: 30, text: "b", start: d(20), end: d(25) },
					{ id: 33, parent: 2, text: "c", start: d(8), duration: 1 },
				],
				links: [],
			},
		} as any);

		const tasks = store.getState().tasks;
		const span = (id: number) => [
			iso(tasks.byId(id).start),
			iso(tasks.byId(id).end),
		];

		// the nested summary arrived dateless, inside the batch
		expect(span(30)).toEqual([iso(d(10)), iso(d(25))]);
		// the branch owner is not part of the walk
		expect(span(2)).toEqual([iso(d(8)), iso(d(25))]);
		// and its ancestor, which also keeps the sibling outside the branch
		expect(span(1)).toEqual([iso(d(4)), iso(d(25))]);
	});
});
