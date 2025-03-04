import type { GanttColumn } from "./types";
import { format } from "./time";

export function normalizeColumns(columns: GanttColumn[]): GanttColumn[] {
	if (!columns || !columns.length) {
		return [];
	}

	const addTaskColumn = columns.find(col => col.id === "action");
	if (!addTaskColumn) {
		columns = [...columns, expandColumn];
	}

	const resColumns = columns.map<GanttColumn>(a => {
		const align = a.align || "left";
		const isActionColumn = a.id === "action";
		const flexgrow = !isActionColumn && a.flexgrow ? a.flexgrow : null;
		const width = flexgrow ? 1 : a.width || (isActionColumn ? 50 : 120);

		let action;
		if (a.id === "action") action = addTaskColumn ? "add-task" : "expand";

		let template = a.template;
		if (!template) {
			switch (a.id) {
				case "start":
					template = b => format(b, "dd-MM-yyyy");
					break;
				case "end":
					template = b => format(b, "dd-MM-yyyy");
					break;
			}
		}

		return {
			width,
			align,
			header: a.header,
			id: a.id,
			template,
			...(flexgrow && { flexgrow }),
			...(action && { action }),
			cell: a.cell,
			resize: a.resize ?? true,
			sort: a.sort ?? !action,
		};
	});

	return resColumns;
}

export const defaultColumns: GanttColumn[] = [
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
		id: "action",
		header: "",
		width: 50,
		align: "center",
		sort: false,
		resize: false,
	},
];

export const expandColumn: GanttColumn = {
	id: "action",
	header: "",
	align: "center",
	width: 50,
	sort: false,
	resize: false,
};
