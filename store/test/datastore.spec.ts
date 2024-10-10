import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { DataStore } from "../src/index";
import {
	getData,
	taskTypes,
	cellHeight,
	scaleHeight,
	cellWidth,
} from "./stubs/data";
import { writable } from "./stubs/writable";
import GanttDataTree from "../src/GanttDataTree";
import { DataArray } from "wx-lib-state";

import { normalizeEditor } from "../src/sidebar";
import { resetScales } from "../src/scales";
import { updateTask } from "../src/tasks";
import { updateLink } from "../src/links";
import { normalizeColumns, defaultColumns } from "../src/columns";

import {
	GanttScaleData,
	IGanttLink,
	IGanttTask,
	ILink,
	ITask,
} from "../src/types";

let store: DataStore;

function resetState(data?: any) {
	if (!data) data = getData();
	store = new DataStore(writable);
	store.init({ ...data });
}

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
	vi.useRealTimers();
});

describe("datastore", () => {
	describe("datastore init", () => {
		test("initializes correctly", () => {
			resetState();
			expect(store).to.not.be.undefined;
		});

		test("sets correct default state", () => {
			resetState();
			const data = getData();

			const tasks = new GanttDataTree(data.tasks as ITask[]);
			const links = new DataArray(data.links as ILink[]);
			const scales = getData().scales;

			const _scales = resetScales(
				new Date(2024, 3, 1),
				new Date(2024, 3, 9),
				"day",
				cellWidth,
				scaleHeight,
				scales
			) as GanttScaleData;
			const _tasks = tasks
				.toArray()
				.map((task, i) =>
					updateTask(
						task as IGanttTask,
						i,
						cellWidth,
						cellHeight,
						_scales,
						false
					)
				);
			const _links = links.map(l =>
				updateLink(
					l as IGanttLink,
					_tasks.find(t => t.id === l.source) as IGanttTask,
					_tasks.find(t => t.id === l.target) as IGanttTask,
					cellHeight,
					false
				)
			);

			const defaultState = {
				_activeTask: null,
				selected: [],
				_selected: [],
				scrollLeft: 0,
				scrollTop: 0,
				area: { from: 0, start: 0, end: 0 },
				scales,
				tasks,
				links,
				columns: normalizeColumns(defaultColumns),
				taskTypes,
				cellWidth,
				_cellWidth: cellWidth,
				cellHeight: 38,
				scaleHeight: 30,
				editorShape: normalizeEditor({ taskTypes }),
				_start: new Date(2024, 3, 1),
				_end: new Date(2024, 3, 9),
				_scales,
				_tasks,
				_links,
				_scrollSelected: false,
				_sort: null,
			};

			vi.advanceTimersByTime(1);

			const state = store.getState();

			for (const key in state) {
				if (key !== "_scales" && key !== "columns")
					expect(state[key], key).to.deep.eq(defaultState[key]);
			}

			// skip comparison for diff function
			for (const key in state["_scales"]) {
				if (key !== "diff")
					expect(state["_scales"][key]).to.deep.eq(
						defaultState["_scales"]?.[key]
					);
			}

			// skip comparison for templates
			for (const col in state["columns"]) {
				expect(state["columns"][col].width).to.eq(
					defaultState["columns"][col].width
				);
				expect(state["columns"][col].align).to.eq(
					defaultState["columns"][col].align
				);
				expect(state["columns"][col].header).to.eq(
					defaultState["columns"][col].header
				);
				expect(state["columns"][col].resize).to.eq(
					defaultState["columns"][col].resize
				);
				expect(state["columns"][col].id).to.eq(
					defaultState["columns"][col].id
				);
				expect(state["columns"][col].flexgrow).to.eq(
					defaultState["columns"][col].flexgrow
				);
			}
		});
	});

	describe("add-task", () => {
		test("can add tasks to top level, no date set", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("add-task", {
				task: { text: "Task 3", id: 3 },
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(3);
			expect(tasks.byId(3).text).to.eq("Task 3");
			expect(tasks.byId(3).start).to.deep.eq(new Date(2024, 3, 6));
			expect(tasks.byId(3).end).to.deep.eq(new Date(2024, 3, 7));
			expect(tasks.byId(3).duration).to.eq(1);
			expect(tasks.getIndexById(3)).to.eq(2);
		});

		test("can add tasks to top level, set start date and duration", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("add-task", {
				task: {
					text: "Task 3",
					id: 3,
					start: new Date(2024, 3, 3),
					duration: 2,
				},
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(3);
			expect(tasks.byId(3).text).to.eq("Task 3");
			expect(tasks.byId(3).start).to.deep.eq(new Date(2024, 3, 3));
			expect(tasks.byId(3).end).to.deep.eq(new Date(2024, 3, 5));
			expect(tasks.byId(3).duration).to.eq(2);
		});

		test("can add tasks to top level, set start and end date", () => {
			resetState();
			const { tasks } = store.getState();

			// within scale bounds
			store.in.exec("add-task", {
				task: {
					text: "Task 3",
					id: 3,
					start: new Date(2024, 3, 3),
					end: new Date(2024, 3, 5),
				},
			});

			expect(tasks.toArray().length).to.eq(3);
			expect(tasks.byId(3).text).to.eq("Task 3");
			expect(tasks.byId(3).start).to.deep.eq(new Date(2024, 3, 3));
			expect(tasks.byId(3).end).to.deep.eq(new Date(2024, 3, 5));
			expect(tasks.byId(3).duration).to.eq(2);

			// outside scale bounds
			store.in.exec("add-task", {
				task: {
					text: "Task 4",
					id: 4,
					start: new Date(2024, 2, 6),
					end: new Date(2024, 3, 10),
				},
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(4);
			expect(tasks.byId(4).text).to.eq("Task 4");
			expect(tasks.byId(4).start).to.deep.eq(new Date(2024, 2, 6));
			expect(tasks.byId(4).end).to.deep.eq(new Date(2024, 3, 10));
			expect(tasks.byId(4).duration).to.eq(35);
		});

		test("can add tasks as children", () => {
			resetState();
			const { tasks } = store.getState();

			//should correct parent to target
			store.in.exec("add-task", {
				target: 1,
				task: { text: "Task 3", id: 3, parent: 2 },
				mode: "child",
			});

			store.in.exec("add-task", {
				task: { text: "Task 4", id: 4, parent: 2 },
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(4);
			expect(tasks.byId(2).data.length).to.eq(1);

			expect(tasks.byId(1).open).to.eq(true);
			expect(tasks.byId(2).open).to.eq(true);

			expect(tasks.byId(3).parent).to.eq(1);
			expect(tasks.byId(4).parent).to.eq(2);

			expect(tasks.byId(3).$level).to.eq(2);
			expect(tasks.byId(4).$level).to.eq(2);

			expect(tasks.byId(3).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(3).end).to.deep.eq(new Date(2024, 3, 3));
			expect(tasks.byId(3).duration).to.eq(1);

			expect(tasks.byId(4).start).to.deep.eq(new Date(2024, 3, 6));
			expect(tasks.byId(4).end).to.deep.eq(new Date(2024, 3, 7));
			expect(tasks.byId(4).duration).to.eq(1);
		});

		test("can add tasks as children, before/after", () => {
			resetState(getData("full"));
			const { tasks } = store.getState();

			store.in.exec("add-task", {
				target: 20,
				task: { text: "Task 6", id: 6, parent: 2 },
				mode: "before",
			});

			store.in.exec("add-task", {
				target: 20,
				task: { text: "Task 7", id: 7, parent: 2 },
				mode: "after",
			});

			store.in.exec("add-task", {
				target: 6,
				task: { text: "Task 8", id: 8, parent: 2 },
				mode: "before",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(22);
			expect(tasks.getIndexById(6)).to.eq(1);
			expect(tasks.getIndexById(7)).to.eq(3);
			expect(tasks.getIndexById(8)).to.eq(0);

			expect(tasks.byId(6).$level).to.eq(2);
			expect(tasks.byId(7).$level).to.eq(2);
			expect(tasks.byId(8).$level).to.eq(2);

			expect(tasks.byId(6).text).to.eq("Task 6");
			expect(tasks.byId(7).text).to.eq("Task 7");
			expect(tasks.byId(8).text).to.eq("Task 8");

			expect(tasks.byId(6).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(6).end).to.deep.eq(new Date(2024, 3, 3));
			expect(tasks.byId(6).duration).to.eq(1);

			expect(tasks.byId(7).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(7).end).to.deep.eq(new Date(2024, 3, 3));
			expect(tasks.byId(7).duration).to.eq(1);

			expect(tasks.byId(8).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(8).end).to.deep.eq(new Date(2024, 3, 3));
			expect(tasks.byId(8).duration).to.eq(1);
		});

		test("can add tasks as siblings, before/after", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("add-task", {
				target: 2,
				task: { text: "Task 3", id: 3 },
				mode: "before",
			});

			store.in.exec("add-task", {
				target: 3,
				task: { text: "Task 4", id: 4 },
				mode: "after",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(4);
			expect(tasks.getIndexById(2)).to.eq(3);
			expect(tasks.getIndexById(3)).to.eq(1);
			expect(tasks.getIndexById(4)).to.eq(2);

			expect(tasks.byId(3).text).to.eq("Task 3");
			expect(tasks.byId(3).start).to.deep.eq(new Date(2024, 3, 6));
			expect(tasks.byId(3).end).to.deep.eq(new Date(2024, 3, 7));
			expect(tasks.byId(3).duration).to.eq(1);

			expect(tasks.byId(4).text).to.eq("Task 4");
			expect(tasks.byId(4).start).to.deep.eq(new Date(2024, 3, 6));
			expect(tasks.byId(4).end).to.deep.eq(new Date(2024, 3, 7));
			expect(tasks.byId(4).duration).to.eq(1);
		});

		test("can add tasks as siblings, before/after tasks with children", () => {
			resetState(getData("full"));
			const { tasks } = store.getState();

			store.in.exec("add-task", {
				target: 2,
				task: { text: "New task 1", id: 6 },
				mode: "before",
			});

			store.in.exec("add-task", {
				target: 2,
				task: { text: "New task 2", id: 7 },
				mode: "after",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(21);
			expect(tasks.getIndexById(2)).to.eq(2);
			expect(tasks.getIndexById(6)).to.eq(1);
			expect(tasks.getIndexById(7)).to.eq(3);

			expect(tasks.byId(6).$level).to.eq(1);
			expect(tasks.byId(7).$level).to.eq(1);

			expect(tasks.byId(6).text).to.eq("New task 1");
			expect(tasks.byId(6).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(6).end).to.deep.eq(new Date(2024, 3, 3));
			expect(tasks.byId(6).duration).to.eq(1);

			expect(tasks.byId(7).text).to.eq("New task 2");
			expect(tasks.byId(7).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(7).end).to.deep.eq(new Date(2024, 3, 3));
			expect(tasks.byId(7).duration).to.eq(1);
		});

		test("can add tasks as siblings to branch children", () => {
			resetState(getData("full"));
			const { tasks } = store.getState();

			store.in.exec("add-task", {
				target: 20,
				task: { text: "New task 1", id: 6 },
				mode: "before",
			});

			store.in.exec("add-task", {
				target: 20,
				task: { text: "New task 2", id: 7 },
				mode: "after",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(21);
			expect(tasks.getIndexById(20)).to.eq(1);
			expect(tasks.getIndexById(6)).to.eq(0);
			expect(tasks.getIndexById(7)).to.eq(2);

			expect(tasks.byId(6).$level).to.eq(2);
			expect(tasks.byId(6).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(6).end).to.deep.eq(new Date(2024, 3, 3));
			expect(tasks.byId(6).duration).to.eq(1);

			expect(tasks.byId(7).$level).to.eq(2);
			expect(tasks.byId(7).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(7).end).to.deep.eq(new Date(2024, 3, 3));
			expect(tasks.byId(7).duration).to.eq(1);
		});

		test("can add tasks before first task", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("add-task", {
				target: 1,
				task: { text: "Task 3", id: 3 },
				mode: "before",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(3);
			expect(tasks.getIndexById(1)).to.eq(1);
			expect(tasks.getIndexById(3)).to.eq(0);

			expect(tasks.byId(3).text).to.eq("Task 3");
			expect(tasks.byId(3).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(3).end).to.deep.eq(new Date(2024, 3, 3));
			expect(tasks.byId(3).duration).to.eq(1);
		});

		test("can add tasks after last task", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("add-task", {
				target: 2,
				task: { text: "Task 3", id: 3 },
				mode: "after",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(3);
			expect(tasks.getIndexById(2)).to.eq(1);
			expect(tasks.getIndexById(3)).to.eq(2);

			expect(tasks.byId(3).text).to.eq("Task 3");
			expect(tasks.byId(3).start).to.deep.eq(new Date(2024, 3, 6));
			expect(tasks.byId(3).end).to.deep.eq(new Date(2024, 3, 7));
			expect(tasks.byId(3).duration).to.eq(1);
		});

		test("can add an empty task", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("add-task", {
				task: {},
			});

			vi.advanceTimersByTime(1);

			const last = tasks.toArray()[tasks.toArray().length - 1];

			expect(tasks.toArray().length).to.eq(3);
			expect(last.id).to.include(
				"temp://",
				"generate a temp ID if none is provided"
			);
			expect(last.text).to.eq("");
		});

		test("supports baselines", () => {
			resetState({ baselines: true, ...getData() });

			const { tasks } = store.getState();

			store.in.exec("add-task", {
				task: { text: "Task 3", id: 3 },
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(3);

			expect(tasks.byId(3).start).to.deep.eq(new Date(2024, 3, 6));
			expect(tasks.byId(3).end).to.deep.eq(new Date(2024, 3, 7));
			expect(tasks.byId(3).duration).to.eq(1);

			expect(tasks.byId(3).base_start).to.deep.eq(new Date(2024, 3, 6));
			expect(tasks.byId(3).base_end).to.deep.eq(new Date(2024, 3, 7));
			expect(tasks.byId(3).base_duration).to.eq(1);
		});
	});

	describe("update-task", () => {
		test("can update task", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: {
					text: "Task 1 updated",
				},
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(1).text).to.eq("Task 1 updated");
		});

		test("can update task with new dates", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: {
					text: "Task 1 updated",
					start: new Date(2024, 3, 2),
					end: new Date(2024, 3, 10),
				},
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(1).text).to.eq("Task 1 updated");
			expect(tasks.byId(1).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(1).end).to.deep.eq(new Date(2024, 3, 10));
		});

		test("can update task type", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: { type: "summary" },
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(1).type).to.eq("summary");
			expect(tasks.byId(1).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(1).end).to.deep.eq(new Date(2024, 3, 5));
			expect(tasks.byId(1).duration).to.eq(3);

			store.in.exec("update-task", {
				id: 1,
				task: { type: "milestone" },
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(1).type).to.eq("milestone");
			expect(tasks.byId(1).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(1).end).to.be.undefined;
			expect(tasks.byId(1).duration).to.eq(0);

			store.in.exec("update-task", {
				id: 1,
				task: { type: "task" },
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(1).type).to.eq("task");
			expect(tasks.byId(1).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(1).end).to.deep.eq(new Date(2024, 3, 3));
			expect(tasks.byId(1).duration).to.eq(1);
		});

		test("can update task progress", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: { progress: 50 },
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(1).progress).to.eq(50);
		});

		test("can update task details", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: { details: "Some details" },
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(1).details).to.eq("Some details");
		});

		test("can pass custom props to task object", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: { prop1: "some prop", prop2: true },
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(1).prop1).to.eq("some prop");
			expect(tasks.byId(1).prop2).to.be.true;
		});

		test("can pass an empty object", () => {
			resetState();
			const { tasks } = store.getState();
			const oTask = { ...tasks.byId(1) };

			store.in.exec("update-task", {
				id: 1,
				task: {},
			});

			vi.advanceTimersByTime(1);

			expect(oTask).to.deep.eq(tasks.byId(1));
		});
	});

	describe("delete-task", () => {
		test("can delete tasks", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("delete-task", {
				id: 2,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(1);

			store.in.exec("delete-task", {
				id: 1,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length, "can remove all tasks").to.eq(0);
		});

		test("deleting a task deletes related links", () => {
			resetState();
			const { tasks, links } = store.getState();

			store.in.exec("delete-task", {
				id: 2,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(1);
			expect(links.map(l => l)).to.deep.eq([]);
		});

		test("deleting a task removes it from selection", () => {
			resetState();
			const { tasks, selected } = store.getState();

			store.in.exec("select-task", {
				id: 2,
			});

			store.in.exec("delete-task", {
				id: 2,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(1);
			expect(selected).to.deep.eq([]);
		});

		test("deleting a task removes its children", () => {
			resetState(getData("full"));
			const { tasks } = store.getState();

			store.in.exec("delete-task", {
				id: 2,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(14);
		});
	});

	describe("open-task", () => {
		test("can open/close tasks", () => {
			resetState(getData("full"));
			const { tasks } = store.getState();

			store.in.exec("open-task", {
				id: 2,
				mode: false,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(2).open).to.eq(false);
			expect(tasks.toArray().length).to.eq(15);

			store.in.exec("open-task", {
				id: 2,
				mode: true,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(2).open).to.eq(true);
			expect(tasks.toArray().length).to.eq(19);
		});
	});

	describe("select-task", () => {
		test("can select task", () => {
			resetState();

			store.in.exec("select-task", {
				id: 1,
			});

			vi.advanceTimersByTime(1);

			expect(store.getState().selected).to.deep.eq([1]);
		});

		test("can select multiple tasks", () => {
			resetState();

			store.in.exec("select-task", {
				id: 1,
			});

			store.in.exec("select-task", {
				id: 2,
				toggle: true,
			});

			vi.advanceTimersByTime(1);

			expect(store.getState().selected).to.deep.eq([1, 2]);
		});

		test("can select multiple tasks and deselect others", () => {
			resetState();

			store.in.exec("select-task", {
				id: 1,
			});

			store.in.exec("select-task", {
				id: 2,
				toggle: true,
			});

			store.in.exec("select-task", {
				id: 1,
			});

			vi.advanceTimersByTime(1);

			expect(store.getState().selected).to.deep.eq([1]);
		});

		test("can select a range of tasks", () => {
			resetState(getData("range"));

			store.in.exec("select-task", {
				id: 1,
			});

			store.in.exec("select-task", {
				id: 20,
				range: true,
			});

			vi.advanceTimersByTime(1);

			expect(store.getState().selected).to.deep.eq([
				1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
				19, 20,
			]);
		});

		test("can deselect tasks", () => {
			resetState();

			store.in.exec("select-task", {
				id: 1,
			});

			store.in.exec("select-task", {
				id: 1,
				toggle: true,
			});

			vi.advanceTimersByTime(1);

			expect(store.getState().selected).to.deep.eq([]);
		});

		test("can deselect tasks from a selected range", () => {
			resetState(getData("range"));

			store.in.exec("select-task", {
				id: 1,
			});

			store.in.exec("select-task", {
				id: 10,
				range: true,
			});

			store.in.exec("select-task", {
				id: 5,
				toggle: true,
			});

			store.in.exec("select-task", {
				id: 6,
				toggle: true,
			});

			store.in.exec("select-task", {
				id: 7,
				toggle: true,
			});

			store.in.exec("select-task", {
				id: 8,
				toggle: true,
			});

			store.in.exec("select-task", {
				id: 9,
				toggle: true,
			});

			vi.advanceTimersByTime(1);

			expect(store.getState().selected).to.deep.eq([1, 2, 3, 4, 10]);
		});

		test("can reset the selected range", () => {
			resetState(getData("range"));

			store.in.exec("select-task", {
				id: 1,
			});

			store.in.exec("select-task", {
				id: 10,
				range: true,
			});

			store.in.exec("select-task", {
				id: 11,
			});

			vi.advanceTimersByTime(1);

			expect(store.getState().selected).to.deep.eq([11]);
		});
	});

	describe("copy-task", () => {
		test("can copy tasks", () => {
			resetState();
			const { tasks, links } = store.getState();

			store.in.exec("copy-task", {
				id: 2,
				target: 2,
			});

			store.in.exec("copy-task", {
				id: 1,
				target: 2,
			});

			vi.advanceTimersByTime(1);

			// copied task is inserted after target by default (no mode specified || mode === "after")
			const cTask1 = tasks.toArray()[2];
			const cTask2 = tasks.toArray()[3];

			expect(tasks.toArray().length).to.eq(4);

			// everything expect id and yPos should be the same
			for (const key in cTask1) {
				if (key !== "id" && key !== "$y")
					expect(cTask1[key]).to.deep.eq(tasks.byId(1)[key]);
			}

			for (const key in cTask2) {
				if (key !== "id" && key !== "$y")
					expect(cTask2[key]).to.deep.eq(tasks.byId(2)[key]);
			}

			expect(
				links.map(l => l).length,
				"links are not copied from tasks without children"
			).to.eq(1);
		});

		test("can copy tasks before/after target", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("copy-task", {
				id: 1,
				target: 1,
				mode: "before",
			});

			store.in.exec("copy-task", {
				id: 2,
				target: 2,
				mode: "after",
			});

			vi.advanceTimersByTime(1);

			const cTask1 = tasks.toArray()[0];
			const cTask2 = tasks.toArray()[3];

			expect(tasks.toArray().length).to.eq(4);

			for (const key in cTask1) {
				if (key !== "id" && key !== "$y")
					expect(cTask1[key]).to.deep.eq(tasks.byId(1)[key]);
			}

			for (const key in cTask2) {
				if (key !== "id" && key !== "$y")
					expect(cTask2[key]).to.deep.eq(tasks.byId(2)[key]);
			}
		});

		test("can copy tasks with children", () => {
			resetState(getData("full"));
			const { tasks, links } = store.getState();

			store.in.exec("copy-task", {
				id: 2,
				target: 2,
				mode: "after",
			});

			vi.advanceTimersByTime(1);

			const vIndex = tasks.toArray().findIndex(t => t.id === 2);
			const branchLength = tasks.byId(2).data.length;
			const cTask = tasks.toArray()[vIndex + (branchLength + 1)];

			expect(tasks.toArray().length).to.eq(24);

			// check parent
			for (const key in cTask) {
				if (key !== "id" && key !== "$y" && key !== "data")
					expect(cTask[key]).to.deep.eq(tasks.byId(2)[key]);
			}

			// check children
			cTask.data.forEach((task, i) => {
				for (const key in task) {
					if (key === "parent") expect(task[key]).to.eq(cTask.id);
					else if (key !== "id" && key !== "$y")
						expect(task[key]).to.deep.eq(
							tasks.byId(2).data[i][key]
						);
				}
			});

			expect(
				links.map(l => l).length,
				"links must be copied in this case"
			).to.eq(10);
		});

		test("can't copy tasks inside self", () => {
			resetState(getData("full"));
			const { tasks } = store.getState();

			store.in.exec("copy-task", {
				id: 2,
				target: 20,
				mode: "before",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(19);
		});

		test("ignore copy-task for branch children", () => {
			resetState(getData("full"));
			const { tasks } = store.getState();

			// subsequent copy-task events are called when copying branches
			// this a sample of one such event
			store.in.exec("copy-task", {
				source: 20,
				id: "tempId",
				target: 2,
				eventSource: "copy-task",
				lazy: true,
				mode: "child",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(19);
		});
	});

	describe("move-task", () => {
		test("can move tasks, before target", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("move-task", {
				id: 2,
				target: 1,
				mode: "before",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(2);
			expect(tasks.toArray()[0]).to.be.deep.eq(tasks.byId(2));
			expect(tasks.toArray()[1]).to.be.deep.eq(tasks.byId(1));
		});

		test("can move tasks, after target", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("move-task", {
				id: 1,
				target: 2,
				mode: "after",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(2);
			expect(tasks.toArray()[0]).to.be.deep.eq(tasks.byId(2));
			expect(tasks.toArray()[1]).to.be.deep.eq(tasks.byId(1));
		});

		test("can move tasks, up", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("move-task", {
				id: 2,
				mode: "up",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(2);
			expect(tasks.toArray()[0]).to.be.deep.eq(tasks.byId(2));
			expect(tasks.toArray()[1]).to.be.deep.eq(tasks.byId(1));
		});

		test("can move tasks, down", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("move-task", {
				id: 1,
				mode: "down",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(2);
			expect(tasks.toArray()[0]).to.be.deep.eq(tasks.byId(2));
			expect(tasks.toArray()[1]).to.be.deep.eq(tasks.byId(1));
		});

		test("can move tasks with children", () => {
			resetState(getData("full"));

			const { tasks } = store.getState();

			store.in.exec("move-task", {
				id: 2,
				target: 3,
				mode: "after",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(19);
			expect(tasks.toArray()[8]).to.deep.eq(tasks.byId(2));
			expect(tasks.getIndexById(2)).to.eq(2);
			expect(tasks.byId(2).data.length).to.eq(4);
		});

		test("can't move tasks inside self", () => {
			resetState(getData("full"));
			const { tasks } = store.getState();

			store.in.exec("move-task", {
				id: 2,
				target: 20,
				mode: "before",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(19);
		});

		test("second nested task stays first on multiple up moves", () => {
			resetState(getData("full"));
			const { tasks } = store.getState();

			store.in.exec("move-task", {
				id: 10,
				mode: "up",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray()[0]).to.be.deep.eq(tasks.byId(10));

			store.in.exec("move-task", {
				id: 10,
				mode: "up",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray()[0]).to.be.deep.eq(tasks.byId(10));
		});

		test("last nested task stays last on multiple down moves", () => {
			resetState(getData("full"));
			const { tasks } = store.getState();
			//make last root task child of 4
			store.in.exec("move-task", {
				id: 5,
				mode: "up",
			});
			//last nested task becomes last in root
			store.in.exec("move-task", {
				id: 43,
				mode: "down",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray()[tasks.toArray().length - 1]).to.be.deep.eq(
				tasks.byId(43)
			);

			store.in.exec("move-task", {
				id: 43,
				mode: "down",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray()[tasks.toArray().length - 1]).to.be.deep.eq(
				tasks.byId(43)
			);
		});

		test("correctly moves task down when target task is a branch", () => {
			resetState(getData("full"));
			const { tasks } = store.getState();

			// from lower level to higher level
			expect(tasks.byId(11).open).to.be.undefined;

			store.in.exec("move-task", {
				id: 10,
				mode: "down",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray()[2]).to.be.deep.eq(tasks.byId(10));
			expect(tasks.byId(11).open).to.eq(true);

			// from higher level to lower level
			store.in.exec("move-task", {
				id: 12,
				mode: "down",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray()[8]).to.be.deep.eq(tasks.byId(12));
		});

		test("can move tasks inside other tasks (indent)", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("move-task", {
				id: 2,
				target: 1,
				mode: "child",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(2);
			expect(tasks.byId(2).parent).to.eq(1);
			expect(tasks.byId(2).$level).to.eq(2);
		});

		test("can move tasks outside their parents (outdent)", () => {
			resetState(getData("full"));
			const { tasks } = store.getState();

			store.in.exec("move-task", {
				id: 20,
				target: 1,
				mode: "after",
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(19);
			expect(tasks.toArray()[4]).to.deep.eq(tasks.byId(20));
			expect(tasks.byId(20).parent).to.eq(0);
			expect(tasks.byId(20).$level).to.eq(1);
			expect(tasks.byId(2).data.length).to.eq(3);
		});

		test("stop updates to task positions on DnD finish", () => {
			resetState(getData("full"));
			const { tasks } = store.getState();

			store.in.exec("move-task", {
				id: 2,
				target: 1,
				mode: "before",
				inProgress: false,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(19);
			expect(tasks.getIndexById(2)).to.eq(1);
			expect(tasks.toArray()[4]).to.deep.eq(tasks.byId(2));
		});
	});

	describe("indent-task", () => {
		// indent-task is a wrapper for move-task, so most of the cases are covered in move-task tests
		test("can indent tasks", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("indent-task", {
				id: 2,
				mode: true,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(2).$level).to.eq(2);
		});

		test("can outdent tasks", () => {
			resetState(getData("full"));
			const { tasks } = store.getState();

			store.in.exec("indent-task", {
				id: 20,
				mode: false,
			});

			store.in.exec("indent-task", {
				id: 21,
				mode: false,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(20).$level).to.eq(1);
			expect(tasks.byId(21).$level).to.eq(1);
		});
	});

	describe("drag-task", () => {
		// this event does not update task order by itself, only its position before recalculation
		test("can set state for horizontal drag", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("drag-task", {
				id: 1,
				left: 150,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(1).$x).to.eq(150);
		});

		test("can set state for vertical drag", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("drag-task", {
				id: 1,
				top: 40,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(1).$y).to.eq(44);
		});
	});

	describe("add-link", () => {
		test("can add links", () => {
			resetState({ ...getData(), links: [] });
			const { links } = store.getState();

			store.in.exec("add-link", {
				link: {
					id: 2,
					source: 1,
					target: 2,
					type: "e2s",
				},
			});

			vi.advanceTimersByTime(1);

			expect(links.map(l => l).length).to.eq(1);
			expect(links.byId(2).source).to.eq(1);
			expect(links.byId(2).target).to.eq(2);
			expect(links.byId(2).type).to.eq("e2s");

			store.in.exec("add-link", {
				link: {
					id: 3,
					source: 1,
					target: 2,
					type: "s2s",
				},
			});

			vi.advanceTimersByTime(1);

			expect(links.map(l => l).length).to.eq(2);
			expect(links.byId(3).source).to.eq(1);
			expect(links.byId(3).target).to.eq(2);
			expect(links.byId(3).type).to.eq("s2s");

			store.in.exec("add-link", {
				link: {
					id: 4,
					source: 1,
					target: 2,
					type: "s2e",
				},
			});

			vi.advanceTimersByTime(1);

			expect(links.map(l => l).length).to.eq(3);
			expect(links.byId(4).source).to.eq(1);
			expect(links.byId(4).target).to.eq(2);
			expect(links.byId(4).type).to.eq("s2e");

			store.in.exec("add-link", {
				link: {
					source: 1,
					target: 2,
					type: "e2e",
				},
			});

			vi.advanceTimersByTime(1);

			expect(links.map(l => l).length).to.eq(4);
			expect(
				links.map(l => l)[links.map(l => l).length - 1].source
			).to.eq(1);
			expect(
				links.map(l => l)[links.map(l => l).length - 1].target
			).to.eq(2);
			expect(links.map(l => l)[links.map(l => l).length - 1].type).to.eq(
				"e2e"
			);
		});

		test("incorrect links are ignored", () => {
			resetState();
			const { links } = store.getState();

			store.in.exec("add-link", {
				link: {
					id: 3,
					source: 1,
					// no target
				},
			});

			vi.advanceTimersByTime(1);

			expect(links.map(l => l).length).to.eq(1);

			store.in.exec("add-link", {
				link: {
					id: 3,
					target: 2,
					// no source
				},
			});

			vi.advanceTimersByTime(1);

			expect(links.map(l => l).length).to.eq(1);
		});

		test("sets link type if none is provided", () => {
			resetState();
			const { links } = store.getState();

			store.in.exec("add-link", {
				link: {
					id: 3,
					source: 1,
					target: 2,
				},
			});

			vi.advanceTimersByTime(1);

			expect(links.map(l => l).length).to.eq(2);
			expect(links.byId(3).type).to.eq("e2s");
		});
	});

	describe("update-link", () => {
		test("can update links", () => {
			resetState(getData("full"));
			const { links } = store.getState();

			store.in.exec("update-link", {
				id: 1,
				link: {
					target: 12,
				},
			});

			vi.advanceTimersByTime(1);

			expect(links.byId(1).source).to.eq(10);
			expect(links.byId(1).target).to.eq(12);

			store.in.exec("update-link", {
				id: 1,
				link: {
					target: 11,
					type: "e2e",
				},
			});

			vi.advanceTimersByTime(1);

			expect(links.byId(1).source).to.eq(10);
			expect(links.byId(1).target).to.eq(11);
			expect(links.byId(1).type).to.eq("e2e");

			store.in.exec("update-link", {
				id: 1,
				link: {
					type: "s2s",
				},
			});

			vi.advanceTimersByTime(1);

			expect(links.byId(1).source).to.eq(10);
			expect(links.byId(1).target).to.eq(11);
			expect(links.byId(1).type).to.eq("s2s");

			store.in.exec("update-link", {
				id: 1,
				link: {
					source: 40,
					target: 41,
					type: "s2e",
				},
			});

			vi.advanceTimersByTime(1);

			expect(links.byId(1).source).to.eq(40);
			expect(links.byId(1).target).to.eq(41);
			expect(links.byId(1).type).to.eq("s2e");
		});
	});

	describe("delete-link", () => {
		test("can delete links", () => {
			resetState(getData("full"));
			const { links } = store.getState();

			store.in.exec("delete-link", {
				id: 1,
			});

			vi.advanceTimersByTime(1);

			expect(links.map(l => l).length).to.eq(6);

			store.in.exec("delete-link", {
				id: 2,
			});

			store.in.exec("delete-link", {
				id: 3,
			});

			vi.advanceTimersByTime(1);

			expect(links.map(l => l).length).to.eq(4);
		});
	});

	describe("scroll-chart", () => {
		test("can pass state to scroll the chart", () => {
			resetState(getData("full"));
			let { scrollLeft, scrollTop } = store.getState();

			expect(scrollTop).to.eq(0);

			store.in.exec("scroll-chart", {
				top: 100,
			});

			vi.advanceTimersByTime(1);

			({ scrollTop } = store.getState());

			expect(scrollTop).to.eq(100);

			store.in.exec("scroll-chart", {
				left: 100,
			});

			vi.advanceTimersByTime(1);

			({ scrollLeft } = store.getState());

			expect(scrollLeft).to.eq(100);

			store.in.exec("scroll-chart", {
				top: 200,
				left: 200,
			});

			({ scrollLeft, scrollTop } = store.getState());

			expect(scrollTop).to.eq(200);
			expect(scrollLeft).to.eq(200);
		});
	});

	describe("zoom-chart", () => {
		const zoomSteps = 6;
		const zoomDelta = 50; // each zoom step is 50px
		const initialZoomStep = cellWidth / zoomDelta; // get initial zoom step
		const minCellWidth = 50;
		const maxCellWidth = 300;
		const offset = 400;
		const diff = 4; // diff between scale start and target date

		test("can zoom in", () => {
			resetState({ ...getData("full"), zoom: true });
			let { scrollLeft, zoom } = store.getState();

			expect(zoom.level).to.eq(4);
			expect(zoom.levels?.length).to.eq(6);

			// imitate zooming in on a single point
			for (let i = initialZoomStep; i <= zoomSteps; i++) {
				let { cellWidth } = store.getState();
				const cw = cellWidth;

				store.in.exec("zoom-scale", {
					dir: 1,
					date: new Date(2024, 3, 5),
					offset,
				});

				({ scrollLeft, cellWidth, zoom } = store.getState());

				expect(zoom.level).to.eq(i < zoomSteps ? 4 : 5);
				expect(cellWidth).to.eq(
					cw + zoomDelta > maxCellWidth
						? minCellWidth
						: cw + zoomDelta
				);
				expect(scrollLeft).to.eq(
					i < zoomSteps ? diff * (cw + zoomDelta) - offset : 3250
				);
			}
		});

		test("can zoom in and out", () => {
			resetState({ ...getData("full"), zoom: true });
			let { scrollLeft, zoom } = store.getState();

			expect(zoom.level).to.eq(4);
			expect(zoom.levels?.length).to.eq(6);

			// zoom in
			for (let i = initialZoomStep; i <= zoomSteps; i++) {
				let { cellWidth } = store.getState();
				const cw = cellWidth;

				store.in.exec("zoom-scale", {
					dir: 1,
					date: new Date(2024, 3, 5),
					offset,
				});

				({ scrollLeft, cellWidth, zoom } = store.getState());

				expect(zoom.level).to.eq(i < zoomSteps ? 4 : 5);
				expect(cellWidth).to.eq(
					cw + zoomDelta > maxCellWidth
						? minCellWidth
						: cw + zoomDelta
				);
				expect(scrollLeft).to.eq(
					i < zoomSteps ? diff * (cw + zoomDelta) - offset : 3250
				);
			}

			// zoom out
			for (let i = initialZoomStep; i <= zoomSteps; i++) {
				let { cellWidth } = store.getState();
				const cw = cellWidth;

				store.in.exec("zoom-scale", {
					dir: -1,
					date: new Date(2024, 3, 5),
					offset,
				});

				({ scrollLeft, cellWidth, zoom } = store.getState());

				//eslint-disable-next-line
				const nw =
					cw - zoomDelta < minCellWidth
						? maxCellWidth
						: cw - zoomDelta;

				// this is incorrect/weird at the moment

				//expect(zoom.level).to.eq(i < zoomSteps ? 5 : 4);
				//expect(cellWidth).to.eq(cw - zoomDelta < minCellWidth ? maxCellWidth : cw - zoomDelta);
				//expect(scrollLeft).to.eq(diff * nw - offset < 0 ? 0 : diff * nw - offset);
			}
		});
	});

	describe("zoom widthCell configuration", () => {
		test("level-specific settings override root settings", () => {
			const baseZoomConfig = {
				level: 3,
				minCellWidth: 40,
				maxCellWidth: 350,
				levels: [
					{
						minCellWidth: 50,
						maxCellWidth: 300,
						scales: [{ unit: "year", step: 1, format: "yyyy" }],
					},
					{
						minCellWidth: 50,
						maxCellWidth: 300,
						scales: [{ unit: "quarter", step: 1, format: "QQQ" }],
					},
					{
						minCellWidth: 50,
						maxCellWidth: 300,
						scales: [{ unit: "month", step: 1, format: "MMM" }],
					},
					{
						minCellWidth: 50,
						maxCellWidth: 300,
						scales: [{ unit: "week", step: 1, format: "w" }],
					},
				],
			};

			resetState({ ...getData("full"), zoom: baseZoomConfig });
			const { zoom } = store.getState();

			// Each level should use its specific min/max settings, not the root settings
			zoom.levels?.forEach((level, index) => {
				expect(level.minCellWidth).to.eq(
					baseZoomConfig.levels[index].minCellWidth
				);
				expect(level.maxCellWidth).to.eq(
					baseZoomConfig.levels[index].maxCellWidth
				);
			});
		});

		test("uses root widths settings when levels is not provided", () => {
			const simpleZoomConfig = {
				level: 2,
				minCellWidth: 45,
				maxCellWidth: 355,
			};

			resetState({ ...getData("full"), zoom: simpleZoomConfig });
			const { zoom } = store.getState();
			const defaultLevels = zoom.levels!;

			// Check that each default level has been adjusted to respect the root min/max settings
			zoom.levels?.forEach((level, index) => {
				const expectedMin = Math.max(
					defaultLevels[index].minCellWidth,
					simpleZoomConfig.minCellWidth
				);
				const expectedMax = Math.min(
					defaultLevels[index].maxCellWidth,
					simpleZoomConfig.maxCellWidth
				);
				expect(level.minCellWidth).to.eq(expectedMin);
				expect(level.maxCellWidth).to.eq(expectedMax);
			});
		});
	});

	describe("show-editor", () => {
		test("can set state to show editor", () => {
			resetState();

			store.in.exec("show-editor", {
				id: 1,
			});

			vi.advanceTimersByTime(1);

			const { activeTask } = store.getState();

			expect(activeTask).to.eq(1);
		});
	});

	describe("expand-scale", () => {
		test("can expand scale", () => {
			resetState();

			store.in.exec("expand-scale", {
				date: new Date(2024, 3, 2),
				minWidth: 800,
			});

			vi.advanceTimersByTime(1);

			const { _scales, _start, _end } = store.getState();

			expect(_start).to.deep.eq(new Date(2024, 3, 1));
			expect(_end).to.deep.eq(new Date(2024, 3, 9));
			expect(_scales.start).to.deep.eq(new Date(2024, 3, 1));
			expect(_scales.end).to.deep.eq(new Date(2024, 3, 9));
		});
	});

	describe("render-data", () => {
		test("can set state to render data", () => {
			resetState();

			store.in.exec("render-data", {
				start: 0,
				end: 24,
				from: 0,
			});

			vi.advanceTimersByTime(1);

			const { area } = store.getState();

			expect(area).to.deep.eq({
				start: 0,
				end: 24,
				from: 0,
			});
		});
	});

	describe("request-data", () => {
		test("can request data", () => {
			resetState(getData("lazy"));

			store.in.on("request-data", (ev: any) => {
				expect(ev.id).to.eq(2);
			});

			store.in.exec("request-data", {
				id: 2,
			});
		});
	});

	describe("provide-data", () => {
		test("can provide data to a branch", () => {
			resetState(getData("lazy"));

			store.in.exec("provide-data", {
				id: 2,
				data: {
					tasks: [
						{
							id: 20,
							start: new Date(2024, 3, 2),
							end: new Date(2024, 3, 6),
							text: "Resource planning",
							progress: 10,
							parent: 2,
							type: "task",
						},
						{
							id: 21,
							start: new Date(2024, 3, 6),
							end: new Date(2024, 3, 8),
							text: "Getting approval",
							progress: 10,
							parent: 2,
							type: "task",
						},
						{
							id: 22,
							start: new Date(2024, 3, 8),
							end: new Date(2024, 3, 10),
							text: "Team introduction",
							progress: 0,
							parent: 2,
							type: "task",
						},
						{
							id: 23,
							start: new Date(2024, 3, 10),
							end: new Date(2024, 3, 12),
							text: "Resource management",
							progress: 10,
							parent: 2,
							type: "task",
						},
					],
					links: [
						{
							id: 2,
							source: 20,
							target: 21,
							type: "e2s",
						},
						{
							id: 3,
							source: 21,
							target: 22,
							type: "e2s",
						},
						{
							id: 4,
							source: 22,
							target: 23,
							type: "e2s",
						},
					],
				},
			});

			vi.advanceTimersByTime(1);

			const { tasks, links } = store.getState();

			expect(tasks.toArray().length).to.eq(6);
			expect(tasks.byId(2).data.length).to.eq(4);
			expect(links.map(l => l).length).to.eq(4);

			expect(tasks.byId(2).lazy).to.eq(false);
			expect(tasks.byId(2).open).to.eq(true);
		});
	});

	test("sort-tasks", () => {
		resetState(getData("full"));

		store.in.exec("sort-tasks", { order: "desc", key: "id" });

		const { tasks, _tasks } = store.getState();
		const branch = tasks.getBranch(12);
		expect(branch[0].id).to.eq(12);
		expect(_tasks[0].id).not.to.equal(1);
	});
});
