import type {
	IData,
	IDataConfig,
	IGanttColumn,
	IResourceColumn,
	ITask,
	TCalendarGetter,
	TColumnSection,
} from "./types";
import type { IColumnEditor } from "@svar-ui/grid-store";
import { setInclusiveEndColumn } from "./inclusiveEnd";
import { isCommunity } from "./package";
import { isManualSummary } from "./tasks";

export function getColumnsBySection(
	columns: IGanttColumn[],
	section: TColumnSection = "grid"
): IGanttColumn[] {
	return columns.filter(c => (c.section || "grid") === section);
}

export const ADD_TASK_COLUMN_WIDTH = 37;
export const DEFAULT_COLUMN_WIDTH = 120;

function getColumnWidth(column: IGanttColumn): number {
	return (
		column.width ||
		(column.id === "add-task"
			? ADD_TASK_COLUMN_WIDTH
			: DEFAULT_COLUMN_WIDTH)
	);
}

const dateFields = ["start", "end", "duration"];

export function getDateEditorButtons(
	columnId: string,
	unscheduledTasks?: boolean
): ("Unschedule" | "today")[] {
	if (columnId === "start" && unscheduledTasks)
		return ["Unschedule", "today"];
	return ["today"];
}

function isCellEditable(task: ITask, columnId: string, state: Partial<IData>) {
	const { type, unscheduled } = task;
	if (type === "summary" && !isManualSummary(task, state))
		return !dateFields.includes(columnId);
	else if ((state.unscheduledTasks && unscheduled) || type === "milestone")
		return !["end", "duration"].includes(columnId);
	return true;
}
function processEditor(
	id: string,
	editor: IGanttColumn["editor"],
	stateGetter: () => Partial<IData>
): IGanttColumn["editor"] {
	if (typeof editor === "function" || !editor) return editor;

	const isDateField = dateFields.includes(id);
	if (!isDateField && id !== "resources") return editor;

	const obj: IColumnEditor =
		typeof editor === "string" ? { type: editor } : editor;
	const config: Record<string, any> = (obj.config ??= {});

	if (!isDateField) return obj;

	return (task, column) => {
		const columnId = String(column?.id ?? "");
		if (!task) return null;
		const state = stateGetter();
		if (!isCellEditable(task, columnId, state)) return null;
		if (obj.type === "datepicker") {
			config.buttons = getDateEditorButtons(
				columnId,
				!task.$placeholder && state.unscheduledTasks
			);
		}
		return obj;
	};
}

// copies without the column, header and editor cell components
export function dropColumnCells(columns: IGanttColumn[]): IGanttColumn[] {
	const omitCell = <T extends Record<string, any>>(obj: T): T => {
		const rest = { ...obj };
		delete rest.cell;
		return rest;
	};

	return columns.map(col => {
		const copy = omitCell(col);
		if (Array.isArray(copy.header))
			copy.header = copy.header.map(line =>
				line && typeof line === "object" ? omitCell(line) : line
			);
		const editor = copy.editor;
		if (editor && typeof editor === "object" && editor.config?.cell)
			copy.editor = { ...editor, config: omitCell(editor.config) };
		return copy;
	});
}

export function getHeaderLength(
	columns: Pick<IGanttColumn, "header" | "hidden">[]
): number {
	let count = 1;
	if (!columns?.length) return count;

	columns.forEach(col => {
		if (col.hidden) return;
		const header = col.header;
		const rows = Array.isArray(header) ? header.length : !header ? 0 : 1;
		count = Math.max(rows, count);
	});

	return count;
}

export function normalizeColumns(
	columns: IGanttColumn[],
	stateGetter: () => Partial<IData>,
	calendarGetter?: TCalendarGetter
): IGanttColumn[] {
	if (!columns || !columns.length) {
		return [];
	}
	// subGrid is pro: its columns are dropped in the open package
	if (isCommunity()) columns = columns.filter(c => c.section !== "subGrid");

	const resColumns = columns.map<IGanttColumn>(a => {
		const align = a.align || "left";
		const isAddTaskColumn = a.id === "add-task";
		const flexgrow = isAddTaskColumn ? null : a.flexgrow;
		const width = flexgrow ? 1 : getColumnWidth(a);

		const editor = a.editor && processEditor(a.id, a.editor, stateGetter);
		let header = Array.isArray(a.header) ? a.header : [a.header];
		header = header.map(line => {
			if (typeof line !== "object") line = { text: line };
			if (line.filter && typeof line.filter !== "object")
				line.filter = { type: line.filter };
			return line;
		});

		const column: IGanttColumn = {
			width,
			align,
			header,
			id: a.id,
			template: a.template,
			_template: a._template,
			...(flexgrow && { flexgrow }),
			...(a.hidden && { hidden: a.hidden }),
			...(a.section && { section: a.section }),
			cell: a.cell,
			resize: a.resize ?? true,
			sort: a.sort ?? !isAddTaskColumn,
			...(editor && { editor }),
			...(a.options && { options: a.options }),
			getter: a.getter,
			setter: a.setter,
		};
		return setInclusiveEndColumn(column, stateGetter, calendarGetter);
	});
	ensureVisibleFlex(resColumns);

	return resColumns;
}

function ensureSectionFlex(
	columns: IGanttColumn[],
	section: TColumnSection
): void {
	const visible = getColumnsBySection(columns, section).filter(
		c => !c.hidden
	);
	if (!visible.length || visible.some(c => c.flexgrow)) return;

	const fill =
		visible.find(c => c.id === "text") ||
		visible.find(c => c.id !== "add-task");

	if (fill) {
		fill.flexgrow = 1;
	}
}

export function ensureVisibleFlex(columns: IGanttColumn[]): void {
	ensureSectionFlex(columns, "grid");
	ensureSectionFlex(columns, "subGrid");
}

export const defaultColumns: IGanttColumn[] = [
	{ id: "text", header: "Task name", width: 183, flexgrow: 1, sort: true },
	{
		id: "start",
		header: "Start date",
		width: 120,
		align: "center",
		sort: true,
	},
	{
		id: "duration",
		header: "Duration",
		width: 100,
		align: "center",
		sort: true,
	},
	{
		id: "add-task",
		header: "Add task",
		width: ADD_TASK_COLUMN_WIDTH,
		align: "center",
		sort: false,
		resize: false,
	},
];


export function getDefaultColumns(
	config: Partial<IDataConfig> = {}
): IGanttColumn[] {
	const columns = defaultColumns.map(c => ({ ...c }));


	return columns;
}

export function getDefaultGridWidth(
	columns: IGanttColumn[],
	section: TColumnSection = "grid"
): number {
	return getColumnsBySection(columns, section).reduce(
		(acc, c) => acc + getColumnWidth(c),
		0
	);
}

export function getResourceColumns(): IResourceColumn[] {
	const columns: IResourceColumn[] = [];
	return columns;
}

export function normalizeResourceColumns(
	columns: IResourceColumn[]
): IResourceColumn[] {
	if (!columns || !columns.length) return [];

	const resColumns = columns.map(c => ({ ...c }));

	if (!resColumns.some(c => c.flexgrow)) {
		const fill = resColumns.find(c => c.id === "name") || resColumns[0];
		if (fill) fill.flexgrow = 1;
	}

	return resColumns;
}
