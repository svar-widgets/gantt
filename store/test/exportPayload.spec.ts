import { describe, test, expect, vi } from "vitest";
import { DataStore } from "../src/index";
import { getData } from "./stubs/data";
import { getData as getDemoData } from "../../svelte/demos/data";
import { writable } from "./stubs/writable";
import type { ITask } from "../src/types";

const posted = vi.hoisted(() => ({ data: null as any }));
vi.mock("../src/dom/formPost", () => ({
	postToNewWindow: (_url: string, form: { data: string }) => {
		posted.data = JSON.parse(form.data);
	},
}));

const mon = new Date(2024, 3, 1);
const wed = new Date(2024, 3, 3);
const sat = new Date(2024, 3, 6);

const xlsxKeep = ["$x", "$y", "$w", "$h", "$level"];

function dollarKeys(item: Record<string, any>) {
	return Object.keys(item).filter(key => key[0] === "$");
}

const tasks: ITask[] = [
	{
		id: 1,
		text: "Parent",
		type: "summary",
		parent: 0,
		open: true,
		start: mon,
		end: sat,
	},
	{
		id: 10,
		text: "Child",
		type: "task",
		parent: 1,
		start: mon,
		end: sat,
		segments: [
			{ start: mon, duration: 2, text: "Part A" },
			{ start: wed, duration: 2, text: "Part B" },
		],
	},
];

describe("export payload", () => {
	let store: DataStore;

	function init(next: ITask[] = tasks, config: Record<string, any> = {}) {
		store = new DataStore(writable);
		store.init({
			...getData(),
			wbs: true,
			splitTasks: true,
			...config,
			tasks: next,
			links: config.links ?? [],
		});
	}

	function exportData(format: string, excel?: { visual?: boolean }) {
		store.in.exec("export-data", {
			url: "test",
			format,
			...(excel ? { excel } : {}),
		});
		return posted.data.data.tasks as Record<string, any>[];
	}

	test("xlsx keeps indent and bar fields and drops the nested copy", () => {
		init();
		const rows = exportData("xlsx");
		const parent = rows.find(t => t.id === 1);
		const child = rows.find(t => t.id === 10);

		expect(child.$level).to.eq(2);
		expect(child.parent).to.eq(1);
		expect(child.text).to.eq("Child");
		expect(dollarKeys(child).every(key => xlsxKeep.includes(key))).to.eq(
			true
		);
		expect("data" in child).to.eq(false);
		expect("data" in parent).to.eq(false);
		expect(child.$wbs).to.eq(undefined);

		expect(store.getTask(1).data.map((t: ITask) => t.id)).to.deep.eq([10]);
		expect(store.getTask(10).$wbs).to.eq("1.1");
		expect(store.getTask(10).$level).to.eq(2);
	});

	test("xlsx visual keeps geometry on tasks and segments", () => {
		init();
		const rows = exportData("xlsx", { visual: true });
		const child = rows.find(t => t.id === 10);

		for (const key of xlsxKeep) expect(typeof child[key]).to.eq("number");
		expect(dollarKeys(child).every(key => xlsxKeep.includes(key))).to.eq(
			true
		);
		expect(child.segments).to.have.length(2);
		for (const segment of child.segments) {
			expect(typeof segment.$x).to.eq("number");
			expect(typeof segment.$w).to.eq("number");
			expect(
				dollarKeys(segment).every(key => xlsxKeep.includes(key))
			).to.eq(true);
			expect("data" in segment).to.eq(false);
		}
		expect(child.segments.map((s: ITask) => s.text)).to.deep.eq([
			"Part A",
			"Part B",
		]);
		expect(store.getTask(10).segments[0].text).to.eq("Part A");
		expect(store.getTask(1).data.map((t: ITask) => t.id)).to.deep.eq([10]);
	});

	test("mspx keeps the outline level and drops other $ fields", () => {
		init();
		const rows = exportData("mspx");
		const child = rows.find(t => t.id === 10);

		expect(child.$level).to.eq(2);
		expect(dollarKeys(child)).to.deep.eq(["$level"]);
		expect("data" in child).to.eq(false);
		for (const segment of child.segments) {
			expect(dollarKeys(segment)).to.deep.eq([]);
			expect("data" in segment).to.eq(false);
		}
		expect(store.getTask(10).$level).to.eq(2);
		expect(store.getTask(10).$wbs).to.eq("1.1");
	});

	test("pdf and png drop every $ field and the nested copy", () => {
		init();
		for (const format of ["pdf", "png"]) {
			const rows = exportData(format);
			expect(rows.map(t => t.id)).to.deep.eq([1, 10]);
			for (const task of rows) {
				expect(dollarKeys(task)).to.deep.eq([]);
				expect("data" in task).to.eq(false);
				if (task.segments)
					for (const segment of task.segments) {
						expect(dollarKeys(segment)).to.deep.eq([]);
						expect("data" in segment).to.eq(false);
					}
			}
		}
		expect(store.getTask(1).data.length).to.eq(1);
		expect(store.getTask(1).$level).to.eq(1);
	});

	test("pdf and png send columns without cell components", () => {
		// Vue components are plain objects, so JSON keeps them
		const Cell = { name: "Cell", props: {} };
		init(tasks, {
			columns: [
				{ id: "text", header: "Task", cell: Cell },
				{
					id: "add-task",
					header: { text: "", cell: Cell },
					editor: { type: "combo", config: { cell: Cell } },
				},
			],
		});
		// the grid sets header cells in place on the store's column objects
		store.getState().columns[0].header[0].cell = Cell;

		for (const format of ["pdf", "png"]) {
			exportData(format);
			const columns = posted.data.data.columns;
			expect(columns.map((c: any) => c.id)).to.deep.eq([
				"text",
				"add-task",
			]);
			expect(JSON.stringify(columns)).not.to.contain('"cell"');
			expect(columns[1].editor.type).to.eq("combo");
		}
		expect(store.getState().columns[0].cell).to.eq(Cell);
		expect(store.getState().columns[1].header[0].cell).to.eq(Cell);
	});

	test("a closed branch is still trimmed, and Excel still sends its children", () => {
		init([{ ...tasks[0], open: false }, tasks[1]]);
		const rows = exportData("xlsx");
		const parent = rows.find(t => t.id === 1);
		const child = rows.find(t => t.id === 10);

		expect(child.$level).to.eq(2);
		expect("data" in parent).to.eq(false);
		expect(store.getTask(1).open).to.eq(false);
		expect(store.getTask(1).data.map((t: ITask) => t.id)).to.deep.eq([10]);
	});

	test("the advanced dataset task list shrinks", () => {
		const demo = getDemoData(null, {
			baselines: true,
			splitTasks: true,
			unscheduledTasks: true,
			constraints: true,
			deadlines: true,
		});
		init(demo.tasks, {
			links: demo.links,
			baselines: true,
			splitTasks: true,
			unscheduledTasks: true,
			deadlines: true,
		});

		const before = JSON.stringify(store.serialize()).length;
		const rows = exportData("xlsx", { visual: true });
		const after = JSON.stringify(rows).length;
		const nested = rows.find(t => t.id === 110);

		expect(nested.$level).to.eq(3);
		expect(nested.parent).to.eq(11);
		expect(rows.some(t => "data" in t)).to.eq(false);
		expect(after).to.be.lessThan(before);
		expect(store.getTask(1).data.length).to.be.greaterThan(0);
	});
});
