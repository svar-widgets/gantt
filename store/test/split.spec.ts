import { describe, expect, test } from "vitest";
import { IParsedTask } from "../src/types";
import { DataStore, normalizeLinks } from "../src/index";
import { writable } from "svelte/store";
import { getData } from "./stubs/data";

function getDataStore(data: any, extra: Record<string, any> = {}) {
	const store = new DataStore(writable);
	if (data.links) data.links = normalizeLinks(data.links);
	store.init({
		...data,
		splitTasks: true,
		durationUnit: "day",
		...extra,
	});
	return store;
}

function splitCalendarTasks() {
	return [
		{
			id: 1,
			text: "Split",
			type: "task",
			parent: 0,
			start: new Date(2026, 3, 9),
			duration: 3,
			segments: [
				{ start: new Date(2026, 3, 9), duration: 1 },
				{ start: new Date(2026, 3, 14), duration: 2 },
			],
		},
	];
}

describe("split tasks", () => {
	test("supports split-task action for a task", () => {
		const store = getDataStore(getData("pretty"));
		const { tasks } = store.getState();
		let task: IParsedTask = tasks.byId(20);
		const { start, end, duration } = task;
		store.in.exec("split-task", { id: 20 });
		task = tasks.byId(20);
		const { start: start2, end: end2, duration: duration2 } = task;
		expect(task.segments.length).toBe(2);
		expect(start.valueOf()).toBe(start2.valueOf());
		expect(end.valueOf()).not.toBe(end2.valueOf());
		expect(duration).toBe(duration2);
		expect(task.segments[1].end.valueOf()).toBe(end2.valueOf());
	});
	test("supports split-task action for a split segment", () => {
		const store = getDataStore(getData("pretty"));
		const { tasks } = store.getState();
		let task = tasks.byId(20);
		const { start, end, duration } = task;
		store.in.exec("split-task", { id: 20 });
		store.in.exec("split-task", { id: 20, segmentIndex: 0 });
		task = tasks.byId(20);
		const { start: start2, end: end2, duration: duration2 } = task;
		expect(task.segments.length).toBe(3);
		expect(start.valueOf()).toBe(start2.valueOf());
		expect(end.valueOf()).not.toBe(end2.valueOf());
		expect(duration).toBe(duration2);
	});
	test("supports merge segments when there is not gap between them", () => {
		const store = getDataStore(getData("pretty"));
		const { tasks } = store.getState();
		store.in.exec("split-task", { id: 20 });
		store.in.exec("split-task", { id: 20, segmentIndex: 0 });
		let task = tasks.byId(20);
		expect(task.segments.length).toBe(3);
		store.in.exec("update-task", {
			id: 20,
			segmentIndex: 0,
			task: { end: new Date(2024, 3, 4) },
		});
		task = tasks.byId(20);
		expect(task.segments.length).toBe(2);
		store.in.exec("update-task", {
			id: 20,
			segmentIndex: 1,
			task: { start: new Date(2024, 3, 5) },
		});
		task = tasks.byId(20);
		expect(task.segments).toBe(null);
	});
	test("adjust segments on start/end split task update", () => {
		const store = getDataStore(getData("pretty"));
		const { tasks } = store.getState();
		store.in.exec("split-task", { id: 20 });
		store.in.exec("split-task", { id: 20, segmentIndex: 0 });
		let task = tasks.byId(20);
		expect(task.segments.length).toBe(3);
		expect(task.duration).toBe(4);
		store.in.exec("update-task", {
			id: 20,
			task: { end: new Date(2024, 3, 7) },
		});
		task = tasks.byId(20);
		expect(task.segments.length).toBe(3);
		expect(task.duration).toBe(3);
		expect(task.segments[2].end.valueOf()).toBe(task.end.valueOf());
		store.in.exec("update-task", {
			id: 20,
			task: { end: new Date(2024, 3, 6) },
		});
		task = tasks.byId(20);
		expect(task.segments.length).toBe(2);
		expect(task.duration).toBe(3);
		expect(task.segments[1].end.valueOf()).toBe(task.end.valueOf());
		store.in.exec("update-task", {
			id: 20,
			task: { start: new Date(2024, 3, 3) },
		});
		task = tasks.byId(20);
		expect(task.segments.length).toBe(2);
		expect(task.duration).toBe(3);
		expect(task.segments[0].start.valueOf()).toBe(task.start.valueOf());
	});
	test("delete segments via update-task action", () => {
		const store = getDataStore(getData("pretty"));
		const { tasks } = store.getState();
		store.in.exec("split-task", { id: 20 });
		store.in.exec("split-task", { id: 20, segmentIndex: 0 });
		let task = tasks.byId(20);
		let { segments } = task;
		segments = segments.filter((s, i) => !!i);
		store.in.exec("update-task", {
			id: 20,
			task: { segments },
		});
		task = tasks.byId(20);
		expect(task.segments.length).toBe(2);
		expect(task.start.valueOf()).toBe(segments[0].start.valueOf());
		segments = segments.filter((s, i) => !i);
		store.in.exec("update-task", {
			id: 20,
			task: { segments },
		});
		task = tasks.byId(20);
		expect(task.segments).toBe(null);
	});

	test("merge across weekend keeps sum of working durations", () => {
		const tasks = [
			{
				id: 1,
				text: "Split",
				type: "task",
				parent: 0,
				start: new Date(2026, 3, 2),
				end: new Date(2026, 3, 9),
				duration: 3,
				segments: [
					{
						start: new Date(2026, 3, 2),
						end: new Date(2026, 3, 4),
						duration: 2,
					},
					{
						start: new Date(2026, 3, 7),
						end: new Date(2026, 3, 8),
						duration: 1,
					},
				],
			},
		];
		const store = getDataStore(
			{ ...getData(), tasks, links: [] },
			{ calendar: "default" }
		);

		store.in.exec("update-task", {
			id: 1,
			segmentIndex: 1,
			diff: -2,
			task: {
				start: new Date(2026, 3, 7),
				end: new Date(2026, 3, 8),
			},
		});
		const task = store.getState().tasks.byId(1);
		expect(task.segments).toBe(null);
		expect(task.duration).toBe(3);
		expect(task.start).to.deep.eq(new Date(2026, 3, 2));
		expect(task.end).to.deep.eq(new Date(2026, 3, 7));
	});

	test("split of a Friday segment skips the weekend with a working-day gap", () => {
		const tasks = [
			{
				id: 1,
				text: "Split",
				type: "task",
				parent: 0,
				start: new Date(2026, 3, 8),
				segments: [
					{ start: new Date(2026, 3, 8), duration: 1 }, // Wednesday
					{ start: new Date(2026, 3, 10), duration: 2 }, // Friday
				],
			},
		];
		const store = getDataStore(
			{ ...getData(), tasks, links: [] },
			{ calendar: "default" }
		);
		store.in.exec("split-task", { id: 1, segmentIndex: 1 });
		const task = store.getState().tasks.byId(1);
		expect(task.segments.length).toBe(3);
		expect(task.segments[0].start).to.deep.eq(new Date(2026, 3, 8));
		expect(task.segments[1].start).to.deep.eq(new Date(2026, 3, 10));
		expect(task.segments[2].start).to.deep.eq(new Date(2026, 3, 14));
	});

	test("split of a middle segment pushes the next one across the weekend", () => {
		const tasks = [
			{
				id: 1,
				text: "Split",
				type: "task",
				parent: 0,
				start: new Date(2026, 3, 8),
				duration: 4,
				segments: [
					{ start: new Date(2026, 3, 8), duration: 1 },
					{ start: new Date(2026, 3, 10), duration: 2 },
					{ start: new Date(2026, 3, 15), duration: 1 },
				],
			},
		];
		const store = getDataStore(
			{ ...getData(), tasks, links: [] },
			{ calendar: "default" }
		);
		store.in.exec("split-task", { id: 1, segmentIndex: 1 });
		const task = store.getState().tasks.byId(1);
		expect(task.segments.length).toBe(4);
		expect(task.segments[2].start).to.deep.eq(new Date(2026, 3, 14));
		expect(task.segments[3].start).to.deep.eq(new Date(2026, 3, 16));
	});

	test("split does not start the next segment on a weekend", () => {
		const tasks = [
			{
				id: 1,
				text: "Split",
				type: "task",
				parent: 0,
				start: new Date(2026, 3, 8),
				duration: 3,
			},
		];
		const store = getDataStore(
			{ ...getData(), tasks, links: [] },
			{ calendar: "default" }
		);
		store.in.exec("split-task", { id: 1 });
		const task = store.getState().tasks.byId(1);
		expect(task.segments.length).toBe(2);
		expect(task.segments[0].end).to.deep.eq(new Date(2026, 3, 10));
		expect(task.segments[1].start).to.deep.eq(new Date(2026, 3, 13));
	});

	test("moving a segment start off a weekend shifts to a working day", () => {
		const store = getDataStore(
			{ ...getData(), tasks: splitCalendarTasks(), links: [] },
			{ calendar: "default" }
		);

		store.in.exec("update-task", {
			id: 1,
			segmentIndex: 1,
			task: { start: new Date(2026, 3, 11) },
		});
		const task = store.getState().tasks.byId(1);
		expect(task.segments[1].start).to.deep.eq(new Date(2026, 3, 13));
	});

	test("task end on a weekend snaps back to the last working day", () => {
		const store = getDataStore(
			{ ...getData(), tasks: splitCalendarTasks(), links: [] },
			{ calendar: "default" }
		);

		store.in.exec("update-task", {
			id: 1,
			task: { start: new Date(2026, 3, 9), end: new Date(2026, 3, 19) },
		});

		const task = store.getState().tasks.byId(1);
		expect(task.end).to.deep.eq(new Date(2026, 3, 18));
		expect(task.duration).to.eq(5);
		expect(task.segments[1].end).to.deep.eq(new Date(2026, 3, 18));
		expect(task.segments[1].duration).to.eq(4);
	});

	test.each([
		["a weekend", new Date(2026, 3, 5)],
		["the last segment start", new Date(2026, 3, 6)],
	])(
		"task end moved back to %s drops the last segment without covering the weekend",
		(_, end) => {
			const tasks = [
				{
					id: 1,
					text: "Split",
					type: "task",
					parent: 0,
					start: new Date(2026, 3, 2),
					duration: 3,
					segments: [
						{ start: new Date(2026, 3, 2), duration: 1 }, // Thursday
						{ start: new Date(2026, 3, 6), duration: 2 }, // Monday
					],
				},
			];
			const store = getDataStore(
				{ ...getData(), tasks, links: [] },
				{ calendar: "default" }
			);
			const { start, segments } = store.getState().tasks.byId(1);

			store.in.exec("update-task", {
				id: 1,
				task: { start, end, segments },
			});

			const task = store.getState().tasks.byId(1);
			expect(task.end).to.deep.eq(new Date(2026, 3, 4));
			expect(task.duration).to.eq(2);
			expect(task.segments).toBe(null);
		}
	);

	test("split uses durationUnit, not the scale unit", () => {
		const tasks = [
			{
				id: 1,
				text: "Split",
				type: "task",
				parent: 0,
				start: new Date(2026, 3, 6),
				duration: 4,
			},
		];
		const store = getDataStore(
			{ ...getData(), tasks, links: [] },
			{
				calendar: "default",
				scales: [
					{ unit: "day", step: 1, format: "d" },
					{ unit: "hour", step: 1, format: "H" },
				],
			}
		);
		store.in.exec("split-task", { id: 1 });
		const task = store.getState().tasks.byId(1);
		expect(task.segments.length).toBe(2);
		expect(task.segments[0].start).to.deep.eq(new Date(2026, 3, 6));
		expect(task.segments[0].end).to.deep.eq(new Date(2026, 3, 8));
		expect(task.segments[1].start).to.deep.eq(new Date(2026, 3, 9));
		expect(task.segments[1].end).to.deep.eq(new Date(2026, 3, 11));
		expect(task.duration).to.eq(4);
	});

	test("calendar change keeps a working-day gap between segments at hour scale", () => {
		const tasks = [
			{
				id: 1,
				text: "Split",
				type: "task",
				parent: 0,
				start: new Date(2026, 3, 6),
				duration: 5,
				segments: [
					{ start: new Date(2026, 3, 6), duration: 3 }, // Mon-Wed
					{ start: new Date(2026, 3, 10), duration: 2 }, // Fri-Mon
				],
			},
		];
		const store = getDataStore(
			{ ...getData(), tasks, links: [] },
			{
				calendar: "default",
				scales: [
					{ unit: "day", step: 1, format: "d" },
					{ unit: "hour", step: 1, format: "H" },
				],
			}
		);
		store.in.exec("update-task", {
			id: 1,
			task: { calendar: "wednesday-off" },
		});
		const task = store.getState().tasks.byId(1);
		expect(task.segments[0].end).to.deep.eq(new Date(2026, 3, 10));
		expect(task.segments[1].start).to.deep.eq(new Date(2026, 3, 13));
		expect(task.segments[1].end).to.deep.eq(new Date(2026, 3, 15));
		expect(task.end).to.deep.eq(new Date(2026, 3, 15));
	});
});
