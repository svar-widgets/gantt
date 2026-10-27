import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { DataStore } from "../src/index";
import {
	getData,
	taskTypes,
	cellHeight,
	scaleHeight,
	cellWidth,
	unitFormats,
} from "./stubs/data";
import { writable } from "./stubs/writable";
import GanttDataTree from "../src/GanttDataTree";
import { DataArray } from "@svar-ui/lib-state";

import { resetScales } from "../src/scales";
import { updateTask } from "../src/tasks";
import { updateLink, normalizeLinks } from "../src/links";
import { getAdder } from "../src/time";
import {
	ADD_TASK_COLUMN_WIDTH,
	normalizeColumns,
	defaultColumns,
} from "../src/columns";
import { parseTreeDates, prepareEditTask } from "../src/normalizeDates";

import type {
	GanttScaleData,
	IGanttLink,
	IGanttTask,
	ILink,
	ITask,
	IData,
} from "../src/types";
import { Calendar } from "../src/schedule-types";
import ResourceDataTree from "../src/pro/ResourceDataTree";

let store: DataStore;

function resetState(data?: any) {
	if (!data) data = getData();
	if (data.links) data.links = normalizeLinks(data.links);
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
			parseTreeDates(
				tasks,
				{ durationUnit: "day", splitTasks: false },
				store.getTaskCalendar.bind(store)
			);
			const links = new DataArray(normalizeLinks(data.links as ILink[]));
			const scales = getData().scales;
			const calendars = getData().calendars;
			const resources = new ResourceDataTree([]);
			const assignments = new DataArray([]);

			const _scales = resetScales(
				new Date(2024, 3, 1),
				new Date(2024, 3, 9),
				"day",
				cellWidth,
				scaleHeight,
				1,
				scales,
				1
			) as GanttScaleData;
			const _tasks = tasks.toArray().map((task, i) =>
				updateTask(task as IGanttTask, i, {
					cellWidth,
					cellHeight,
					_scales,
					baselines: false,
				})
			);
			const _links = links.map(l =>
				updateLink(
					l as IGanttLink,
					_tasks.find(t => t.id === l.source) as IGanttTask,
					_tasks.find(t => t.id === l.target) as IGanttTask,
					cellHeight
				)
			);

			const _calendars = new Map();
			calendars.forEach(({ id, ...config }) => {
				const instance = new Calendar(config);
				instance.css = config.css;
				_calendars.set(id, instance);
			});

			const defaultState: any = {
				_activeTask: null,
				selected: [],
				_selected: [],
				scrollLeft: 0,
				scrollTop: 0,
				area: { from: 0, start: 0, end: 0 },
				xArea: { from: 0, to: 0, start: 0, end: 0 },
				scales,
				tasks,
				_calendars,
				_rollups: {},
				links,
				columns: normalizeColumns(defaultColumns),
				taskTypes,
				cellWidth,
				_cellWidth: cellWidth,
				cellHeight: 38,
				scaleHeight: 30,
				_start: new Date(2024, 3, 1),
				_end: new Date(2024, 3, 9),
				_scales,
				_tasks,
				_links,
				_visibleLinks: [],
				focusTask: null,
				_sort: null,
				autoScale: true,
				markers: [],
				_markers: [],
				durationUnit: "day",
				inclusiveEnd: false,
				_unitFormats: unitFormats,
				_isFiltered: false,
				_headerLength: 1,
				filterValues: {},
				groupBy: { field: null },
				tree: tasks,
				highlightTime: null,
				resources,
				_resources: [],
				assignments,
				_assignments: {
					byTask: {},
					byResource: {},
				},
				_composites: new Map(),
				_resourceSort: null,
				displayMode: ["grid", "chart"],
				_displayPanels: ["grid", "chart"],
				gridWidth: 440,
				subGridWidth: 0,
				_compactMode: false,
				_containerWidth: null,
				_chartHeight: null,
				_columnsWidth: 440,
				_gridCollapseThreshold: ADD_TASK_COLUMN_WIDTH,
				progressLine: false,
				_progressLine: null,
				_progressLinePoints: null,
				sCurve: false,
				_sCurve: null,
				_sCurvePoints: null,
				conflicts: [],
				showConflicts: false,
				_conflicts: {
					rows: [],
					constraints: new Set(),
					links: new Set(),
				},
			};

			vi.advanceTimersByTime(1);

			const state = store.getState();

			for (const key in state) {
				if (
					key !== "_scales" &&
					key !== "_linksIndex" &&
					key !== "columns" &&
					key !== "_columns" &&
					key !== "calendars"
				) {
					expect(state[key as keyof IData], key).to.deep.eq(
						defaultState[key as keyof IData]
					);
				}
			}

			// skip comparison for diff function
			for (const key in state["_scales"]) {
				if (key !== "diff")
					expect(
						state["_scales"][key as keyof GanttScaleData]
					).to.deep.eq(
						defaultState["_scales"]?.[key as keyof GanttScaleData]
					);
			}

			// skip comparison for templates
			state["columns"]?.forEach((column, i) => {
				expect(column.width).to.eq(defaultState["columns"]?.[i].width);
				expect(column.align).to.eq(defaultState["columns"]?.[i].align);
				expect(column.header).to.deep.eq(
					defaultState["columns"]?.[i].header
				);
				expect(column.resize).to.eq(
					defaultState["columns"]?.[i].resize
				);
				expect(column.id).to.eq(defaultState["columns"]?.[i].id);
				expect(column.flexgrow).to.eq(
					defaultState["columns"]?.[i].flexgrow
				);
			});
		});
	});

	describe("layout toggles", () => {
		const subGridColumns = [
			{ id: "text", header: "Task", width: 200, section: "grid" },
			{
				id: "status",
				header: "Status",
				width: 120,
				section: "subGrid",
			},
		];

		function resetLayout(overrides: Record<string, unknown> = {}) {
			resetState({
				...getData(),
				columns: subGridColumns,
				displayMode: ["grid", "chart", "subGrid"],
				gridWidth: 440,
				subGridWidth: 226,
				...overrides,
			});
		}

		function resizeGantt(
			ganttWidth: number,
			extra: Record<string, unknown> = {}
		) {
			store.in.exec("resize-chart", {
				width: 500,
				height: 400,
				scrollSize: 0,
				ganttWidth,
				...extra,
			});
			vi.advanceTimersByTime(1);
		}

		test("set-display-mode restores default grid width when reopening from the strip", () => {
			resetLayout({ gridWidth: ADD_TASK_COLUMN_WIDTH });
			resizeGantt(1200);
			store.in.exec("set-display-mode", { mode: ["chart"] });
			vi.advanceTimersByTime(1);
			expect(store.getState()._displayPanels).to.not.include("grid");
			expect(store.getState().gridWidth).to.eq(ADD_TASK_COLUMN_WIDTH);

			store.in.exec("set-display-mode", { mode: ["grid", "chart"] });
			vi.advanceTimersByTime(1);
			expect(store.getState()._displayPanels).to.include("grid");
			expect(store.getState().gridWidth).to.eq(200);
		});

		function dragGrid(
			widths: number[],
			section: "grid" | "subGrid" = "grid"
		) {
			const last = widths.length - 1;
			widths.forEach((width, i) => {
				store.in.exec("resize-grid", {
					width,
					section,
					inProgress: i < last,
				});
				vi.advanceTimersByTime(1);
			});
		}

		test("resize-grid preview collapses only the visible panels", () => {
			resetLayout();
			resizeGantt(1500);
			store.in.exec("resize-grid", { width: 20, inProgress: true });
			vi.advanceTimersByTime(1);
			expect(store.getState()._displayPanels).to.deep.eq([
				"chart",
				"subGrid",
			]);
			expect(store.getState().displayMode).to.deep.eq([
				"grid",
				"chart",
				"subGrid",
			]);
		});

		test("resize-grid preview clamps grid to the space beside the subGrid", () => {
			resetLayout();
			resizeGantt(1500);
			store.in.exec("resize-grid", { width: 1500, inProgress: true });
			vi.advanceTimersByTime(1);
			// 1500 - 226 subGrid - 8 resizers
			expect(store.getState().gridWidth).to.eq(1266);
		});

		test("resize-grid commit at the strip collapses grid and keeps its width", () => {
			resetLayout();
			resizeGantt(1500);
			dragGrid([300, 100, 20]);
			expect(store.getState().displayMode).to.deep.eq([
				"chart",
				"subGrid",
			]);
			expect(store.getState()._displayPanels).to.deep.eq([
				"chart",
				"subGrid",
			]);
			expect(store.getState().gridWidth).to.eq(440);
		});

		test("resize-grid dragged back from the strip restores panels", () => {
			resetLayout();
			resizeGantt(1500);
			dragGrid([20, 400]);
			expect(store.getState()._displayPanels).to.deep.eq([
				"grid",
				"chart",
				"subGrid",
			]);
			expect(store.getState().gridWidth).to.eq(400);
		});

		test("resize-grid commit fits the subGrid like the gantt resizer", () => {
			resetLayout();
			resizeGantt(1300);
			// a resizer outside the gantt layout (ResourceLoad) sends the raw width;
			// 1300 - 900 - 226 subGrid leaves the chart under its subGrid floor
			dragGrid([800, 900]);
			expect(store.getState().gridWidth).to.eq(900);
			expect(store.getState().displayMode).to.deep.eq(["grid", "chart"]);
			expect(store.getState()._displayPanels).to.deep.eq([
				"grid",
				"chart",
			]);
		});

		test("resize-grid commit past the chart min keeps only the grid", () => {
			resetLayout();
			resizeGantt(1300);
			dragGrid([800, 1296]);
			expect(store.getState()._displayPanels).to.deep.eq(["grid"]);
		});

		test("resize-grid subGrid commit at the min strip collapses subGrid", () => {
			resetLayout();
			resizeGantt(1500);
			dragGrid([200, 10], "subGrid");
			expect(store.getState().displayMode).to.deep.eq(["grid", "chart"]);
			expect(store.getState().subGridWidth).to.eq(226);
		});

		test("set-display-mode in compact updates only display panels", () => {
			resetLayout({ gridWidth: 300, subGridWidth: 200 });
			resizeGantt(400, { width: 0, height: 0 });
			expect(store.getState()._compactMode).to.be.true;

			store.in.exec("set-display-mode", { mode: ["chart"] });
			vi.advanceTimersByTime(1);
			expect(store.getState()._displayPanels).to.deep.eq(["chart"]);
			expect(store.getState().displayMode).to.deep.eq([
				"grid",
				"chart",
				"subGrid",
			]);
		});

		test("changing displayMode in compact switches the visible panel", () => {
			resetLayout();
			resizeGantt(400, { width: 0, height: 0 });
			expect(store.getState()._compactMode).to.be.true;
			expect(store.getState()._displayPanels).to.deep.eq(["grid"]);

			store.init({
				...getData(),
				columns: subGridColumns,
				displayMode: "chart",
			});
			vi.advanceTimersByTime(1);
			expect(store.getState()._compactMode).to.be.true;
			expect(store.getState().displayMode).to.deep.eq(["chart"]);
			expect(store.getState()._displayPanels).to.deep.eq(["chart"]);
		});

		test("compact init keeps a single-panel displayMode", () => {
			resetLayout({ displayMode: ["chart"] });
			resizeGantt(400, { width: 0, height: 0 });
			expect(store.getState()._compactMode).to.be.true;
			expect(store.getState()._displayPanels).to.deep.eq(["chart"]);
		});

		test("set-display-mode opens subGrid by dropping chart in tight layout", () => {
			resetLayout();
			resizeGantt(690);
			expect(store.getState()._displayPanels).to.deep.eq([
				"grid",
				"chart",
			]);

			store.in.exec("set-display-mode", {
				mode: ["grid", "chart", "subGrid"],
			});
			vi.advanceTimersByTime(1);

			expect(store.getState().displayMode).to.deep.eq([
				"grid",
				"subGrid",
			]);
			expect(store.getState()._displayPanels).to.deep.eq([
				"grid",
				"subGrid",
			]);
			expect(store.getState().gridWidth).to.eq(440);
			expect(store.getState().subGridWidth).to.eq(226);
		});

		test("widening restores auto-hidden subGrid; grid resize does not pin preference", () => {
			resetLayout();
			resizeGantt(690);
			expect(store.getState().displayMode).to.deep.eq([
				"grid",
				"chart",
				"subGrid",
			]);
			expect(store.getState()._displayPanels).to.deep.eq([
				"grid",
				"chart",
			]);

			store.in.exec("resize-grid", { width: 400 });
			vi.advanceTimersByTime(1);

			resizeGantt(1200);
			expect(store.getState()._displayPanels).to.deep.eq([
				"grid",
				"chart",
				"subGrid",
			]);
		});

		test("explicitly closed subGrid stays closed after the window grows", () => {
			resetLayout();
			resizeGantt(1500);
			store.in.exec("set-display-mode", { mode: ["grid", "chart"] });
			vi.advanceTimersByTime(1);

			resizeGantt(690);
			resizeGantt(1500);
			expect(store.getState().displayMode).to.deep.eq(["grid", "chart"]);
			expect(store.getState()._displayPanels).to.deep.eq([
				"grid",
				"chart",
			]);
			expect(store.getState().subGridWidth).to.eq(226);
		});

		test("set-display-mode drops subGrid when restoring chart in tight layout", () => {
			resetLayout({
				displayMode: ["grid", "subGrid"],
				gridWidth: 400,
				subGridWidth: 300,
			});
			resizeGantt(1000);
			expect(store.getState()._compactMode).to.be.false;

			store.in.exec("set-display-mode", {
				mode: ["grid", "chart", "subGrid"],
			});
			vi.advanceTimersByTime(1);

			expect(store.getState().displayMode).to.deep.eq(["grid", "chart"]);
			expect(store.getState().subGridWidth).to.eq(300);
		});

		test("reinit preserves dragged grid width when width prop is unset", () => {
			const data = getData();
			resetState({
				...data,
				gridWidth: 440,
			});

			resizeGantt(1000);
			store.in.exec("resize-grid", { width: 600 });
			vi.advanceTimersByTime(1);
			expect(store.getState().gridWidth).to.eq(600);

			store.init({ ...data, tasks: data.tasks });
			vi.advanceTimersByTime(1);
			expect(store.getState().gridWidth).to.eq(600);
		});

		test("reinit without displayMode keeps subGrid panels", () => {
			resetLayout();
			resizeGantt(1500, { width: 0, height: 0 });
			expect(store.getState().displayMode).to.deep.eq([
				"grid",
				"chart",
				"subGrid",
			]);

			store.init({
				...getData(),
				columns: subGridColumns,
			});
			vi.advanceTimersByTime(1);

			expect(store.getState().displayMode).to.deep.eq([
				"grid",
				"chart",
				"subGrid",
			]);
			expect(store.getState()._displayPanels).to.deep.eq([
				"grid",
				"chart",
				"subGrid",
			]);
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
				show: true,
			});

			store.in.exec("add-task", {
				task: { text: "Task 4", id: 4, parent: 2 },
				show: true,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.toArray().length).to.eq(4);
			expect(tasks.byId(2).data?.length).to.eq(1);

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

		test("adding a child into an empty lazy branch loads the siblings", () => {
			resetState({
				...getData(),
				links: [],
				tasks: [
					{
						id: 1,
						text: "Discussions",
						type: "summary",
						lazy: true,
						open: false,
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 12),
					},
				],
			});

			const requested: number[] = [];
			store.in.on("request-data", (ev: { id: number }) => {
				requested.push(ev.id);
			});

			store.in.exec("add-task", {
				target: 1,
				mode: "child",
				show: true,
				task: { id: 9, text: "New task", type: "task" },
			});
			vi.advanceTimersByTime(1);

			const { tasks } = store.getState();
			expect(requested).to.deep.eq([1]);
			expect(tasks.byId(1).lazy).to.eq(true);
			expect(tasks.byId(1).open).to.eq(true);
			expect(tasks.byId(1).data?.map(t => t.id)).to.deep.eq([9]);

			store.in.exec("provide-data", {
				id: 1,
				data: {
					tasks: [
						{
							id: 2,
							text: "Agenda",
							type: "task",
							parent: 1,
							start: new Date(2024, 3, 2),
							end: new Date(2024, 3, 4),
						},
						{
							id: 3,
							text: "Notes",
							type: "task",
							parent: 1,
							start: new Date(2024, 3, 4),
							end: new Date(2024, 3, 6),
						},
					],
					links: [{ id: 5, source: 2, target: 3, type: "e2s" }],
				},
			});
			vi.advanceTimersByTime(1);

			const { tasks: loaded, links } = store.getState();
			expect(loaded.byId(1).lazy).to.eq(false);
			expect(loaded.byId(1).data?.map(t => t.id)).to.deep.eq([9, 2, 3]);
			expect(loaded.byId(9).text).to.eq("New task");
			expect(links.map(l => l.id)).to.deep.eq([5]);
		});

		test("a child added to a lazy branch is requested before the add is sent on", async () => {
			resetState({
				...getData(),
				links: [],
				tasks: [
					{
						id: 1,
						text: "Discussions",
						type: "summary",
						lazy: true,
						open: false,
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 12),
					},
				],
			});

			const order: string[] = [];
			store.in.on("request-data", () => {
				order.push("request-data");
			});
			store.in.setNext({
				exec: (name: string) => {
					if (name === "add-task") order.push("add-task");
				},
			} as any);

			await store.in.exec("add-task", {
				target: 1,
				mode: "child",
				show: true,
				task: { id: 9, text: "New task", type: "task" },
			});

			expect(order).to.deep.eq(["request-data", "add-task"]);
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

		test("prepareEditTask clamps duration below 1 to 1", () => {
			resetState();
			const state = store.getState();
			const start = new Date(2024, 3, 2);

			const zero = { start, end: new Date(2024, 3, 5), duration: 0 };
			prepareEditTask(zero, state, undefined, "duration");
			expect(zero.duration).to.eq(1);
			expect(zero.end).to.deep.eq(new Date(2024, 3, 3));

			const negative = { start, end: new Date(2024, 3, 5), duration: -4 };
			prepareEditTask(negative, state, undefined, "duration");
			expect(negative.duration).to.eq(1);
			expect(negative.end).to.deep.eq(new Date(2024, 3, 3));
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

		test("keeps correct layout when add-task and text update run in the same batch", () => {
			resetState();
			vi.advanceTimersByTime(1);

			store.in.exec("add-task", {
				id: 3,
				mode: "after",
				target: 0,
				task: { id: 3, text: "child 3" },
			});
			store.in.exec("update-task", {
				id: 3,
				task: { id: 3, text: "update 3" },
			});

			vi.advanceTimersByTime(1);

			const { _tasks } = store.getState();
			const task = _tasks.find(t => t.id === 3);

			expect(task?.text).to.eq("update 3");
			expect(task?.$x).to.be.a("number");
			expect(task?.$y).to.be.a("number");
			expect(task?.$w).to.be.gt(0);
			expect(task?.$h).to.be.gt(0);
		});

		describe("events carry the full task as the store has it", () => {
			const day = (d: number) => new Date(2024, 3, d);

			// a debounced backend handler keeps only the last event of a task
			function trackLast() {
				const last: Record<string, ITask> = {};
				store.in.setNext({
					exec: (name: string, ev: any) => {
						if (name === "update-task")
							last[ev.id] = { ...ev.task };
					},
				} as any);
				return last;
			}

			test("inactive state written down to a nested summary", () => {
				resetState({
					...getData(),
					tasks: [
						{ id: 1, type: "summary", text: "S1", start: day(1) },
						{ id: 2, type: "summary", text: "S2", parent: 1 },
						{
							id: 3,
							text: "A",
							parent: 2,
							start: day(1),
							duration: 2,
						},
						{
							id: 4,
							text: "B",
							parent: 2,
							start: day(3),
							duration: 2,
						},
					],
					links: [],
					inactiveTasks: true,
					summary: { autoProgress: true },
				});
				const last = trackLast();

				store.in.exec("update-task", {
					id: 1,
					task: { inactive: true },
				});

				expect(last[2].inactive).to.eq(true);
				expect(last[2].text).to.eq("S2");
				expect(last[2].parent).to.eq(1);
			});

			test("child text is kept when its summary moves", () => {
				resetState({
					...getData(),
					tasks: [
						{ id: 1, type: "summary", text: "S", start: day(1) },
						{
							id: 2,
							text: "A",
							parent: 1,
							start: day(1),
							duration: 2,
						},
						{
							id: 3,
							text: "B",
							parent: 1,
							start: day(3),
							duration: 2,
						},
					],
					links: [],
				});
				const last = trackLast();

				store.in.exec("update-task", { id: 2, task: { text: "A2" } });
				store.in.exec("update-task", { id: 1, task: {}, diff: 3 });

				expect(last[2].text).to.eq("A2");
				expect(last[2].parent).to.eq(1);
				expect(last[2].start).to.deep.eq(day(4));
			});

			test("an edit leaves with the dates the scheduler set", () => {
				resetState({
					...getData(),
					tasks: [
						{ id: 1, text: "A", start: day(6), duration: 3 },
						{ id: 2, text: "B", start: day(9), duration: 3 },
					],
					links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
					schedule: { auto: true },
				});
				vi.advanceTimersByTime(1);
				const last = trackLast();

				store.in.exec("update-task", {
					id: 2,
					task: { constraint: { type: "mso", date: day(20) } },
				});

				expect(store.getState().tasks.byId(2).start).to.deep.eq(
					day(20)
				);
				expect(last[2].start).to.deep.eq(day(20));
				expect(last[2].constraint.type).to.eq("mso");
			});

			test("a summary drag leaves with the dates the scheduler set", () => {
				resetState({
					...getData(),
					tasks: [
						{ id: 1, text: "X", start: day(1), duration: 3 },
						{ id: 2, type: "summary", text: "S", start: day(4) },
						{
							id: 3,
							text: "A",
							parent: 2,
							start: day(4),
							duration: 2,
						},
						{
							id: 4,
							text: "B",
							parent: 2,
							start: day(6),
							duration: 2,
						},
					],
					links: [{ id: 1, source: 1, target: 3, type: "e2s" }],
					schedule: { auto: true },
				});
				vi.advanceTimersByTime(1);
				const last = trackLast();

				store.in.exec("update-task", { id: 2, task: {}, diff: -2 });

				const summary = store.getState().tasks.byId(2);
				expect(summary.start).to.deep.eq(day(4));
				expect(last[2].start).to.deep.eq(summary.start);
				expect(last[2].end).to.deep.eq(summary.end);
			});
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

		test("id 0 with nested opens and closes every branch once", () => {
			resetState({
				...getData(),
				links: [],
				tasks: [
					{
						id: 1,
						text: "A",
						type: "summary",
						open: false,
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 12),
					},
					{
						id: 2,
						text: "A1",
						type: "summary",
						open: false,
						parent: 1,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 6),
					},
					{
						id: 3,
						text: "A1a",
						type: "task",
						parent: 2,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 4),
					},
					{
						id: 4,
						text: "B",
						type: "summary",
						open: false,
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 6),
					},
					{
						id: 5,
						text: "B1",
						type: "task",
						parent: 4,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 4),
					},
				],
			});
			const { tasks } = store.getState();
			expect(tasks.toArray().map(t => t.id)).to.deep.eq([1, 4]);

			store.in.exec("open-task", { id: 0, mode: true });
			vi.advanceTimersByTime(1);
			expect(tasks.byId(1).open).to.eq(false);
			expect(tasks.byId(4).open).to.eq(false);
			expect(tasks.toArray().map(t => t.id)).to.deep.eq([1, 4]);

			store.in.exec("open-task", { id: 0, mode: true, nested: true });
			vi.advanceTimersByTime(1);
			expect(tasks.byId(2).open).to.eq(true);
			expect(tasks.toArray().map(t => t.id)).to.deep.eq([1, 2, 3, 4, 5]);

			store.in.exec("open-task", { id: 0, mode: false, nested: true });
			vi.advanceTimersByTime(1);
			expect(tasks.toArray().map(t => t.id)).to.deep.eq([1, 4]);
			expect(tasks.byId(1).open).to.eq(false);
			expect(tasks.byId(2).open).to.eq(false);
		});

		test("nested open of one branch leaves the other closed", () => {
			resetState({
				...getData(),
				links: [],
				tasks: [
					{
						id: 1,
						text: "A",
						type: "summary",
						open: false,
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 12),
					},
					{
						id: 2,
						text: "A1",
						type: "summary",
						open: false,
						parent: 1,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 6),
					},
					{
						id: 3,
						text: "A1a",
						type: "task",
						parent: 2,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 4),
					},
					{
						id: 4,
						text: "B",
						type: "summary",
						open: false,
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 6),
					},
					{
						id: 5,
						text: "B1",
						type: "task",
						parent: 4,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 4),
					},
				],
			});
			const { tasks } = store.getState();

			store.in.exec("open-task", { id: 1, mode: true, nested: true });
			vi.advanceTimersByTime(1);
			expect(tasks.byId(1).open).to.eq(true);
			expect(tasks.byId(2).open).to.eq(true);
			expect(tasks.byId(4).open).to.eq(false);
			expect(tasks.toArray().map(t => t.id)).to.deep.eq([1, 2, 3, 4]);

			store.in.exec("open-task", { id: 1, mode: false, nested: true });
			vi.advanceTimersByTime(1);
			expect(tasks.byId(1).open).to.eq(false);
			expect(tasks.byId(2).open).to.eq(false);
			expect(tasks.toArray().map(t => t.id)).to.deep.eq([1, 4]);

			store.in.exec("open-task", { id: 1, mode: true });
			vi.advanceTimersByTime(1);
			expect(tasks.byId(2).open).to.eq(false);
			expect(tasks.toArray().map(t => t.id)).to.deep.eq([1, 2, 4]);

			store.in.exec("open-task", { id: 2, mode: true, nested: true });
			vi.advanceTimersByTime(1);
			expect(tasks.byId(2).open).to.eq(true);
			expect(tasks.byId(4).open).to.eq(false);
			expect(tasks.toArray().map(t => t.id)).to.deep.eq([1, 2, 3, 4]);
		});

		test("nested open waits for a lazy branch and stays out of undo", () => {
			const tasksIn = [
				{
					id: 1,
					text: "Plan",
					type: "summary",
					lazy: true,
					open: false,
					parent: 0,
					start: new Date(2024, 3, 2),
					end: new Date(2024, 3, 12),
				},
			];
			resetState({
				...getData(),
				undo: true,
				links: [],
				tasks: tasksIn,
			});

			const requested: { id: number; nested?: boolean }[] = [];
			store.in.on(
				"request-data",
				(ev: { id: number; nested?: boolean }) => {
					requested.push({ id: ev.id, nested: ev.nested });
				}
			);

			store.in.exec("open-task", { id: 1, mode: true, nested: true });
			expect(requested).to.deep.eq([{ id: 1, nested: true }]);

			const arrived = {
				tasks: [
					{
						id: 2,
						text: "Phase",
						type: "summary",
						open: false,
						parent: 1,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 8),
					},
					{
						id: 3,
						text: "Draft",
						type: "task",
						parent: 2,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 4),
					},
					{
						id: 4,
						text: "Later",
						type: "summary",
						lazy: true,
						open: false,
						parent: 1,
						start: new Date(2024, 3, 8),
						end: new Date(2024, 3, 12),
					},
					{
						id: 5,
						text: "Note",
						type: "task",
						parent: 4,
						start: new Date(2024, 3, 8),
						end: new Date(2024, 3, 10),
					},
				],
				links: [],
			};

			store.in.exec("provide-data", {
				id: 1,
				data: arrived,
				nested: true,
			});
			vi.advanceTimersByTime(1);

			let { tasks, history } = store.getState();
			expect(tasks.byId(2).open).to.eq(true);
			expect(tasks.byId(4).open).to.eq(true);
			expect(tasks.byId(4).lazy).to.eq(false);
			expect(tasks.toArray().map(t => t.id)).to.deep.eq([1, 2, 3, 4, 5]);
			expect(requested).to.deep.eq([{ id: 1, nested: true }]);
			expect(history).to.deep.eq({ undo: 0, redo: 0 });

			store.in.exec("update-task", {
				id: 3,
				task: { text: "Edited" },
			});
			vi.advanceTimersByTime(1);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			store.in.exec("undo");
			vi.advanceTimersByTime(1);
			({ tasks, history } = store.getState());
			expect(tasks.byId(3).text).to.eq("Draft");
			expect(tasks.byId(2).open).to.eq(true);
			expect(tasks.byId(4).open).to.eq(true);
			expect(tasks.toArray().map(t => t.id)).to.deep.eq([1, 2, 3, 4, 5]);
			expect(history).to.deep.eq({ undo: 0, redo: 1 });
		});

		test("a plain response keeps loaded children closed and clears lazy", () => {
			resetState({
				...getData(),
				links: [],
				tasks: [
					{
						id: 1,
						text: "Plan",
						type: "summary",
						lazy: true,
						open: false,
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 12),
					},
				],
			});

			const requested: number[] = [];
			store.in.on("request-data", (ev: { id: number }) => {
				requested.push(ev.id);
			});

			store.in.exec("open-task", { id: 1, mode: true });
			store.in.exec("provide-data", {
				id: 1,
				data: {
					tasks: [
						{
							id: 2,
							text: "Phase",
							type: "summary",
							lazy: true,
							open: false,
							parent: 1,
							start: new Date(2024, 3, 2),
							end: new Date(2024, 3, 8),
						},
						{
							id: 3,
							text: "Draft",
							type: "task",
							parent: 2,
							start: new Date(2024, 3, 2),
							end: new Date(2024, 3, 4),
						},
					],
					links: [],
				},
			});
			vi.advanceTimersByTime(1);

			const { tasks } = store.getState();
			expect(tasks.byId(1).open).to.eq(true);
			expect(tasks.byId(2).open).to.eq(false);
			expect(tasks.byId(2).lazy).to.eq(false);
			expect(tasks.toArray().map(t => t.id)).to.deep.eq([1, 2]);
			expect(requested).to.deep.eq([1]);
		});

		test("closing before the load keeps the branch closed", () => {
			resetState({
				...getData(),
				links: [],
				tasks: [
					{
						id: 1,
						text: "Plan",
						type: "summary",
						lazy: true,
						open: false,
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 12),
					},
				],
			});

			store.in.exec("open-task", { id: 1, mode: true, nested: true });
			store.in.exec("open-task", { id: 1, mode: false });
			store.in.exec("provide-data", {
				id: 1,
				nested: true,
				data: {
					tasks: [
						{
							id: 2,
							text: "Phase",
							type: "summary",
							open: false,
							parent: 1,
							start: new Date(2024, 3, 2),
							end: new Date(2024, 3, 8),
						},
						{
							id: 3,
							text: "Draft",
							type: "task",
							parent: 2,
							start: new Date(2024, 3, 2),
							end: new Date(2024, 3, 4),
						},
					],
					links: [],
				},
			});
			vi.advanceTimersByTime(1);

			const { tasks } = store.getState();
			expect(tasks.byId(1).open).to.eq(false);
			expect(tasks.byId(2).open).to.eq(true);
			expect(tasks.byId(1).data?.map(t => t.id)).to.deep.eq([2]);
			expect(tasks.toArray().map(t => t.id)).to.deep.eq([1]);
		});

		test("a nested open after a plain one asks again and opens the children", () => {
			resetState({
				...getData(),
				links: [],
				tasks: [
					{
						id: 1,
						text: "Plan",
						type: "summary",
						lazy: true,
						open: false,
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 12),
					},
				],
			});

			const requested: number[] = [];
			store.in.on("request-data", (ev: { id: number }) => {
				requested.push(ev.id);
			});

			store.in.exec("open-task", { id: 1, mode: true });
			store.in.exec("open-task", { id: 1, mode: true, nested: true });
			expect(requested).to.deep.eq([1, 1]);

			store.in.exec("provide-data", {
				id: 1,
				nested: true,
				data: {
					tasks: [
						{
							id: 2,
							text: "Phase",
							type: "summary",
							open: false,
							parent: 1,
							start: new Date(2024, 3, 2),
							end: new Date(2024, 3, 8),
						},
						{
							id: 3,
							text: "Draft",
							type: "task",
							parent: 2,
							start: new Date(2024, 3, 2),
							end: new Date(2024, 3, 4),
						},
					],
					links: [],
				},
			});
			vi.advanceTimersByTime(1);

			const { tasks } = store.getState();
			expect(tasks.byId(1).open).to.eq(true);
			expect(tasks.byId(2).open).to.eq(true);
			expect(tasks.toArray().map(t => t.id)).to.deep.eq([1, 2, 3]);
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

		test("can select a range of tasks, reverse", () => {
			resetState(getData("range"));

			store.in.exec("select-task", {
				id: 20,
			});
			store.in.exec("select-task", {
				id: 1,
				range: true,
			});

			vi.advanceTimersByTime(1);

			expect(store.getState().selected).to.deep.eq([
				20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3,
				2, 1,
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
			const branchLength = tasks.byId(2).data!.length;
			const cTask = tasks.toArray()[vIndex + (branchLength + 1)];

			expect(tasks.toArray().length).to.eq(24);

			// check parent
			for (const key in cTask) {
				if (key !== "id" && key !== "$y" && key !== "data")
					expect(cTask[key]).to.deep.eq(tasks.byId(2)[key]);
			}

			// check children
			cTask.data?.forEach((task, i) => {
				for (const key in task) {
					if (key === "parent") expect(task[key]).to.eq(cTask.id);
					else if (key !== "id" && key !== "$y")
						expect(task[key]).to.deep.eq(
							tasks.byId(2).data?.[i][key]
						);
				}
			});

			expect(
				links.map(l => l).length,
				"links must be copied in this case"
			).to.eq(10);
		});

		test("can copy resource assignments for a task", () => {
			const data = getData("full");
			data.resources = [{ id: "r1", name: "Resource 1" }];
			data.assignments = [
				{ id: "a1", task: 110, resource: "r1", units: 40 },
			];
			resetState(data);
			const { tasks } = store.getState();
			const beforeIds = new Set(tasks.serialize().map(t => t.id));

			store.in.exec("copy-task", {
				id: 110,
				target: 112,
				mode: "after",
			});

			vi.advanceTimersByTime(1);

			const copiedTask = tasks
				.serialize()
				.find(
					t => !beforeIds.has(t.id) && t.text === tasks.byId(110).text
				);

			expect(copiedTask).to.be.ok;
			expect(
				store.getTaskResources(copiedTask!.id).map(a => ({
					id: a.id,
					units: a.units,
					name: a.name,
				}))
			).to.deep.eq([{ id: "r1", units: 40, name: "Resource 1" }]);
		});

		test("can copy resource assignments for tasks with children", () => {
			const data = getData("full");
			data.resources = [
				{ id: "r1", name: "Resource 1" },
				{ id: "r2", name: "Resource 2" },
			];
			data.assignments = [
				{ id: "a1", task: 20, resource: "r1", units: 40 },
				{ id: "a2", task: 21, resource: "r2", units: 60 },
			];
			resetState(data);
			const { tasks } = store.getState();
			const beforeIds = new Set(tasks.serialize().map(t => t.id));

			store.in.exec("copy-task", {
				id: 2,
				target: 2,
				mode: "after",
			});

			vi.advanceTimersByTime(1);

			const vIndex = tasks.toArray().findIndex(t => t.id === 2);
			const branchLength = tasks.byId(2).data!.length;
			const cTask = tasks.toArray()[vIndex + (branchLength + 1)];
			const copiedPlanning = cTask.data?.find(
				t => t.text === tasks.byId(20).text
			);
			const copiedApproval = cTask.data?.find(
				t => t.text === tasks.byId(21).text
			);

			expect(
				store.getTaskResources(copiedPlanning!.id).map(a => ({
					id: a.id,
					units: a.units,
					name: a.name,
				}))
			).to.deep.eq([{ id: "r1", units: 40, name: "Resource 1" }]);
			expect(
				store.getTaskResources(copiedApproval!.id).map(a => ({
					id: a.id,
					units: a.units,
					name: a.name,
				}))
			).to.deep.eq([{ id: "r2", units: 60, name: "Resource 2" }]);

			const copiedAssignments = store
				.getState()
				.assignments!.map(a => ({
					task: a.task,
					resource: a.resource,
					units: a.units,
				}))
				.filter(a => !beforeIds.has(a.task))
				.sort((a, b) =>
					String(a.resource).localeCompare(String(b.resource))
				);
			expect(copiedAssignments).to.deep.eq([
				{ task: copiedPlanning!.id, resource: "r1", units: 40 },
				{ task: copiedApproval!.id, resource: "r2", units: 60 },
			]);
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
			expect(tasks.byId(2).data?.length).to.eq(4);
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
			expect(tasks.byId(2).data?.length).to.eq(3);
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

		test("links are sorted by length", () => {
			resetState(getData("full"));

			store.in.exec("add-link", {
				link: {
					id: 999,
					source: 20,
					target: 23,
					type: "e2s",
				},
			});
			vi.advanceTimersByTime(1);

			const { _links } = store.getState();
			expect(_links.findIndex(l => l.id === 7)).to.eq(0);
			expect(_links.findIndex(l => l.id === 999)).to.eq(1);
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

			expect(tasks.toArray().length).to.eq(2);
			expect(tasks.byId(2).data?.length).to.eq(4);
			expect(links.map(l => l).length).to.eq(4);

			expect(tasks.byId(2).lazy).to.eq(false);
			expect(tasks.byId(2).open).to.eq(false);
		});
	});

	test("sort-tasks", () => {
		resetState(getData("full"));

		store.in.exec("sort-tasks", { order: "desc", key: "id" });

		const { tasks, _tasks } = store.getState();
		const branch = tasks.getBranch(12);
		expect(branch?.[0].id).to.eq(12);
		expect(_tasks[0].id).not.to.equal(1);
	});

	describe("support of forwart strategy", () => {
		test("can add tasks", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("add-task", {
				task: {
					text: "Task 3",
					id: 3,
					start: new Date(2024, 4, 8),
					duration: 10,
					end: new Date(2024, 4, 10),
				},
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(3).start).to.deep.eq(new Date(2024, 4, 8));
			expect(tasks.byId(3).duration).to.eq(10);
			expect(tasks.byId(3).end).to.deep.equal(new Date(2024, 4, 18));
		});
		test("can update task", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 2,
				task: {
					start: new Date(2024, 3, 11),
					duration: 4,
				},
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(2).start).to.deep.eq(new Date(2024, 3, 11));
			expect(tasks.byId(2).duration).to.eq(4);
			expect(tasks.byId(2).end).to.deep.equal(new Date(2024, 3, 15));

			store.in.exec("update-task", {
				id: 2,
				task: {
					start: new Date(2024, 3, 16),
					duration: 5,
					end: new Date(2024, 3, 18),
				},
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(2).start).to.deep.eq(new Date(2024, 3, 16));
			expect(tasks.byId(2).duration).to.eq(5);
			expect(tasks.byId(2).end).to.deep.equal(new Date(2024, 3, 21));

			store.in.exec("update-task", {
				id: 2,
				task: {
					start: new Date(2024, 3, 5),
					end: new Date(2024, 3, 9),
				},
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(2).start).to.deep.eq(new Date(2024, 3, 5));
			expect(tasks.byId(2).duration).to.eq(4);
			expect(tasks.byId(2).end).to.deep.equal(new Date(2024, 3, 9));
		});

		test("can update task on DnD finish", () => {
			resetState();
			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 2,
				task: {
					start: new Date(2024, 3, 6),
					end: new Date(2024, 3, 8),
				},
				diff: 3,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(2).start).to.deep.eq(new Date(2024, 3, 9));
			expect(tasks.byId(2).duration).to.eq(2);
			expect(tasks.byId(2).end).to.deep.equal(new Date(2024, 3, 11));

			store.in.exec("update-task", {
				id: 2,
				task: {
					start: new Date(2024, 3, 9),
				},
				diff: -2,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(2).start).to.deep.eq(new Date(2024, 3, 7));
			expect(tasks.byId(2).duration).to.eq(4);
			expect(tasks.byId(2).end).to.deep.equal(new Date(2024, 3, 11));

			store.in.exec("update-task", {
				id: 2,
				task: {
					end: new Date(2024, 3, 11),
				},
				diff: 5,
			});

			vi.advanceTimersByTime(1);

			expect(tasks.byId(2).start).to.deep.eq(new Date(2024, 3, 7));
			expect(tasks.byId(2).duration).to.eq(9);
			expect(tasks.byId(2).end).to.deep.equal(new Date(2024, 3, 16));
		});
	});

	describe("rollups", () => {
		test("rollups are not created when rollups is disabled", () => {
			resetState(getData("full"));
			const { _rollups } = store.getState();

			vi.advanceTimersByTime(1);

			expect(_rollups).to.deep.eq({});
		});

		test("rollups are created for tasks with rollup flag when parent is closed", () => {
			const data = getData("full");
			data.tasks[0].type = "summary"; // task 1
			data.tasks[0].open = false;
			data.tasks[1].rollup = true; // task 10
			data.tasks[2].rollup = true; // task 11

			resetState({ ...data, rollups: { type: "closest" } });
			const { _rollups } = store.getState();

			vi.advanceTimersByTime(1);

			expect(_rollups[1]).to.not.be.undefined;
			expect(_rollups[1].length).to.be.greaterThan(0);
			expect(Array.from(_rollups[1]).some(r => r.id === 10)).to.be.true;
			expect(Array.from(_rollups[1]).some(r => r.id === 11)).to.be.true;
		});

		test("rollups mode 'closest' only shows rollups from closest summary parent", () => {
			const data = getData("full");
			data.tasks[0].type = "summary"; // task 1
			data.tasks[0].open = true;

			data.tasks[2].type = "summary"; // task 11
			data.tasks[2].open = false;

			data.tasks[3].rollup = true; // task 110

			resetState({ ...data, rollups: { type: "closest" } });
			const { _rollups } = store.getState();

			vi.advanceTimersByTime(1);

			expect(_rollups["11"]).to.not.be.undefined;
			expect(Array.from(_rollups["11"]).some(r => r.id === 110)).to.be
				.true;

			if (_rollups[1]) {
				expect(Array.from(_rollups["1"]).some(r => r.id === 110)).to.be
					.false;
			}
		});

		test("rollups mode 'all' shows rollups in all summary parents", () => {
			const data = getData("full");
			// Create nested summary structure
			data.tasks[0].type = "summary";
			data.tasks[0].open = true;

			data.tasks[2].type = "summary"; // task 11
			data.tasks[2].open = false;

			data.tasks[3].rollup = true; // task 110

			resetState({ ...data, rollups: { type: "all" } });
			const { _rollups } = store.getState();

			vi.advanceTimersByTime(1);

			expect(_rollups[11]).to.not.be.undefined;
			expect(Array.from(_rollups[11]).some(r => r.id === 110)).to.be.true;
			expect(_rollups[1]).to.not.be.undefined;
			expect(Array.from(_rollups[1]).some(r => r.id === 110)).to.be.true;
		});

		test("tasks without rollup flag are not added to rollups", () => {
			const data = getData("full");
			data.tasks[1].rollup = false; // task 10
			data.tasks[0].type = "summary";
			data.tasks[0].open = false; // task 1 (summary)

			resetState({ ...data, rollups: { type: "closest" } });
			const { _rollups } = store.getState();

			vi.advanceTimersByTime(1);

			if (_rollups[1]) {
				expect(Array.from(_rollups[1]).some(r => r.id === 10)).to.be
					.false;
			}
		});

		test("dragRollups updates rollup positions when summary is dragged", () => {
			const data = getData("full");
			data.tasks[0].type = "summary"; // task 1
			data.tasks[0].open = false;

			data.tasks[1].rollup = true; // task 10

			resetState({ ...data, rollups: { type: "closest" } });

			vi.advanceTimersByTime(1);
			const { _rollups, _tasks } = store.getState();
			const summaryTask = _tasks.find((t: any) => t.id === 1);
			const rollupTask = Array.from(_rollups[1]).find(
				(r: any) => r.id === 10
			);

			if (summaryTask && rollupTask) {
				const initialXRollup = rollupTask.$x_rollup;

				store.in.exec("drag-task", {
					id: 1,
					left: summaryTask.$x + 100,
				});

				vi.advanceTimersByTime(1);

				const updatedState = store.getState();
				const updatedRollupTask = Array.from(
					updatedState._rollups[1]
				).find((r: any) => r.id === 10);

				expect(updatedRollupTask?.$x_rollup).to.eq(
					initialXRollup + 100
				);
			}
		});

		test("rollups are updated when task is updated", () => {
			const data = getData("full");
			data.tasks[0].type = "summary"; // task 1
			data.tasks[0].open = false;

			data.tasks[1].rollup = true; // task 10

			resetState({ ...data, rollups: { type: "closest" } });
			vi.advanceTimersByTime(1);

			store.in.exec("update-task", {
				id: 10,
				task: {
					type: "milestone",
				},
			});

			vi.advanceTimersByTime(1);

			const updatedState = store.getState();
			expect(updatedState._rollups[1]).to.not.be.undefined;
			const rollupTask = Array.from(updatedState._rollups[1]).find(
				(r: any) => r.id === 10
			);
			expect(rollupTask).to.not.be.undefined;
			expect(rollupTask!.type).to.eq("milestone");
		});
	});
	describe("autoscheduling", () => {
		// Cycle/parent-chain detection itself is owned and tested by
		// lib-schedule. These tests cover only what AutoScheduler wires up:
		// feeding the graph, the e2s-only filter, consuming `invalidLinks`,
		// and re-running on the right events. Data is kept minimal so the
		// expected outcome does not depend on lib-schedule internals.
		const task = (
			id: number,
			parent = 0,
			type: ITask["type"] = "task"
		): ITask => ({
			id,
			text: `Task ${id}`,
			type,
			parent,
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 4),
		});

		test("removes invalid links on init, whatever their type", () => {
			resetState({
				...getData("autoScheduling"),
				tasks: [task(1), task(2), task(3)],
				links: [
					{ id: 1, source: 1, target: 2, type: "e2s" }, // valid
					{ id: 2, source: 3, target: 3, type: "e2s" }, // self-reference
					{ id: 3, source: 3, target: 3, type: "s2s" }, // self-reference
				],
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(1);

			// AutoScheduler feeds every link to lib-schedule and deletes the ones
			// it reports invalid. Links 2 and 3 are both self-references — a
			// self-loop on the task end node and on its start node — so both go.
			const { links } = store.getState();
			expect(links.byId(1).id).to.exist;
			expect(links.byId(2)).to.be.undefined;
			expect(links.byId(3)).to.be.undefined;
			expect(links.map(l => l).length).to.eq(1);
		});
		test("removes a link that becomes invalid after move-task", () => {
			resetState({
				...getData("autoScheduling"),
				// summary 1 (with child 9) and a sibling task 2
				tasks: [task(1, 0, "summary"), task(9, 1), task(2)],
				links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(1);
			// the link is valid while task 2 is a sibling of summary 1
			expect(store.getState().links.byId(1).id).to.exist;

			// moving task 2 into summary 1 makes the link point from a summary
			// to its own descendant; the move-task handler re-runs scheduling
			// and the now-invalid link is removed.
			store.in.exec("move-task", { id: 2, target: 1, mode: "child" });
			vi.advanceTimersByTime(1);

			expect(store.getState().links.byId(1)).to.be.undefined;
		});
		test("ignores dangling links while filtering unscheduled tasks", async () => {
			resetState({
				...getData("autoScheduling"),
				tasks: [task(1)],
				links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
				schedule: { auto: true },
				unscheduledTasks: true,
			});

			await store.in.exec("schedule-tasks", { id: 0 });

			expect(store.getState().links.byId(1)).to.exist;
		});
		test("detaches move-task scheduling when auto-scheduling is disabled", () => {
			const config = {
				...getData("autoScheduling"),
				tasks: [task(1, 0, "summary"), task(2, 1), task(3)],
				links: [],
				schedule: { auto: true },
			};
			resetState(config);

			const scheduler = (store as any)._modules.get("autoScheduler");
			const spy = vi.spyOn(scheduler, "schedule");

			store.init({ ...config, schedule: { auto: false } });
			spy.mockClear();
			store.in.exec("move-task", { id: 2, target: 3, mode: "after" });

			expect(store.getState().tasks.byId(2).parent).to.eq(0);
			expect(spy).not.toHaveBeenCalled();
		});
		test.each(["undo", "redo"] as const)(
			"does not schedule during %s replay",
			eventSource => {
				resetState({
					...getData("autoScheduling"),
					tasks: [task(1, 0, "summary"), task(9, 1), task(2)],
					links: [
						{
							id: 1,
							source: 1,
							target: 2,
							type: "e2s",
						},
					],
					schedule: { auto: true },
				});
				vi.advanceTimersByTime(1);

				const scheduler = (store as any)._modules.get("autoScheduler");
				const spy = vi
					.spyOn(scheduler, "schedule")
					.mockImplementation(() => {});

				store.in.exec("move-task", {
					id: 2,
					target: 1,
					mode: "child",
					eventSource,
				});
				store.in.exec("update-link", {
					id: 1,
					link: {
						source: 1,
						target: 2,
						type: "e2s",
						lag: 1,
					},
					eventSource,
				});
				store.in.exec("delete-link", {
					id: 1,
					eventSource,
				});

				expect(spy).not.toHaveBeenCalled();
			}
		);
		test("removes a link that becomes invalid after indent-task", () => {
			resetState({
				...getData("autoScheduling"),
				tasks: [task(1, 0, "summary"), task(9, 1), task(2)],
				links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(1);
			expect(store.getState().links.byId(1).id).to.exist;

			// indent-task delegates to move-task ("child" under the previous
			// sibling); this verifies the public action also triggers cleanup.
			store.in.exec("indent-task", { id: 2, mode: true });
			vi.advanceTimersByTime(1);

			expect(store.getState().links.byId(1)).to.be.undefined;
		});
		test("add-link removes only the link that closes the cycle", () => {
			resetState({
				...getData("autoScheduling"),
				tasks: [task(1), task(2), task(3)],
				links: [
					{ id: 1, source: 1, target: 2, type: "e2s" },
					{ id: 2, source: 2, target: 3, type: "e2s" },
				],
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(1);

			// closes a 1 -> 2 -> 3 -> 1 cycle. lib-schedule reports all three
			// links as invalid, but the add-link handler narrows deletion to
			// the link just drawn, leaving the user's existing links intact.
			store.in.exec("add-link", {
				link: { id: 3, source: 3, target: 1, type: "e2s" },
			});
			vi.advanceTimersByTime(1);

			const { links } = store.getState();
			expect(links.byId(1).id).to.exist;
			expect(links.byId(2).id).to.exist;
			expect(links.byId(3)).to.be.undefined;
			expect(links.map(l => l).length).to.eq(2);
		});
		test("can schedule tasks on init", () => {
			const initData = getData("autoScheduling");

			resetState({
				...initData,
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(1);

			const { tasks } = store.getState();

			expect(tasks.byId(4).start).to.deep.eq(tasks.byId(3).end);
			expect(tasks.byId(4).end).to.deep.eq(new Date(2024, 3, 7));
			expect(tasks.byId(5).start).to.deep.eq(tasks.byId(4).end);
			expect(tasks.byId(5).end).to.deep.eq(new Date(2024, 3, 9));
		});
		test("can reschedule dependent tasks on update-task", () => {
			const initData = getData("autoScheduling");

			resetState({
				...initData,
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(1);

			store.in.exec("update-task", {
				id: 3,
				task: {
					start: new Date(2024, 3, 2),
					end: new Date(2024, 3, 6),
				},
			});
			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used

			const { tasks } = store.getState();

			expect(tasks.byId(4).start).to.deep.eq(tasks.byId(3).end);
			expect(tasks.byId(4).start).to.deep.eq(new Date(2024, 3, 6));
			expect(tasks.byId(4).end).to.deep.eq(new Date(2024, 3, 8));
			expect(tasks.byId(5).start).to.deep.eq(tasks.byId(4).end);
			expect(tasks.byId(5).end).to.deep.eq(new Date(2024, 3, 10));
		});
		test("can reschedule tasks on add-task and add-link", () => {
			const initData = getData("autoScheduling");

			resetState({
				...initData,
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(1);

			store.in.exec("add-task", {
				task: {
					id: 6,
					text: "Task 6",
					start: new Date(2024, 3, 2),
					end: new Date(2024, 3, 5),
				},
				mode: "child",
			});

			store.in.exec("add-link", {
				link: {
					id: 10,
					source: 5,
					target: 6,
					type: "e2s",
				},
			});
			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used

			const { tasks } = store.getState();
			expect(tasks.byId(6).start).to.deep.eq(tasks.byId(5).end);
			expect(tasks.byId(6).start).to.deep.eq(new Date(2024, 3, 9));
			expect(tasks.byId(6).end).to.deep.eq(new Date(2024, 3, 12));
		});
		test("can reschedule tasks on update-link", () => {
			const initData = getData("autoScheduling");

			resetState({
				...initData,
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(1);

			store.in.exec("update-link", {
				id: 9,
				link: { type: "e2e" },
			});
			store.in.exec("update-task", {
				id: 4,
				task: {
					start: new Date(2024, 3, 7),
					end: new Date(2024, 3, 9),
				},
			});
			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used

			const { tasks } = store.getState();

			expect(tasks.byId(5).start).to.deep.eq(new Date(2024, 3, 7));
			expect(tasks.byId(5).end).to.deep.eq(new Date(2024, 3, 9));

			store.in.exec("update-link", {
				id: 9,
				link: { type: "e2s" },
			});

			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used
			expect(tasks.byId(5).start).to.deep.eq(new Date(2024, 3, 9));
			expect(tasks.byId(5).end).to.deep.eq(new Date(2024, 3, 11));
		});
		// a cleared lag is lag 0, a minimum: the successor keeps the gap the lag
		// left, but the change still has to reach the scheduler
		test("reschedules on a cleared lag and keeps the gap", () => {
			resetState({
				...getData("autoScheduling"),
				tasks: [task(1), task(2)],
				links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(1);

			store.in.exec("update-link", { id: 1, link: { lag: 2 } });
			vi.advanceTimersByTime(20);
			const { tasks } = store.getState();
			expect(tasks.byId(2).start).to.deep.eq(new Date(2024, 3, 6));

			const scheduler = (store as any)._modules.get("autoScheduler");
			const spy = vi.spyOn(scheduler, "schedule");

			store.in.exec("update-link", { id: 1, link: { lag: "" as any } });
			vi.advanceTimersByTime(20);

			expect(spy).toHaveBeenCalledWith(1, {
				link: 1,
				eventSource: "update-link",
			});
			expect(store.getState().links.byId(1).lag).to.eq(0);
			expect(tasks.byId(2).start).to.deep.eq(new Date(2024, 3, 6));
			expect(tasks.byId(2).end).to.deep.eq(new Date(2024, 3, 8));
		});
		test("does not reschedule when clearing a lag that was never set", () => {
			resetState({
				...getData("autoScheduling"),
				tasks: [task(1), task(2)],
				links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(1);

			const scheduler = (store as any)._modules.get("autoScheduler");
			const spy = vi.spyOn(scheduler, "schedule");

			store.in.exec("update-link", { id: 1, link: { lag: "" as any } });
			vi.advanceTimersByTime(20);

			expect(spy).not.toHaveBeenCalled();
		});
		// a missing lag is stored as 0, so setting or clearing 0 is no change
		test("does not reschedule or recalculate between absent and zero lag", () => {
			resetState({
				...getData("autoScheduling"),
				tasks: [task(1), task(2)],
				links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
				schedule: { auto: true },
				criticalPath: { type: "flexible" },
			});
			vi.advanceTimersByTime(1);

			const scheduler = (store as any)._modules.get("autoScheduler");
			const critical = (store as any)._modules.get("criticalPath");
			const schedule = vi.spyOn(scheduler, "schedule");
			const calculate = vi.spyOn(critical, "calculate");
			expect(store.getState().links.byId(1).lag).to.eq(0);

			store.in.exec("update-link", { id: 1, link: { lag: 0 } });
			vi.advanceTimersByTime(20);

			store.in.exec("update-link", { id: 1, link: { lag: "" as any } });
			vi.advanceTimersByTime(20);
			expect(store.getState().links.byId(1).lag).to.eq(0);

			expect(schedule).not.toHaveBeenCalled();
			expect(calculate).not.toHaveBeenCalled();
		});
		test("can reschedule tasks on delete-link", () => {
			const initData = getData("autoScheduling");

			resetState({
				...initData,
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(1);

			store.in.exec("delete-link", { id: 9 });
			store.in.exec("update-task", {
				id: 4,
				task: {
					start: new Date(2024, 3, 6),
					end: new Date(2024, 3, 8),
				},
			});
			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used

			const { tasks } = store.getState();

			expect(tasks.byId(5).start).to.deep.eq(new Date(2024, 3, 7));
			expect(tasks.byId(5).end).to.deep.eq(new Date(2024, 3, 9));
		});

		test("schedules a one-tick bulk of linked adds correctly", () => {
			resetState({
				...getData(),
				tasks: [
					{
						id: 100,
						text: "S",
						type: "summary",
						parent: 0,
						open: true,
					},
					{
						id: 1,
						text: "T1",
						type: "task",
						parent: 100,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 5),
					},
				],
				links: [],
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(1);

			// add the chain without flushing derived state between synchronous schedules
			for (let i = 2; i <= 4; i++) {
				store.in.exec("add-task", {
					task: {
						id: i,
						text: `T${i}`,
						type: "task",
						parent: 100,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 4),
					},
				});
				store.in.exec("add-link", {
					link: { id: i, source: i - 1, target: i, type: "e2s" },
				});
			}
			vi.advanceTimersByTime(20);

			const { tasks } = store.getState();
			expect(tasks.byId(2).start).to.deep.eq(tasks.byId(1).end);
			expect(tasks.byId(3).start).to.deep.eq(tasks.byId(2).end);
			expect(tasks.byId(4).start).to.deep.eq(tasks.byId(3).end);
		});

		const bulkBase = () => ({
			...getData(),
			tasks: [
				{ id: 100, text: "S", type: "summary", parent: 0, open: true },
				{
					id: 1,
					text: "T1",
					type: "task",
					parent: 100,
					start: new Date(2024, 3, 2),
					end: new Date(2024, 3, 5),
				},
			],
			links: [],
			schedule: { auto: true },
		});
		const addChild = (i: number) =>
			store.in.exec("add-task", {
				task: {
					id: i,
					text: `T${i}`,
					type: "task",
					parent: 100,
					start: new Date(2024, 3, 2),
					end: new Date(2024, 3, 4),
				},
			});

		test("same-tick bulk matches settled incremental scheduling", () => {
			const dates = () =>
				store
					.getState()
					.tasks.toArray()
					.map(t => [t.id, +t.start!, +t.end!]);

			// the reference path flushes derived state after each task and link
			resetState(bulkBase());
			vi.advanceTimersByTime(20);
			for (let i = 2; i <= 5; i++) {
				addChild(i);
				store.in.exec("add-link", {
					link: { id: i, source: i - 1, target: i, type: "e2s" },
				});
				vi.advanceTimersByTime(20);
			}
			const incremental = dates();

			// the comparison path runs the same schedules before one state flush
			resetState(bulkBase());
			vi.advanceTimersByTime(20);
			for (let i = 2; i <= 5; i++) {
				addChild(i);
				store.in.exec("add-link", {
					link: { id: i, source: i - 1, target: i, type: "e2s" },
				});
			}
			vi.advanceTimersByTime(20);

			expect(dates()).to.deep.eq(incremental);
		});

		test("structural edits schedule synchronously", () => {
			resetState(bulkBase());
			vi.advanceTimersByTime(20);

			const sched = (store as any)._modules.get("autoScheduler");
			const spy = vi.spyOn(sched, "schedule");
			for (let i = 2; i <= 6; i++) addChild(i);

			expect(spy).toHaveBeenCalledTimes(5);
			vi.advanceTimersByTime(20);
			expect(spy).toHaveBeenCalledTimes(5);
		});

		test("keeps deadline geometry on tasks a schedule pass patches", () => {
			const deadlined = (id: number, day: number): ITask => ({
				id,
				text: `T${id}`,
				type: "task",
				parent: 0,
				start: new Date(2024, 3, day),
				end: new Date(2024, 3, day + 2),
				deadline: new Date(2024, 3, 9),
			});
			resetState({
				...getData("autoScheduling"),
				tasks: [deadlined(1, 2), deadlined(2, 4)],
				links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
				schedule: { auto: true },
				deadlines: true,
				// fixed bounds keep the scale route quiet, so the pass can patch
				autoScale: false,
				start: new Date(2024, 3, 1),
				end: new Date(2024, 3, 20),
			});
			vi.advanceTimersByTime(20);

			const marker = () =>
				store.getState()._tasks.find(t => t.id === 2)?.$x_deadline;
			expect(marker()).to.be.a("number");

			// a targeted schedule patches only the cascade it touched, so task 2
			// is recomputed while the rest keeps its cached geometry
			store.in.exec("update-task", {
				id: 1,
				task: {
					start: new Date(2024, 3, 3),
					end: new Date(2024, 3, 5),
				},
			});
			vi.advanceTimersByTime(20);

			expect(store.getState().tasks.byId(2).start).to.deep.eq(
				new Date(2024, 3, 5)
			);
			expect(marker()).to.be.a("number");
		});

		test("does not reschedule after auto scheduling is turned off", () => {
			resetState({
				...getData("autoScheduling"),
				tasks: [task(1, 0, "summary"), task(9, 1), task(2)],
				links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(1);

			const scheduled = vi.fn();
			store.in.on("schedule-tasks", scheduled);

			store.init({ schedule: { auto: false } });

			// the same move that removes the link while the module is on
			store.in.exec("move-task", { id: 2, target: 1, mode: "child" });
			vi.advanceTimersByTime(20);

			expect(scheduled).not.toHaveBeenCalled();
			expect(store.getState().links.byId(1).id).to.exist;
		});

		describe("undo and redo", () => {
			// counting passes, not dates: an extra pass is often idempotent,
			// so dates can look right while the redundant cascade still runs

			// counts from this call on, skipping the setup passes
			function countSchedules() {
				const res = { calls: 0 };
				store.in.on("schedule-tasks", () => {
					res.calls++;
				});
				return res;
			}

			function replayAll(action: "undo" | "redo") {
				// bounded in case a replay pushes new entries back on the stack
				for (let i = 0; i < 20; i++) {
					if (!store.getState().history?.[action]) return;
					store.in.exec(action);
					vi.advanceTimersByTime(1);
				}
			}

			function taskDates() {
				return store
					.getState()
					.tasks.toArray()
					.map(({ id, start, end }) => ({ id, start, end }));
			}

			test("does not reschedule when a move is replayed", () => {
				resetState({
					...getData("autoScheduling"),
					tasks: [
						task(1, 0, "summary"),
						task(9, 1),
						task(2),
						task(3),
					],
					links: [{ id: 1, source: 2, target: 3, type: "e2s" }],
					schedule: { auto: true },
					undo: true,
				});
				vi.advanceTimersByTime(1);

				store.in.exec("move-task", { id: 3, target: 1, mode: "child" });
				vi.advanceTimersByTime(1);

				const schedules = countSchedules();
				replayAll("undo");
				replayAll("redo");

				expect(schedules.calls).to.eq(0);
			});

			test("does not reschedule when a link update is replayed", () => {
				resetState({
					...getData("autoScheduling"),
					tasks: [task(1), task(2), task(3)],
					links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
					schedule: { auto: true },
					undo: true,
				});
				vi.advanceTimersByTime(1);

				store.in.exec("update-link", { id: 1, link: { target: 3 } });
				vi.advanceTimersByTime(1);

				const schedules = countSchedules();
				replayAll("undo");
				replayAll("redo");

				expect(schedules.calls).to.eq(0);
			});

			test("does not reschedule when a link restore is replayed", () => {
				resetState({
					...getData("autoScheduling"),
					tasks: [task(1), task(2), task(3)],
					links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
					schedule: { auto: true },
					undo: true,
				});
				vi.advanceTimersByTime(1);

				store.in.exec("delete-link", { id: 1 });
				vi.advanceTimersByTime(1);

				// undo of a deletion replays add-link
				const schedules = countSchedules();
				replayAll("undo");

				expect(schedules.calls).to.eq(0);
				expect(store.getState().links.byId(1).id).to.exist;
			});

			test("does not reschedule when a link deletion is replayed", () => {
				resetState({
					...getData("autoScheduling"),
					tasks: [task(1), task(2), task(3)],
					links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
					schedule: { auto: true },
					undo: true,
				});
				vi.advanceTimersByTime(1);

				store.in.exec("add-link", {
					link: { id: 2, source: 2, target: 3, type: "e2s" },
				});
				vi.advanceTimersByTime(1);

				// undo of an addition replays delete-link
				const schedules = countSchedules();
				replayAll("undo");

				expect(schedules.calls).to.eq(0);
				expect(store.getState().links.byId(2)).to.be.undefined;
			});

			test("does not reschedule when a task addition is replayed", () => {
				resetState({
					...getData("autoScheduling"),
					tasks: [task(1, 0, "summary"), task(9, 1), task(2)],
					links: [],
					schedule: { auto: true },
					undo: true,
				});
				vi.advanceTimersByTime(1);

				store.in.exec("add-task", {
					task: { id: 7, text: "Task 7", type: "task" },
					target: 9,
					mode: "after",
				});
				vi.advanceTimersByTime(1);

				// redo replays add-task, the summary child that triggers scheduling
				const schedules = countSchedules();
				replayAll("undo");
				replayAll("redo");

				expect(schedules.calls).to.eq(0);
				expect(store.getState().tasks.byId(7).parent).to.eq(1);
			});

			test("does not reschedule a copy marked with a history eventSource", () => {
				resetState({
					...getData("autoScheduling"),
					tasks: [task(1, 0, "summary"), task(9, 1), task(2)],
					links: [],
					schedule: { auto: true },
					undo: true,
				});
				vi.advanceTimersByTime(1);

				// history records a copy as delete-task/add-task, so undo and
				// redo never reach this handler. the event is marked by hand
				// to pin the guard, it is not a replay
				const schedules = countSchedules();
				store.in.exec("copy-task", {
					id: 2,
					target: 9,
					mode: "after",
					eventSource: "undo",
				});
				vi.advanceTimersByTime(1);

				expect(schedules.calls).to.eq(0);
			});

			test("runs no scheduling pass over a full undo/redo round trip", () => {
				resetState({
					...getData("autoScheduling"),
					tasks: [
						task(1, 0, "summary"),
						task(9, 1),
						task(2),
						task(3),
						task(4),
					],
					links: [{ id: 1, source: 2, target: 3, type: "e2s" }],
					schedule: { auto: true },
					undo: true,
				});
				vi.advanceTimersByTime(1);

				store.in.exec("update-task", {
					id: 2,
					task: {
						start: new Date(2024, 3, 3),
						end: new Date(2024, 3, 6),
					},
				});
				store.in.exec("add-link", {
					link: { id: 2, source: 3, target: 4, type: "e2s" },
				});
				store.in.exec("move-task", { id: 4, target: 1, mode: "child" });
				vi.advanceTimersByTime(1);

				const beforeUndo = taskDates();

				const schedules = countSchedules();
				replayAll("undo");
				const afterUndo = taskDates();
				replayAll("redo");

				expect(schedules.calls).to.eq(0);
				// replay restores the recorded state and nothing else
				expect(taskDates()).to.deep.eq(beforeUndo);
				expect(afterUndo).to.not.deep.eq(beforeUndo);
				expect(store.getState().links.byId(2).id).to.exist;
			});
		});
	});
	describe("critical path and slack tasks", () => {
		test("can calculate critical path on init", () => {
			const initData = getData("critical");

			resetState({
				...initData,
				criticalPath: { type: "flexible" },
			});

			vi.advanceTimersByTime(1);

			const { tasks, links } = store.getState();

			const critTasks = tasks
				.toArray()
				.filter(t => t.critical)
				.map(t => t.id);
			expect(critTasks).to.deep.eq([1, 10, 11, 12]);

			const critLinks = links
				.map(l => l)
				.filter(l => (l as IGanttLink).critical)
				.map(l => l.id);
			expect(critLinks).to.deep.eq([1, 2]);
		});
		test("calculates the critical path when projectEnd is unset and a task is unscheduled", () => {
			const day = (d: number) => new Date(2024, 3, d);
			const tasks = [
				{
					id: 1,
					text: "Scheduled",
					type: "task",
					parent: 0,
					start: day(2),
					duration: 3,
				},
				{
					id: 2,
					text: "No start",
					type: "task",
					parent: 0,
					duration: 2,
				},
			];

			const data = {
				...getData(),
				tasks,
				links: [],
				unscheduledTasks: true,
				criticalPath: { type: "flexible" },
			};

			expect(() => resetState(data)).to.not.throw();

			expect(store.getState().tasks.byId(1).critical).to.eq(true);
			expect(store.getState().tasks.byId(2).unscheduled).to.eq(true);

			store.init({
				...data,
				schedule: { auto: true },
				projectEnd: day(20),
			});

			expect(() =>
				store.init({
					...data,
					schedule: { auto: false },
					projectEnd: null,
				})
			).to.not.throw();

			expect(store.getState().tasks.byId(1).critical).to.eq(true);
			expect(store.getState().tasks.byId(1).start).to.deep.eq(day(2));
		});
		test("recalculates after a copy, whose summary update is a child", () => {
			resetState({
				...getData("critical"),
				criticalPath: { type: "flexible" },
			});
			vi.advanceTimersByTime(20);

			const cp = (store as any)._modules.get("criticalPath");
			const calculate = vi.spyOn(cp, "calculate");

			store.in.exec("copy-task", { id: 11, mode: "after", target: 12 });
			vi.advanceTimersByTime(20);

			expect(calculate).toHaveBeenCalled();
		});

		// no calendar: the slack bar is measured in raw days, so a bar that is
		// not clamped to the project end spans exactly the computed slack
		test("visible slack equals total slack without calendars", () => {
			resetState({
				...getData("critical"),
				calendars: [],
				projectEnd: new Date(2030, 0, 1),
				criticalPath: { type: "flexible" },
				slack: true,
			});
			vi.advanceTimersByTime(20);

			const { durationUnit, projectEnd } = store.getState();
			const add = getAdder(durationUnit);
			const unclamped = store
				.getState()
				._tasks.filter(
					(t): t is IGanttTask & { $visibleSlack: number } =>
						!!(t as IGanttTask).$visibleSlack &&
						add(
							(t as IGanttTask).end,
							(t as IGanttTask).slack!.totalSlack
						) <= projectEnd
				);

			expect(unclamped.length).to.be.greaterThan(0);
			unclamped.forEach(t => {
				expect(t.$visibleSlack).to.eq(t.slack!.totalSlack);
			});
		});

		test("slack bar geometry stays in sync with slack values", () => {
			resetState({
				...getData("critical"),
				criticalPath: { type: "flexible" },
				slack: true,
			});
			vi.advanceTimersByTime(20);

			const cw = store.getState().cellWidth!;
			const check = () => {
				const withSlack = store
					.getState()
					._tasks.filter(
						(t): t is IGanttTask & { $visibleSlack: number } =>
							!!(t as IGanttTask).$visibleSlack
					);
				expect(withSlack.length).to.be.greaterThan(0);
				withSlack.forEach(g => {
					expect(g.$w_slack).to.eq(g.$visibleSlack * cw);
					expect(g.$x_slack).to.eq(g.$x + g.$w);
				});
			};

			check();
			store.in.exec("update-task", {
				id: 20,
				task: { start: new Date(2024, 3, 2), duration: 3 },
			});
			vi.advanceTimersByTime(20);
			check();
		});
		test("dragging a summary moves subtask slack bars", () => {
			resetState({
				...getData("critical"),
				slack: true,
			});
			vi.advanceTimersByTime(20);

			const { tasks } = store.getState();
			const summary = tasks.byId(3);
			const kids = [30, 31].map(id => tasks.byId(id));
			const before = kids.map(kid => ({
				x: kid.$x,
				slackX: kid.$x_slack,
				slackW: kid.$w_slack,
			}));

			kids.forEach(kid => expect(kid.$x_slack).to.be.a("number"));

			const dx = 80;
			store.in.exec("drag-task", { id: 3, left: summary.$x + dx });

			kids.forEach((kid, i) => {
				expect(kid.$x).to.eq(before[i].x + dx);
				expect(kid.$x_slack).to.eq(before[i].slackX + dx);
				expect(kid.$w_slack).to.eq(before[i].slackW);
				expect(kid.$x_slack).to.eq(kid.$x + kid.$w);
			});
		});
		test("clears published slack geometry after a link-only recalculation", () => {
			resetState({
				...getData("critical"),
				criticalPath: { type: "flexible" },
				slack: true,
			});
			vi.advanceTimersByTime(20);

			const before = store.getState()._tasks.find(t => t.id === 30)!;
			expect(before.$visibleSlack).to.be.a("number");
			expect(before.$x_slack).to.be.a("number");
			expect(before.$w_slack).to.be.a("number");

			store.in.exec("add-link", {
				link: { id: 5, source: 12, target: 30, type: "e2s" },
			});
			vi.advanceTimersByTime(20);

			const after = store.getState()._tasks.find(t => t.id === 30)!;
			expect(after.$visibleSlack).to.be.undefined;
			expect(after.$x_slack).to.be.undefined;
			expect(after.$w_slack).to.be.undefined;
		});
		test("can calculate critical path on update-task", () => {
			const initData = getData("critical");

			resetState({
				...initData,
				criticalPath: { type: "flexible" },
			});

			store.in.exec("update-task", {
				id: 20,
				task: {
					start: new Date(2024, 3, 2),
					duration: 3,
				},
			});

			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used

			const { tasks, links } = store.getState();

			let critTasks = tasks
				.toArray()
				.filter(t => t.critical)
				.map(t => t.id);
			expect(critTasks).to.deep.eq([2, 20, 21, 22]);

			let critLinks = links
				.map(l => l)
				.filter(l => (l as IGanttLink).critical)
				.map(l => l.id);
			expect(critLinks).to.deep.eq([3, 4]);

			store.in.exec("update-task", {
				id: 10,
				task: {
					start: new Date(2024, 3, 2),
					duration: 3,
				},
			});

			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used

			critTasks = tasks
				.toArray()
				.filter(t => t.critical)
				.map(t => t.id);
			expect(critTasks).to.deep.eq([1, 10, 11, 12]);

			critLinks = links
				.map(l => l)
				.filter(l => (l as IGanttLink).critical)
				.map(l => l.id);
			expect(critLinks).to.deep.eq([1, 2]);
		});
		test("critical path stays correct with auto-scheduling on", () => {
			resetState({
				...getData("critical"),
				criticalPath: { type: "flexible" },
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(20);

			store.in.exec("update-task", {
				id: 20,
				task: { start: new Date(2024, 3, 2), duration: 3 },
			});
			vi.advanceTimersByTime(20);

			// shared filtering must preserve the critical set while scheduling is active
			const { tasks, links } = store.getState();
			expect(
				tasks
					.toArray()
					.filter(t => t.critical)
					.map(t => t.id)
			).to.deep.eq([2, 20, 21, 22]);
			expect(
				links
					.map(l => l)
					.filter(l => (l as IGanttLink).critical)
					.map(l => l.id)
			).to.deep.eq([3, 4]);
		});
		test("can calculate critical path on delete-task", () => {
			const initData = getData("critical");

			resetState({
				...initData,
				criticalPath: { type: "flexible" },
			});

			store.in.exec("delete-task", { id: 12 });

			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used

			const { tasks, links } = store.getState();

			let critTasks = tasks
				.toArray()
				.filter(t => t.critical)
				.map(t => t.id);
			expect(critTasks).to.deep.eq([2, 20, 21, 22]);

			let critLinks = links
				.map(l => l)
				.filter(l => (l as IGanttLink).critical)
				.map(l => l.id);
			expect(critLinks).to.deep.eq([3, 4]);

			store.in.exec("delete-task", { id: 21 });

			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used

			critTasks = tasks
				.toArray()
				.filter(t => t.critical)
				.map(t => t.id);
			expect(critTasks).to.deep.eq([1, 10, 11]);

			critLinks = links
				.map(l => l)
				.filter(l => (l as IGanttLink).critical)
				.map(l => l.id);
			expect(critLinks).to.deep.eq([1]);
		});
		test("can calculate critical path on add-task", () => {
			const initData = getData("critical");

			resetState({
				...initData,
				criticalPath: { type: "flexible" },
			});

			store.in.exec("add-task", {
				task: {
					id: 13,
					text: "Task 13",
					start: new Date(2024, 3, 9),
					end: new Date(2024, 3, 13),
				},
				target: 1,
			});

			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used

			const { tasks } = store.getState();

			const critTasks = tasks
				.toArray()
				.filter(t => t.critical)
				.map(t => t.id);
			expect(critTasks).to.deep.eq([1, 10, 11, 12]);
		});
		test("critical path is correct after a one-tick bulk of adds", () => {
			resetState({
				...getData(),
				tasks: [
					{
						id: 100,
						text: "S",
						type: "summary",
						parent: 0,
						open: true,
					},
					{
						id: 1,
						text: "T1",
						type: "task",
						parent: 100,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 5),
					},
				],
				links: [],
				schedule: { auto: true },
				criticalPath: { type: "flexible" },
			});
			vi.advanceTimersByTime(20);

			// the critical-path debounce must observe the final synchronously scheduled positions
			for (let i = 2; i <= 4; i++) {
				store.in.exec("add-task", {
					task: {
						id: i,
						text: `T${i}`,
						type: "task",
						parent: 100,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 4),
					},
				});
				store.in.exec("add-link", {
					link: { id: i, source: i - 1, target: i, type: "e2s" },
				});
			}
			vi.advanceTimersByTime(20);

			const { tasks } = store.getState();
			[1, 2, 3, 4].forEach(id =>
				expect(tasks.byId(id).critical, `task ${id}`).to.eq(true)
			);
		});
		test("can calculate critical path on update-link", () => {
			const initData = getData("critical");

			resetState({
				...initData,
				criticalPath: { type: "flexible" },
			});

			store.in.exec("update-link", {
				id: 1,
				link: { type: "s2s" },
			});

			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used

			const { tasks, links } = store.getState();

			let critTasks = tasks
				.toArray()
				.filter(t => t.critical)
				.map(t => t.id);
			expect(critTasks).to.deep.eq([2, 20, 21, 22]);

			let critLinks = links
				.map(l => l)
				.filter(l => (l as IGanttLink).critical)
				.map(l => l.id);
			expect(critLinks).to.deep.eq([3, 4]);

			store.in.exec("update-link", {
				id: 1,
				link: { type: "e2s" },
			});

			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used

			critTasks = tasks
				.toArray()
				.filter(t => t.critical)
				.map(t => t.id);
			expect(critTasks).to.deep.eq([1, 10, 11, 12]);

			critLinks = links
				.map(l => l)
				.filter(l => (l as IGanttLink).critical)
				.map(l => l.id);
			expect(critLinks).to.deep.eq([1, 2]);
		});
		test("recalculates slack when a link lag is cleared", () => {
			const task = (id: number, day: number, duration: number) => ({
				id,
				text: `Task ${id}`,
				type: "task",
				parent: 0,
				start: new Date(2026, 3, day),
				duration,
			});
			resetState({
				...getData(),
				// C fixes the project end, A → B has slack to lose to a lag
				tasks: [task(1, 6, 2), task(2, 8, 3), task(3, 6, 15)],
				links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
				criticalPath: { type: "flexible" },
				slack: true,
				projectStart: new Date(2026, 3, 6),
			});
			vi.advanceTimersByTime(20);

			const { tasks } = store.getState();
			expect(tasks.byId(2).slack.totalSlack).to.eq(10);

			store.in.exec("update-link", { id: 1, link: { lag: 2 } });
			vi.advanceTimersByTime(20);
			expect(tasks.byId(2).slack.totalSlack).to.eq(8);

			store.in.exec("update-link", { id: 1, link: { lag: "" as any } });
			vi.advanceTimersByTime(20);
			expect(tasks.byId(2).slack.totalSlack).to.eq(10);
		});
		test("can calculate critical path on delete-link", () => {
			const initData = getData("critical");

			resetState({
				...initData,
				criticalPath: { type: "flexible" },
			});

			store.in.exec("delete-link", { id: 2 });

			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used

			const { tasks, links } = store.getState();

			let critTasks = tasks
				.toArray()
				.filter(t => t.critical)
				.map(t => t.id);
			expect(critTasks).to.deep.eq([2, 20, 21, 22]);

			let critLinks = links
				.map(l => l)
				.filter(l => (l as IGanttLink).critical)
				.map(l => l.id);
			expect(critLinks).to.deep.eq([3, 4]);

			store.in.exec("delete-link", { id: 4 });

			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used

			critTasks = tasks
				.toArray()
				.filter(t => t.critical)
				.map(t => t.id);
			expect(critTasks).to.deep.eq([1, 10, 11]);

			critLinks = links
				.map(l => l)
				.filter(l => (l as IGanttLink).critical)
				.map(l => l.id);
			expect(critLinks).to.deep.eq([1]);
		});
		test("slack is not calculated when only criticalPath is set", () => {
			const initData = getData("critical");

			resetState({
				...initData,
				criticalPath: { type: "flexible" },
			});

			vi.advanceTimersByTime(1);

			const { tasks } = store.getState();

			tasks.forEach(task => expect(task.slack).to.be.undefined);
		});
		test("criticalPath is not calculated when only slack is set", () => {
			const initData = getData("critical");

			resetState({
				...initData,
				slack: true,
			});

			vi.advanceTimersByTime(1);

			const { tasks, links } = store.getState();

			tasks.forEach(task => expect(task.critical).to.be.undefined);
			links.forEach(
				link => expect((link as IGanttLink).critical).to.be.undefined
			);
		});
		test("can calculate slack on init", () => {
			const initData = getData("critical");

			resetState({
				...initData,
				slack: true,
			});

			vi.advanceTimersByTime(10);

			const { tasks } = store.getState();

			tasks.forEach(task => {
				expect(task.slack).to.be.an("object");
				expect(task.slack).to.have.property("totalSlack");
				if (
					task.slack.totalSlack > 0 &&
					task.type !== "milestone" &&
					task.type !== "summary"
				) {
					expect(task.$visibleSlack).to.be.a("number");
				} else {
					expect(task.$visibleSlack).to.be.undefined;
				}
			});
		});
		test("can calculate visible slack value based on projectEnd", () => {
			const initData = getData("critical");

			resetState({
				...initData,
				slack: true,
				projectEnd: new Date(2024, 3, 8),
			});

			vi.advanceTimersByTime(1);

			const { tasks } = store.getState();

			expect(tasks.byId(30).slack.totalSlack).to.eq(5);
			expect(tasks.byId(30).$visibleSlack).to.eq(4);
			expect(tasks.byId(31).slack.totalSlack).to.eq(5);
			expect(tasks.byId(31).$visibleSlack).to.eq(2);
		});
		test("can calculate visible slack value based on max tasks end", () => {
			const initData = getData("critical");

			resetState({
				...initData,
				slack: true,
			});

			vi.advanceTimersByTime(1);

			const { tasks } = store.getState();

			expect(tasks.byId(30).slack.totalSlack).to.eq(5);
			expect(tasks.byId(30).$visibleSlack).to.eq(5);
			expect(tasks.byId(31).slack.totalSlack).to.eq(5);
			expect(tasks.byId(31).$visibleSlack).to.eq(3);
		});
		test("can recalculate task slack on task-update", () => {
			const initData = getData("critical");

			resetState({
				...initData,
				slack: true,
			});

			store.in.exec("update-task", {
				id: 30,
				task: {
					start: new Date(2024, 3, 2),
					end: new Date(2024, 3, 6),
				},
			});

			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used

			const { tasks } = store.getState();

			expect(tasks.byId(30).slack.totalSlack).to.eq(3);
			expect(tasks.byId(30).$visibleSlack).to.eq(3);
			expect(tasks.byId(31).slack.totalSlack).to.eq(5);
			expect(tasks.byId(31).$visibleSlack).to.eq(3);

			store.in.exec("update-task", {
				id: 31,
				task: {
					start: new Date(2024, 3, 4),
					end: new Date(2024, 3, 7),
				},
			});

			vi.advanceTimersByTime(20); // wait for calculation as debounce 10ms is used

			expect(tasks.byId(30).slack.totalSlack).to.eq(3);
			expect(tasks.byId(30).$visibleSlack).to.eq(3);
			expect(tasks.byId(31).slack.totalSlack).to.eq(4);
			expect(tasks.byId(31).$visibleSlack).to.eq(2);
		});

		test("critical-path patch preserves _tasks geometry", () => {
			const initData = getData("critical");

			resetState({
				...initData,
				schedule: { auto: true },
				criticalPath: { type: "flexible" },
				slack: true,
			});

			vi.advanceTimersByTime(20);

			const beforeX = (
				store.getState()._tasks.find(t => t.id === 20) as IGanttTask
			).$x;
			expect(beforeX).to.be.a("number");

			store.in.exec("update-task", {
				id: 20,
				task: { start: new Date(2024, 3, 15), duration: 3 },
			});

			vi.advanceTimersByTime(20);

			const { _tasks } = store.getState();
			const after = _tasks.find(t => t.id === 20) as IGanttTask;

			expect(after.$x).to.be.a("number");
			expect(after.$x).to.be.greaterThan(beforeX);
			expect(after.$w).to.be.a("number");

			expect(_tasks.some(t => t.critical)).to.eq(true);
			expect(
				(_tasks.find(t => t.id === 30) as IGanttTask).$visibleSlack
			).to.be.a("number");
		});

		test("same-parent reorder skips scheduling and critical-path recalc", () => {
			resetState({
				...getData("critical"),
				schedule: { auto: true },
				criticalPath: { type: "flexible" },
			});
			vi.advanceTimersByTime(20);

			const before = store
				.getState()
				.tasks.toArray()
				.filter(t => t.critical)
				.map(t => t.id);

			const cp = (store as any)._modules.get("criticalPath");
			const sched = (store as any)._modules.get("autoScheduler");
			const cpSpy = vi.spyOn(cp, "calculate");
			const schedSpy = vi.spyOn(sched, "schedule");

			// all three tasks share a parent, so the move changes only row order
			store.in.exec("move-task", { id: 20, target: 22, mode: "after" });
			vi.advanceTimersByTime(20);

			expect(cpSpy).not.toHaveBeenCalled();
			expect(schedSpy).not.toHaveBeenCalled();

			const after = store
				.getState()
				.tasks.toArray()
				.filter(t => t.critical)
				.map(t => t.id);
			expect(after).to.deep.eq(before);
		});

		test("reparent still triggers scheduling and critical-path recalc", () => {
			resetState({
				...getData("critical"),
				schedule: { auto: true },
				criticalPath: { type: "flexible" },
			});
			vi.advanceTimersByTime(20);

			const cp = (store as any)._modules.get("criticalPath");
			const sched = (store as any)._modules.get("autoScheduler");
			const cpSpy = vi.spyOn(cp, "calculate");
			const schedSpy = vi.spyOn(sched, "schedule");

			store.in.exec("move-task", { id: 20, target: 12, mode: "after" });
			vi.advanceTimersByTime(20);

			expect(store.getState().tasks.byId(20).parent).to.eq(1);
			expect(schedSpy).toHaveBeenCalled();
			expect(cpSpy).toHaveBeenCalled();
		});

		test("keyboard up/down within a parent skips recalc", () => {
			resetState({
				...getData("critical"),
				schedule: { auto: true },
				criticalPath: { type: "flexible" },
			});
			vi.advanceTimersByTime(20);

			const cp = (store as any)._modules.get("criticalPath");
			const sched = (store as any)._modules.get("autoScheduler");
			const cpSpy = vi.spyOn(cp, "calculate");
			const schedSpy = vi.spyOn(sched, "schedule");

			store.in.exec("move-task", { id: 22, mode: "up" });
			vi.advanceTimersByTime(20);

			expect(store.getState().tasks.byId(22).parent).to.eq(2);
			expect(cpSpy).not.toHaveBeenCalled();
			expect(schedSpy).not.toHaveBeenCalled();
		});

		test("a link the scheduler removes skips critical-path recalc", () => {
			resetState({
				...getData("critical"),
				schedule: { auto: true },
				criticalPath: { type: "flexible" },
			});
			vi.advanceTimersByTime(20);

			const linkIds = () => store.getState().links.map(l => l.id);
			const before = linkIds();
			const cp = (store as any)._modules.get("criticalPath");
			const cpSpy = vi.spyOn(cp, "calculate");

			store.in.exec("add-link", {
				link: { source: 2, target: 22, type: "e2s" },
			});
			vi.advanceTimersByTime(20);

			expect(linkIds()).to.deep.eq(before);
			expect(cpSpy).toHaveBeenCalledTimes(1);
		});

		test("same-parent skip is fail-safe under grouping", () => {
			// grouped moves report a synthetic source, so they must bypass the same-parent skip
			const mk = (id: number, s: Date, e: Date): ITask => ({
				id,
				text: `Task ${id}`,
				type: "task",
				parent: 0,
				start: s,
				end: e,
				duration: 2,
			});
			const tasks = [
				mk(1, new Date(2024, 3, 2), new Date(2024, 3, 4)),
				mk(2, new Date(2024, 3, 4), new Date(2024, 3, 6)),
				mk(3, new Date(2024, 3, 6), new Date(2024, 3, 8)),
			];
			resetState({
				...getData(),
				tasks,
				links: [
					{ id: 1, source: 1, target: 2, type: "e2s" },
					{ id: 2, source: 2, target: 3, type: "e2s" },
				],
				schedule: { auto: true },
				criticalPath: { type: "flexible" },
				groupBy: { field: "duration" },
			});
			vi.advanceTimersByTime(20);

			const cp = (store as any)._modules.get("criticalPath");
			const cpSpy = vi.spyOn(cp, "calculate");

			store.in.exec("move-task", { id: 1, target: 3, mode: "after" });
			vi.advanceTimersByTime(20);

			expect(cpSpy).toHaveBeenCalled();
			expect(store.getState().tasks.byId(1).parent).to.eq(0);
			const s = (id: number) =>
				store.getState().tasks.byId(id).start!.getTime();
			expect(s(1)).to.be.lessThan(s(2));
			expect(s(2)).to.be.lessThan(s(3));
		});
	});

	describe("init re-init behavior", () => {
		const extraTask = () => ({
			id: 999,
			text: "Extra",
			parent: 0,
			type: "task",
			start: new Date(2026, 3, 1),
			end: new Date(2026, 3, 2),
		});

		function setup() {
			const data: any = getData();
			data.links = normalizeLinks(data.links);
			const ds = new DataStore(writable);
			const cfg = (tasks: any) => ({ ...data, tasks });
			return { ds, tasks: data.tasks, cfg };
		}

		test("reuses the task tree when tasks are unchanged", () => {
			const { ds, tasks, cfg } = setup();
			ds.init(cfg(tasks));
			const tree1 = ds.getState().tasks;
			ds.init(cfg(tasks));
			expect(ds.getState().tasks).to.equal(tree1);
		});

		test("rebuilds the task tree when tasks change", () => {
			const { ds, tasks, cfg } = setup();
			ds.init(cfg(tasks));
			const tree1 = ds.getState().tasks;
			ds.init(cfg([...tasks, extraTask()]));
			expect(ds.getState().tasks).to.not.equal(tree1);
		});

		test("keeps an active filter through an unrelated re-init", () => {
			const { ds, tasks, cfg } = setup();
			ds.init(cfg(tasks));
			expect(ds.getState().tasks.toArray(true).length).to.be.above(0);

			ds.in.exec("filter-tasks", { filter: () => false } as any);
			expect(ds.getState()._isFiltered).to.equal(true);
			expect(ds.getState().tasks.toArray().length).to.equal(0);

			ds.init(cfg(tasks));
			expect(ds.getState()._isFiltered).to.equal(true);
			expect(ds.getState().tasks.toArray().length).to.equal(0);
		});

		test("resets the filter when new task data arrives", () => {
			const { ds, tasks, cfg } = setup();
			ds.init(cfg(tasks));
			ds.in.exec("filter-tasks", { filter: () => false } as any);
			expect(ds.getState()._isFiltered).to.equal(true);

			ds.init(cfg([...tasks, extraTask()]));
			expect(ds.getState()._isFiltered).to.equal(false);
		});

		test("keeps sort through an unrelated re-init", () => {
			const { ds, tasks, cfg } = setup();
			ds.init(cfg(tasks));
			ds.in.exec("sort-tasks", { key: "text", order: "desc" } as any);
			const order = ds
				.getState()
				.tasks.toArray()
				.map((t: any) => t.id);

			ds.init(cfg(tasks));
			expect(ds.getState()._sort).to.deep.equal([
				{ key: "text", order: "desc" },
			]);
			expect(
				ds
					.getState()
					.tasks.toArray()
					.map((t: any) => t.id)
			).to.deep.equal(order);
		});

		test("resets sort when new task data arrives", () => {
			const { ds, tasks, cfg } = setup();
			ds.init(cfg(tasks));
			ds.in.exec("sort-tasks", { key: "text", order: "desc" } as any);
			expect(ds.getState()._sort).to.not.equal(null);

			ds.init(cfg([...tasks, extraTask()]));
			expect(ds.getState()._sort).to.equal(null);
		});
	});

	describe("partial geometry patch", () => {
		const DAY = 86400000;
		const geom = (s: DataStore) =>
			new Map(
				s.getState()._tasks.map(t => [t.id, `${t.$x}|${t.$w}|${t.$y}`])
			);
		const chain = (n: number) => {
			const tasks: ITask[] = [];
			const links: ILink[] = [];
			let id = 1;
			let lid = 1;
			for (let c = 0; id <= n; c++) {
				const sid = 900000 + c;
				tasks.push({
					id: sid,
					text: `S${c}`,
					type: "summary",
					parent: 0,
					open: true,
				} as ITask);
				let prev: number | null = null;
				for (let k = 0; k < 12 && id <= n; k++, id++) {
					const s = new Date(2024, 0, 1 + ((id * 3) % 200));
					tasks.push({
						id,
						text: `T${id}`,
						type: "task",
						parent: sid,
						start: s,
						end: new Date(s.getTime() + 4 * DAY),
						duration: 4,
					} as ITask);
					if (prev !== null)
						links.push({
							id: lid++,
							source: prev,
							target: id,
							type: "e2s",
						} as ILink);
					prev = id;
				}
			}
			return {
				...getData(),
				tasks,
				links: normalizeLinks(links),
				schedule: { auto: true },
			} as any;
		};

		test("in-bounds edit matches a full rebuild", () => {
			const a = new DataStore(writable);
			a.init(chain(120));
			vi.advanceTimersByTime(50);

			// shift the chain head without changing the scale bounds
			const t = a.getState().tasks.byId(1);
			a.in.exec("update-task", {
				id: 1,
				task: {
					start: new Date(t.start!.getTime() + 8 * DAY),
					duration: 4,
				},
			});
			vi.advanceTimersByTime(50);
			const gA = geom(a);

			// compare the patch against a fresh full rebuild of the same final state
			const baked = a
				.getState()
				.tasks.serialize()
				.map((x: any) => ({ ...x }));
			const b = new DataStore(writable);
			b.init({
				...getData(),
				tasks: baked,
				links: a.getState().links.map((l: any) => ({ ...l })),
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(50);
			const gB = geom(b);

			gB.forEach((v, id) => expect(gA.get(id)).to.eq(v));
		});

		test("out-of-bounds edit falls back to full geometry", () => {
			const a = new DataStore(writable);
			a.init(chain(120));
			vi.advanceTimersByTime(50);

			// capture geometry outside the edited cascade
			const farBefore = a.getState()._tasks.find(t => t.id === 60)!.$x;

			const t = a.getState().tasks.byId(1);
			a.in.exec("update-task", {
				id: 1,
				task: {
					start: new Date(t.start!.getTime() + 4000 * DAY),
					duration: 4,
				},
			});
			vi.advanceTimersByTime(50);

			// expanded scale bounds must reposition tasks outside the edited cascade
			const farAfter = a.getState()._tasks.find(t => t.id === 60)!.$x;
			expect(farAfter).to.not.eq(farBefore);
		});

		test("two same-tick edits both patch geometry", () => {
			// the anchor keeps both edits in bounds so their dirty sets can accumulate
			const mk = (id: number, s: Date, e: Date): ITask => ({
				id,
				text: `T${id}`,
				type: "task",
				parent: 0,
				start: s,
				end: e,
			});
			const data = () => ({
				...getData(),
				links: [],
				tasks: [
					mk(99, new Date(2024, 0, 1), new Date(2024, 6, 1)),
					mk(1, new Date(2024, 1, 1), new Date(2024, 1, 3)),
					mk(2, new Date(2024, 1, 1), new Date(2024, 1, 3)),
				],
			});
			const a = new DataStore(writable);
			a.init(data());
			vi.advanceTimersByTime(50);

			// both pending patches must survive until the shared route pass
			a.in.exec("update-task", {
				id: 1,
				task: {
					start: new Date(2024, 2, 1),
					end: new Date(2024, 2, 3),
				},
			});
			a.in.exec("update-task", {
				id: 2,
				task: {
					start: new Date(2024, 3, 1),
					end: new Date(2024, 3, 3),
				},
			});
			vi.advanceTimersByTime(50);
			const gA = geom(a);

			// compare against a fresh full rebuild
			const baked = a
				.getState()
				.tasks.serialize()
				.map((x: any) => ({ ...x }));
			const b = new DataStore(writable);
			b.init({ ...getData(), links: [], tasks: baked });
			vi.advanceTimersByTime(50);
			const gB = geom(b);

			gB.forEach((v, id) => expect(gA.get(id)).to.eq(v));
		});

		test("same-tick sorting invalidates the pending patch", () => {
			const a = new DataStore(writable);
			a.init(getData("critical"));
			vi.advanceTimersByTime(20);

			a.in.exec("update-task", {
				id: 20,
				task: {
					start: new Date(2024, 3, 2),
					duration: 3,
				},
			});
			a.in.exec("sort-tasks", { key: "id", order: "desc" });

			const immediate = [...geom(a)];
			vi.advanceTimersByTime(1);
			expect(immediate).to.deep.eq([...geom(a)]);
		});

		test("same-tick layout config invalidates the pending patch", () => {
			const a = new DataStore(writable);
			a.init(getData("critical"));
			vi.advanceTimersByTime(20);

			a.in.exec("update-task", {
				id: 20,
				task: {
					start: new Date(2024, 3, 2),
					duration: 3,
				},
			});
			a.init({ cellHeight: 50 });

			const immediate = [...geom(a)];
			vi.advanceTimersByTime(1);
			expect(immediate).to.deep.eq([...geom(a)]);
		});
	});
});
