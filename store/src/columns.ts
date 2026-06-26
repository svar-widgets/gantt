import type {
	IDataConfig,
	IGanttColumn,
	IResourceColumn,
	ITask,
} from "./types";

export const ADD_TASK_COLUMN_WIDTH = 37;

const dateFields = ["start", "end", "duration"];

function isCellEditable(task: ITask, columnId: string) {
	const { type, unscheduled } = task;
	if (unscheduled || type === "summary")
		return !dateFields.includes(columnId);
	else if (type === "milestone")
		return !["end", "duration"].includes(columnId);
	return true;
}
function processEditor(
	id: string,
	editor: IGanttColumn["editor"]
): IGanttColumn["editor"] {
	if (typeof editor === "function") return editor;

	const isDateField = dateFields.includes(id);

	if (isDateField || id === "resources") {
		if (typeof editor === "string") {
			editor = {
				type: editor,
				config: {},
			};
		}
		if (!editor.config) editor.config = {};
		if (editor.type === "datepicker") {
			editor.config.buttons = ["today"];
		}
		if (isDateField)
			return (task: ITask, column: IGanttColumn) => {
				if (isCellEditable(task, column.id)) return editor as any;
				return null;
			};
	}
	return editor;
}

export function normalizeColumns(columns: IGanttColumn[]): IGanttColumn[] {
	if (!columns || !columns.length) {
		return [];
	}

	const resColumns = columns.map<IGanttColumn>(a => {
		const align = a.align || "left";
		const isAddTaskColumn = a.id === "add-task";
		const flexgrow = isAddTaskColumn ? null : a.flexgrow;
		const width = flexgrow
			? 1
			: a.width || (isAddTaskColumn ? ADD_TASK_COLUMN_WIDTH : 120);

		const editor = a.editor && processEditor(a.id, a.editor);
		let header = Array.isArray(a.header) ? a.header : [a.header];
		header = header.map(line => {
			if (typeof line !== "object") line = { text: line };
			if (line.filter && typeof line.filter !== "object")
				line.filter = { type: line.filter };
			return line;
		});

		return {
			width,
			align,
			header,
			id: a.id,
			template: a.template,
			_template: a._template,
			...(flexgrow && { flexgrow }),
			...(a.hidden && { hidden: a.hidden }),
			cell: a.cell,
			resize: a.resize ?? true,
			sort: a.sort ?? !isAddTaskColumn,
			...(editor && { editor }),
			...(a.options && { options: a.options }),
			getter: a.getter,
		};
	});

	ensureVisibleFlex(resColumns);

	return resColumns;
}

export function ensureVisibleFlex(columns: IGanttColumn[]): void {
	if (columns.some(c => c.flexgrow && !c.hidden)) return;
	const fill =
		columns.find(c => c.id === "text" && !c.hidden) ||
		columns.find(c => c.id !== "add-task" && !c.hidden);
	if (fill) fill.flexgrow = 1;
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

export function getDefaultGridWidth(columns: IGanttColumn[]): number {
	return columns.reduce((acc, c) => acc + (c.width ?? 0), 0);
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
