import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
	DataStore,
	normalizeLinks,
	PLACEHOLDER_ROW_ID,
	getPlaceholderTask,
	setTaskResources,
} from "../src/index";
import { handleAction } from "../src/helpers/actionHandlers";
import { prepareEditTask } from "../src/normalizeDates";
import { writable } from "svelte/store";
import { getData, cellHeight } from "./stubs/data";

function getDataStore(data: any) {
	const store = new DataStore(writable);
	if (data.links) data.links = normalizeLinks(data.links);
	store.init({ ...data });
	return store;
}

const tasks = [
	{
		id: 1,
		text: "First",
		type: "task",
		parent: 0,
		start: new Date(2024, 3, 2),
		end: new Date(2024, 3, 5),
		duration: 3,
	},
	{
		id: 2,
		text: "Second",
		type: "task",
		parent: 0,
		start: new Date(2024, 3, 5),
		end: new Date(2024, 3, 8),
		duration: 3,
	},
];

const _ = (v: string) => v;

function delay() {
	vi.advanceTimersByTime(1);
}

describe("placeholderRow", () => {
	let store: DataStore;

	beforeEach(() => {
		vi.useFakeTimers();
		store = getDataStore({
			...getData(),
			placeholderRow: true,
			links: [],
			tasks,
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("is appended after the real tasks", () => {
		const { _tasks } = store.getState();
		expect(_tasks.length).to.eq(3);
		expect(_tasks[2].id).to.eq(PLACEHOLDER_ROW_ID);
		expect(_tasks[2].$placeholder).to.eq(true);
	});

	test("is absent when the config is off", () => {
		const off = getDataStore({ ...getData(), links: [], tasks });
		const { _tasks } = off.getState();
		expect(_tasks.length).to.eq(2);
		expect(_tasks.some(t => t.$placeholder)).to.eq(false);
	});

	// this is what toggling readonly does
	test("appears and disappears when the config is toggled", () => {
		store.init({ ...getData(), links: [], tasks, placeholderRow: false });
		delay();
		expect(store.getState()._tasks.length).to.eq(2);

		store.init({ ...getData(), links: [], tasks, placeholderRow: true });
		delay();
		const { _tasks } = store.getState();
		expect(_tasks.length).to.eq(3);
		expect(_tasks[2].id).to.eq(PLACEHOLDER_ROW_ID);
	});

	test("occupies a normal row but renders no bar", () => {
		const row = store.getState()._tasks[2];
		expect(row.$y).to.eq(cellHeight * 2 + 3);
		expect(row.$h).to.be.greaterThan(0);
		// no bar - $skip hides it; dates are defaults
		expect(row.$skip).to.eq(true);
		expect(row.start).to.not.be.undefined;
		expect(row.end).to.not.be.undefined;
		expect(row.duration).to.eq(1);
		expect(row.text).to.be.undefined;
	});

	test("default dates follow the last root task", () => {
		const last = tasks[tasks.length - 1];
		let row = store.getState()._tasks[2];
		expect(row.start).to.deep.eq(last.start);
		expect(row.duration).to.eq(1);
		expect(row.end).to.deep.eq(new Date(2024, 3, 6));

		const nextStart = new Date(2024, 3, 10);
		store.in.exec("add-task", {
			task: {
				text: "Third",
				type: "task",
				start: nextStart,
				duration: 2,
			},
		});
		delay();

		row = store.getState()._tasks.at(-1);
		expect(row.id).to.eq(PLACEHOLDER_ROW_ID);
		expect(row.start).to.deep.eq(nextStart);
		expect(row.duration).to.eq(1);
		expect(row.end).to.deep.eq(new Date(2024, 3, 11));
	});

	test("is not part of the data tree", () => {
		const { tasks: tree } = store.getState();
		expect(tree.byId(PLACEHOLDER_ROW_ID)).to.be.undefined;
		expect(store.serialize().some(t => t.id === PLACEHOLDER_ROW_ID)).to.eq(
			false
		);
	});

	test("stays last after a task is added", () => {
		store.in.exec("add-task", {
			task: { text: "Third", type: "task" },
		});
		delay();
		const { _tasks } = store.getState();
		expect(_tasks.length).to.eq(4);
		expect(_tasks[2].text).to.eq("Third");
		expect(_tasks[3].id).to.eq(PLACEHOLDER_ROW_ID);
		expect(_tasks[3].$y).to.eq(cellHeight * 3 + 3);
	});

	test("stays last after a task is deleted", () => {
		store.in.exec("delete-task", { id: 2 });
		delay();
		const { _tasks } = store.getState();
		expect(_tasks.length).to.eq(2);
		expect(_tasks[1].id).to.eq(PLACEHOLDER_ROW_ID);
		expect(_tasks[1].$y).to.eq(cellHeight + 3);
	});

	// appended after tree.toArray(), so tree operations cannot reach it
	describe("filtering and sorting", () => {
		test("survives a filter that hides every task", () => {
			store.in.exec("filter-tasks", { filter: () => false });
			delay();

			const { _tasks } = store.getState();
			expect(_tasks.length).to.eq(1);
			expect(_tasks[0].id).to.eq(PLACEHOLDER_ROW_ID);
			expect(_tasks[0].$y).to.eq(3);
		});

		test("comes back last when the filter is cleared", () => {
			store.in.exec("filter-tasks", {
				filter: (t: any) => t.text === "First",
			});
			delay();
			expect(store.getState()._tasks.length).to.eq(2);

			store.in.exec("filter-tasks", {});
			delay();
			const { _tasks } = store.getState();
			expect(_tasks.length).to.eq(3);
			expect(_tasks[2].id).to.eq(PLACEHOLDER_ROW_ID);
		});

		test("stays last when the sort order is reversed", () => {
			store.in.exec("sort-tasks", { key: "text", order: "desc" });
			delay();

			const { _tasks } = store.getState();
			expect(_tasks[0].text).to.eq("Second");
			expect(_tasks[2].id).to.eq(PLACEHOLDER_ROW_ID);
		});
	});

	describe("selection and navigation", () => {
		test("can be selected as a normal row", () => {
			store.in.exec("select-task", { id: PLACEHOLDER_ROW_ID });
			delay();
			const { selected, _selected } = store.getState();
			expect(selected).to.deep.eq([PLACEHOLDER_ROW_ID]);
			// resolved to the row object, so the chart can highlight it
			expect(_selected.length).to.eq(1);
			expect(_selected[0].id).to.eq(PLACEHOLDER_ROW_ID);
			expect(_selected[0].$y).to.eq(cellHeight * 2 + 3);
		});

		test("is reachable with arrow-down from the last task", () => {
			expect(store.getNextRow(2)?.id).to.eq(PLACEHOLDER_ROW_ID);
			expect(store.getPrevRow(PLACEHOLDER_ROW_ID)?.id).to.eq(2);
		});

		test("selecting it does not open the editor", () => {
			store.in.exec("select-task", { id: 1 });
			delay();
			store.in.exec("show-editor", { id: 1 });
			expect(store.getState().activeTask).to.eq(1);

			store.in.exec("select-task", { id: PLACEHOLDER_ROW_ID });
			expect(store.getState().activeTask).to.eq(1);
		});
	});

	describe("editors", () => {
		function getStore() {
			return getDataStore({
				...getData(),
				placeholderRow: true,
				unscheduledTasks: true,
				links: [],
				tasks,
				columns: [
					{ id: "text", header: "Task name", editor: "text" },
					{ id: "start", header: "Start", editor: "datepicker" },
				],
			});
		}

		test("the start editor has no Unschedule button", () => {
			const s = getStore();
			const { columns, _tasks } = s.getState();
			const col = columns.find(c => c.id === "start");
			const placeholder = _tasks[_tasks.length - 1];

			const editor = col.editor(placeholder, col);
			expect(editor.config.buttons).to.deep.eq(["today"]);
		});

		// unlike an unscheduled task - add-task supplies a default start
		test("start, end and duration are all editable", () => {
			const s = getDataStore({
				...getData(),
				placeholderRow: true,
				links: [],
				tasks,
				columns: [
					{ id: "start", header: "Start", editor: "datepicker" },
					{ id: "end", header: "End", editor: "datepicker" },
					{ id: "duration", header: "Duration", editor: "text" },
				],
			});
			const { columns, _tasks } = s.getState();
			const placeholder = _tasks[_tasks.length - 1];
			const byId = (id: string) => columns.find(c => c.id === id);

			expect(byId("start").editor(placeholder, byId("start"))).to.not.be
				.null;
			expect(byId("end").editor(placeholder, byId("end"))).to.not.be.null;
			expect(byId("duration").editor(placeholder, byId("duration"))).to
				.not.be.null;
		});

		test("a real task keeps the Unschedule button", () => {
			const s = getStore();
			const { columns, _tasks } = s.getState();
			const col = columns.find(c => c.id === "start");

			const editor = col.editor(_tasks[0], col);
			expect(editor.config.buttons).to.deep.eq(["Unschedule", "today"]);
		});

		// the editor object is shared between rows, the buttons are
		// rewritten on each call and must not leak across rows
		test("the buttons follow the row the editor is opened for", () => {
			const s = getStore();
			const { columns, _tasks } = s.getState();
			const col = columns.find(c => c.id === "start");
			const placeholder = _tasks[_tasks.length - 1];

			expect(col.editor(_tasks[0], col).config.buttons).to.deep.eq([
				"Unschedule",
				"today",
			]);
			expect(col.editor(placeholder, col).config.buttons).to.deep.eq([
				"today",
			]);
			expect(col.editor(_tasks[0], col).config.buttons).to.deep.eq([
				"Unschedule",
				"today",
			]);
		});
	});

	describe("actions never target it", () => {
		test("delete does nothing when only the placeholder is selected", () => {
			store.in.exec("select-task", { id: PLACEHOLDER_ROW_ID });
			delay();
			handleAction(store, "delete-task", null, _);
			delay();

			const { tasks: tree } = store.getState();
			expect(tree.toArray().length).to.eq(2);
		});

		test("delete skips it inside a multi-row selection", () => {
			store.in.exec("select-task", { id: 2 });
			delay();
			store.in.exec("select-task", {
				id: PLACEHOLDER_ROW_ID,
				toggle: true,
			});
			delay();
			expect(store.getState().selected.length).to.eq(2);

			handleAction(store, "delete-task", null, _);
			delay();

			const ids = store
				.getState()
				.tasks.toArray()
				.map(t => t.id);
			expect(ids).to.deep.eq([1]);
		});

		// add-task would otherwise resolve it to an undefined target and throw
		test("add-task targeting it degrades to a top-level add", async () => {
			await store.in.exec("add-task", {
				target: PLACEHOLDER_ROW_ID,
				task: { text: "Child" },
				mode: "child",
				show: true,
			});
			delay();

			const created = store
				.getState()
				.tasks.toArray()
				.find(t => t.text === "Child");
			expect(created).to.not.be.undefined;
			expect(created.parent).to.eq(0);
		});

		test("add-task falls back to a top-level append", () => {
			store.in.exec("select-task", { id: PLACEHOLDER_ROW_ID });
			delay();
			handleAction(store, "add-task", null, _);
			delay();

			const branch = store.getState().tasks.getBranch(0);
			expect(branch.length).to.eq(3);
		});
	});

	describe("commit", () => {
		test("produces an ordinary top-level task and re-seeds", () => {
			store.in.exec("add-task", {
				task: {
					text: "Drawn",
					type: "task",
					start: new Date(2024, 3, 9),
					duration: 2,
				},
				eventSource: "placeholder",
			});
			delay();

			const { _tasks, tasks: tree } = store.getState();
			const created = tree.toArray().find(t => t.text === "Drawn");
			expect(created.parent).to.eq(0);
			expect(created.$placeholder).to.be.undefined;
			expect(created.unscheduled).to.not.eq(true);

			expect(_tasks[_tasks.length - 1].id).to.eq(PLACEHOLDER_ROW_ID);
			expect(_tasks.filter(t => t.$placeholder).length).to.eq(1);
		});

		test("scrolls to the re-seeded placeholder, not the new task", () => {
			const { cellHeight } = store.getState();
			// a viewport of two rows, so the bottom is off-screen
			const chartHeight = cellHeight * 2;
			const scrollSize = 17;
			store.in.exec("resize-chart", {
				width: 1000,
				height: chartHeight,
				scrollSize,
			});
			delay();

			store.in.exec("add-task", {
				task: { text: "Drawn", type: "task" },
				show: true,
				eventSource: "placeholder",
			});
			delay();

			const { _tasks, scrollTop } = store.getState();
			const placeholderIndex = _tasks.length - 1;
			expect(_tasks[placeholderIndex].id).to.eq(PLACEHOLDER_ROW_ID);

			// the placeholder, not the new task
			const expected =
				placeholderIndex * cellHeight -
				chartHeight +
				cellHeight +
				scrollSize;
			expect(scrollTop).to.eq(expected);
		});

		// what each date field produces when it is the only one edited
		test("a duration-only edit spans that many units", () => {
			const row = store.getState()._tasks[2];
			const update: any = { ...row, duration: 4 };
			prepareEditTask(
				update,
				{ durationUnit: "day" },
				undefined,
				"duration"
			);

			store.in.exec("add-task", {
				task: getPlaceholderTask(update, "New task"),
				show: true,
				eventSource: "placeholder",
			});
			delay();

			const created = store
				.getState()
				.tasks.toArray()
				.find(t => t.text === "New task");
			expect(created.duration).to.eq(4);
			expect(created.start).to.not.be.undefined;
		});

		// the grid reads the new id off the event to attach resources
		test("add-task reports the created id on the event", () => {
			const ev: any = {
				task: { text: "Named", type: "task" },
				show: true,
				eventSource: "placeholder",
			};
			store.in.exec("add-task", ev);

			expect(ev.id).to.not.be.undefined;
			delay();
			expect(store.getState().tasks.byId(ev.id).text).to.eq("Named");
		});

		test("committing resources is a single undo/redo step", () => {
			store = getDataStore({
				...getData(),
				placeholderRow: true,
				undo: true,
				links: [],
				tasks,
				resources: [
					{ id: "r1", name: "Alex" },
					{ id: "r2", name: "Sophie" },
				],
				assignments: [],
			});

			const hm = store.getHistory();
			const placeholder = store.getState()._tasks.at(-1);

			hm.startBatch();
			const ev: any = {
				task: getPlaceholderTask(placeholder, "New task"),
				show: true,
				eventSource: "placeholder",
			};
			store.in.exec("add-task", ev);
			setTaskResources(ev.id, ["r1", "r2"], {
				exec: store.in.exec.bind(store.in),
				getState: store.getState.bind(store),
				getHistory: store.getHistory.bind(store),
			});
			hm.endBatch();
			delay();

			let { tasks: tree, history, _assignments } = store.getState();
			expect(tree.byId(ev.id)).to.not.be.undefined;
			expect(history).to.deep.eq({ undo: 1, redo: 0 });
			expect(
				(_assignments?.byTask[ev.id] || []).map(a => a.resource)
			).to.deep.eq(["r1", "r2"]);

			store.in.exec("undo");
			delay();

			({ tasks: tree, history, _assignments } = store.getState());
			expect(tree.byId(ev.id)).to.be.undefined;
			expect(_assignments?.byTask[ev.id]).to.be.undefined;
			expect(history).to.deep.eq({ undo: 0, redo: 1 });

			store.in.exec("redo");
			delay();

			({ tasks: tree, history, _assignments } = store.getState());
			expect(tree.byId(ev.id).text).to.eq("New task");
			expect(
				(_assignments?.byTask[ev.id] || []).map(a => a.resource)
			).to.deep.eq(["r1", "r2"]);
			expect(history).to.deep.eq({ undo: 1, redo: 0 });
		});

		test("an end-only edit derives duration from the default start", () => {
			const row = store.getState()._tasks[2];
			const update: any = { ...row, end: new Date(2024, 3, 20) };
			prepareEditTask(update, { durationUnit: "day" }, undefined, "end");

			store.in.exec("add-task", {
				task: getPlaceholderTask(update, "New task"),
				show: true,
				eventSource: "placeholder",
			});
			delay();

			const created = store
				.getState()
				.tasks.toArray()
				.find(t => t.text === "New task");

			expect(created.duration).to.be.greaterThan(1);
		});

		test("the text hint becomes the name when another field is edited", () => {
			const row = store.getState()._tasks[2];
			// only a start was picked, the text cell showed just a hint
			const start = new Date(2024, 3, 9);
			const task = getPlaceholderTask({ ...row, start }, "New task");

			expect(task.text).to.eq("New task");
			expect(task.start).to.eq(start);
		});

		test("an edited name wins over the hint", () => {
			const row = store.getState()._tasks[2];
			const task = getPlaceholderTask(
				{ ...row, text: "Typed" },
				"New task"
			);

			expect(task.text).to.eq("Typed");
		});

		test("getPlaceholderTask strips the row internals", () => {
			const row = store.getState()._tasks[2];
			const task = getPlaceholderTask({ ...row, text: "Named" });

			expect(task.id).to.be.undefined;
			expect(task.$placeholder).to.be.undefined;
			expect(task.$level).to.be.undefined;
			expect(task.$y).to.be.undefined;
			expect(task.$skip).to.be.undefined;
			// the real payload survives
			expect(task.text).to.eq("Named");
			expect(task.parent).to.eq(0);
			expect(task.type).to.eq("task");
		});

		// a name-only commit has no dates, so normalizeDates derives
		// unscheduled=true - that flag must not reach add-task
		test("a name-only commit is a normal scheduled task", () => {
			const both = getDataStore({
				...getData(),
				placeholderRow: true,
				unscheduledTasks: true,
				links: [],
				tasks,
			});

			const row = both.getState()._tasks[2];
			const edited = { ...row, text: "Named", unscheduled: true };

			both.in.exec("add-task", {
				task: getPlaceholderTask(edited),
				show: true,
				eventSource: "placeholder",
			});
			delay();

			const created = both
				.getState()
				.tasks.toArray()
				.find(t => t.text === "Named");
			expect(created.unscheduled).to.not.eq(true);
			expect(created.start).to.not.be.undefined;
		});

		test("stays scheduled when unscheduledTasks is on", () => {
			const both = getDataStore({
				...getData(),
				placeholderRow: true,
				unscheduledTasks: true,
				links: [],
				tasks,
			});

			both.in.exec("add-task", {
				task: {
					text: "Drawn",
					type: "task",
					start: new Date(2024, 3, 9),
					duration: 2,
				},
				eventSource: "placeholder",
			});
			delay();

			const created = both
				.getState()
				.tasks.toArray()
				.find(t => t.text === "Drawn");
			expect(created.unscheduled).to.not.eq(true);
			expect(created.start).to.not.be.undefined;
		});
	});
});
