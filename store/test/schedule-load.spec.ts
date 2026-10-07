import { describe, expect, test } from "vitest";
import { writable } from "svelte/store";
import { DataStore, normalizeLinks, getDefaultColumns } from "../src/index";
import { ganttConfig, scales } from "./stubs/projectTree";

// What an initial load with schedule.auto produces. The plan is settled in init,
// on the tree it builds, before the router derives anything from it — so the
// results below are reached without a single event.

const flush = () => new Promise(resolve => setTimeout(resolve, 5));

function load(config: Record<string, any>) {
	const store = new DataStore(writable);
	const events: any[] = [];
	store.in.on("update-task", (ev: any) => events.push(ev));
	store.init({
		scales,
		cellWidth: 70,
		columns: getDefaultColumns(),
		...config,
		links: normalizeLinks(config.links || []),
	} as any);
	return { store, events };
}

const day = (n: number) => new Date(2026, 2, 1 + n);
const iso = (d: Date) => (d ? d.toDateString() : String(d));

describe("initial scheduling pass", () => {
	test("settles every link in the chain", async () => {
		const { store } = load(ganttConfig(50, { schedule: { auto: true } }));
		await flush();

		const { tasks, links } = store.getState();
		links.forEach((l: any) => {
			const source = tasks.byId(l.source);
			const target = tasks.byId(l.target);
			expect(
				target.start.valueOf(),
				`link ${l.id} left violated`
			).toBeGreaterThanOrEqual(source.end.valueOf());
		});
	});

	test("leaves the plan untouched when auto is off", async () => {
		const { store } = load(ganttConfig(50, { schedule: { auto: false } }));
		await flush();

		const { tasks } = store.getState();
		// leaf k was authored at [day k, day k + 2] and stays there
		expect(iso(tasks.byId(2).start)).toBe(iso(day(0)));
		expect(iso(tasks.byId(12).start)).toBe(iso(day(10)));
	});

	test("derives summary dates from the settled leaves", async () => {
		const { store } = load(ganttConfig(50, { schedule: { auto: true } }));
		await flush();

		const { tasks } = store.getState();
		const summary = tasks.byId(1);
		const leaves = tasks.toArray().filter((t: any) => t.parent === 1);
		const min = Math.min(...leaves.map((t: any) => t.start.valueOf()));
		const max = Math.max(...leaves.map((t: any) => t.end.valueOf()));

		expect(iso(summary.start)).toBe(iso(new Date(min)));
		expect(iso(summary.end)).toBe(iso(new Date(max)));
	});

	test("reports no conflicts for a plan it could settle", async () => {
		const { store } = load(ganttConfig(50, { schedule: { auto: true } }));
		await flush();
		expect(store.getState().conflicts).toEqual([]);
	});
});

describe("split tasks at load", () => {
	const config = (calendar: boolean, driverDuration: number) => ({
		tasks: [
			{
				id: 1,
				text: "driver",
				start: new Date(2024, 3, 1),
				duration: driverDuration,
			},
			{
				id: 2,
				text: "split",
				start: new Date(2024, 3, 1),
				segments: [
					{ start: new Date(2024, 3, 1), duration: 2 },
					{ start: new Date(2024, 3, 11), duration: 2 },
				],
			},
		],
		links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
		splitTasks: true,
		schedule: { auto: true },
		...(calendar ? { calendar: true } : {}),
	});

	const segments = async (calendar: boolean, driverDuration: number) => {
		const { store } = load(config(calendar, driverDuration));
		await flush();
		const task = store.getState().tasks.byId(2);
		return {
			start: iso(task.start),
			end: iso(task.end),
			duration: task.duration,
			segments: task.segments.map((s: any) => iso(s.start)),
		};
	};

	test("shifts every segment, no calendar", async () => {
		const res = await segments(false, 5);
		expect(res.segments).toEqual([
			iso(new Date(2024, 3, 6)),
			iso(new Date(2024, 3, 16)),
		]);
		// the task end follows the last segment, not the engine's own end
		expect(res.end).toBe(iso(new Date(2024, 3, 18)));
		expect(res.duration).toBe(4);
	});

	test("shifts by working days under a calendar", async () => {
		// +3 working days is not a whole work week, so a wall-clock shift of the
		// same span would put the second segment on Sunday Apr 14 instead
		const res = await segments(true, 3);
		expect(res.segments).toEqual([
			iso(new Date(2024, 3, 4)),
			iso(new Date(2024, 3, 16)),
		]);
	});

	test("a whole-week shift hides the difference", async () => {
		const res = await segments(true, 5);
		expect(res.segments).toEqual([
			iso(new Date(2024, 3, 8)),
			iso(new Date(2024, 3, 18)),
		]);
	});
});

describe("what the load pass records", () => {
	test("keeps the pass out of history", async () => {
		const { store } = load(
			ganttConfig(50, { schedule: { auto: true }, undo: true })
		);
		await flush();
		store.in.exec("undo", {} as any);
		await flush();

		// nothing to undo: the leaves stay where scheduling put them
		const { tasks } = store.getState();
		expect(tasks.byId(3).start.valueOf()).toBeGreaterThanOrEqual(
			tasks.byId(2).end.valueOf()
		);
	});
});
