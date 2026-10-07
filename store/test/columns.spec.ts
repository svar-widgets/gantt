import { describe, test, expect } from "vitest";
import {
	normalizeColumns,
	defaultColumns,
	getDefaultColumns,
	getDefaultGridWidth,
	getColumnsBySection,
} from "../src/columns";
import { IGanttColumn, IDataConfig, ITask } from "../src/types";
import { DataStore } from "../src/index";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";

const gridColumns: IGanttColumn[] = [
	{ id: "start", header: "Start date", editor: "datepicker" },
	{ id: "end", header: "End date", editor: "datepicker" },
];

function getColumnEditor(id: string, unscheduledTasks: boolean) {
	const [col] = normalizeColumns(
		gridColumns.filter(c => c.id === id),
		() => ({ unscheduledTasks })
	);
	return col.editor as (task: ITask, column: IGanttColumn) => unknown;
}

describe("columns", () => {
	test("normalize column config", () => {
		const columns = normalizeColumns(defaultColumns, () => ({}));

		expect(columns.length).to.eq(4);

		for (const col of columns) {
			if (!col.flexgrow) expect(col.width).to.not.be.undefined;
			expect(col.align).to.not.be.undefined;
		}

		expect(normalizeColumns([], () => ({}))).to.deep.eq([]);
	});

	test("default grid width sums column widths", () => {
		// plain defaults: 183 + 120 + 100 + 37
		expect(getDefaultGridWidth(getDefaultColumns())).to.eq(440);

		// resources adds a column and widens text: 200 + 110 + 120 + 100 + 37
		expect(
			getDefaultGridWidth(getDefaultColumns({ resources: true }))
		).to.eq(567);

		// wbs prepends a column: 80 + 183 + 120 + 100 + 37
		expect(getDefaultGridWidth(getDefaultColumns({ wbs: true }))).to.eq(
			520
		);

		// both: 80 + 200 + 110 + 120 + 100 + 37
		expect(
			getDefaultGridWidth(getDefaultColumns({ resources: [], wbs: true }))
		).to.eq(647);
	});

	test("column section routes columns to grid or subGrid", () => {
		const columns: IGanttColumn[] = [
			{ id: "text", header: "Task", width: 200, flexgrow: 1 },
			{ id: "start", header: "Start", width: 120 },
			{ id: "status", header: "Status", width: 100, section: "subGrid" },
			{ id: "cost", header: "Cost", width: 80, section: "subGrid" },
			{ id: "add-task", header: "Add", width: 37 },
		];

		const normalized = normalizeColumns(columns, () => ({}));

		expect(
			getColumnsBySection(normalized, "grid").map(c => c.id)
		).to.deep.eq(["text", "start", "add-task"]);
		expect(
			getColumnsBySection(normalized, "subGrid").map(c => c.id)
		).to.deep.eq(["status", "cost"]);
		expect(getDefaultGridWidth(normalized)).to.eq(158);
		expect(getDefaultGridWidth(normalized, "subGrid")).to.eq(180);
	});

	test("ensureVisibleFlex applies flexgrow per section", () => {
		const normalized = normalizeColumns(
			[
				{ id: "start", header: "Start", width: 120 },
				{
					id: "status",
					header: "Status",
					width: 100,
					section: "subGrid",
				},
				{ id: "cost", header: "Cost", width: 80, section: "subGrid" },
				{ id: "add-task", header: "Add", width: 37 },
			],
			() => ({})
		);

		expect(
			getColumnsBySection(normalized, "grid").find(c => c.flexgrow)?.id
		).to.eq("start");
		expect(
			getColumnsBySection(normalized, "subGrid").find(c => c.flexgrow)?.id
		).to.eq("status");
	});

	test("ensureVisibleFlex keeps explicit subGrid flexgrow", () => {
		const normalized = normalizeColumns(
			[
				{ id: "text", header: "Task", width: 200, flexgrow: 1 },
				{
					id: "status",
					header: "Status",
					width: 100,
					flexgrow: 1,
					section: "subGrid",
				},
				{ id: "cost", header: "Cost", width: 80, section: "subGrid" },
			],
			() => ({})
		);

		expect(
			getColumnsBySection(normalized, "subGrid")
				.filter(c => c.flexgrow)
				.map(c => c.id)
		).to.deep.eq(["status"]);
	});

	describe("columns datepicker buttons", () => {
		const scheduled = {
			unscheduled: false,
		} as ITask;
		const unscheduled = {
			unscheduled: true,
		} as ITask;

		function getButtons(
			editor: ReturnType<typeof getColumnEditor>,
			task: ITask,
			columnId: string
		) {
			return (
				editor(task, { id: columnId } as IGanttColumn) as {
					config: { buttons: string[] };
				}
			).config.buttons;
		}

		test("includes 'Unschedule' and 'Today' buttons for start column when unscheduledTasks is enabled", () => {
			const editor = getColumnEditor("start", true);

			expect(getButtons(editor, scheduled, "start")).to.deep.eq([
				"Unschedule",
				"today",
			]);
			expect(getButtons(editor, unscheduled, "start")).to.deep.eq([
				"Unschedule",
				"today",
			]);
		});

		test("includes only 'Today' button  for start column when unscheduledTasks is disabled", () => {
			const editor = getColumnEditor("start", false);

			expect(getButtons(editor, scheduled, "start")).to.deep.eq([
				"today",
			]);
			expect(getButtons(editor, unscheduled, "start")).to.deep.eq([
				"today",
			]);
		});

		test("includes only 'Today' button for end column", () => {
			const editorScheduled = getColumnEditor("end", true);
			const editorUnscheduled = getColumnEditor("end", false);

			expect(getButtons(editorScheduled, scheduled, "end")).to.deep.eq([
				"today",
			]);
			expect(getButtons(editorUnscheduled, scheduled, "end")).to.deep.eq([
				"today",
			]);
		});
	});
});

