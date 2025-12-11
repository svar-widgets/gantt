import type { IGanttColumn, ITask } from "./types";

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

	if (dateFields.includes(id)) {
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
		const flexgrow = !isAddTaskColumn && a.flexgrow ? a.flexgrow : null;
		const width = flexgrow ? 1 : a.width || (isAddTaskColumn ? 50 : 120);

		const editor = a.editor && processEditor(a.id, a.editor);

		return {
			width,
			align,
			header: a.header,
			id: a.id,
			template: a.template,
			_template: a._template,
			...(flexgrow && { flexgrow }),
			cell: a.cell,
			resize: a.resize ?? true,
			sort: a.sort ?? !isAddTaskColumn,
			...(editor && { editor }),
			...(a.options && { options: a.options }),
		};
	});
	return resColumns;
}

export const defaultColumns: IGanttColumn[] = [
	{ id: "text", header: "Task name", flexgrow: 1, sort: true },
	{ id: "start", header: "Start date", align: "center", sort: true },
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
		width: 50,
		align: "center",
		sort: false,
		resize: false,
	},
];
