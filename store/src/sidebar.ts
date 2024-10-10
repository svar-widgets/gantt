import type { TEditorShape, IDataConfig } from "./types";
import { uid } from "wx-lib-state";

export const defaultEditorShape: TEditorShape[] = [
	{
		key: "text",
		type: "text",
		label: "Name",
		config: {
			placeholder: "Add task name",
			focus: true,
		},
	},
	{
		key: "details",
		type: "textarea",
		label: "Description",
		config: {
			placeholder: "Add description",
		},
	},
	{
		key: "type",
		type: "select",
		label: "Type",
	},
	{
		key: "start",
		type: "date",
		label: "Start date",
	},
	{
		key: "end",
		type: "date",
		label: "End date",
	},
	{
		key: "duration",
		type: "counter",
		label: "Duration",
		config: {
			min: 1,
			max: 100,
		},
	},
	{
		key: "progress",
		type: "slider",
		label: "Progress",
	},
	{
		key: "links",
		type: "links",
	},
];

export function normalizeEditor(state: Partial<IDataConfig>) {
	const editorShape = state.editorShape || defaultEditorShape;

	return editorShape.map((field: any) => {
		if (field.type === "select" && field.key === "type") {
			field.options = state.taskTypes;
		}

		field.id = field.id || uid();
		return field;
	});
}