describe("store columns", () => {
	const resources = [
		{ id: "r1", name: "Alex" },
		{ id: "r2", name: "Sophie" },
	];

	// a new array on every call, like Gantt.svelte on any prop change
	const getColumns = (): IGanttColumn[] => [
		{ id: "text", header: "Task" },
		{ id: "start", header: "Start", _template: () => "date" },
		{ id: "resources", header: "Assigned" },
	];

	function getStore(extra?: Partial<IDataConfig>) {
		const config = {
			...getData(),
			resources,
			unscheduledTasks: true,
			columns: getColumns(),
			...extra,
		};
		const store = new DataStore(writable);
		store.init(config);
		return { store, config };
	}

	const byId = (store: DataStore, id: string) =>
		store.getState()._columns.find(c => c.id === id);
	const labels = (store: DataStore) =>
		(byId(store, "resources").options as { label: string }[]).map(
			o => o.label
		);

	test("columns keep the config, _columns get the store parts", () => {
		const { store } = getStore();
		const raw = store.getState().columns.find(c => c.id === "resources");

		expect(raw.options).to.eq(undefined);
		expect(labels(store)).to.deep.eq(["Alex", "Sophie"]);
		expect(byId(store, "resources").getter).to.be.a("function");
	});

	test("resent columns keep the store parts", () => {
		const { store, config } = getStore();
		store.init({ ...config, cellWidth: 200, columns: getColumns() });

		expect(labels(store)).to.deep.eq(["Alex", "Sophie"]);
		expect(byId(store, "resources").getter).to.be.a("function");

		const start = byId(store, "start");
		const row = { unscheduled: true } as ITask;
		expect(start.template(null, row, start)).to.eq("-");
	});

	test("new resources with resent columns give fresh options", () => {
		const { store, config } = getStore();
		store.init({
			...config,
			resources: [{ id: "r3", name: "James" }],
			columns: getColumns(),
		});

		expect(labels(store)).to.deep.eq(["James"]);
	});

	test("set-columns keeps the store parts", () => {
		const { store } = getStore();
		store.in.exec("set-columns", {
			columns: [{ id: "resources", width: 300 }],
		});

		expect(byId(store, "resources").width).to.eq(300);
		expect(labels(store)).to.deep.eq(["Alex", "Sophie"]);
	});
});
