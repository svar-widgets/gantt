import type { TEditorShape } from "./types";

export const defaultEditorItems: TEditorShape[] = [
	{
		key: "text",
		comp: "text",
		label: "Name",
		config: {
			placeholder: "Add task name",
		},
	},
	{
		key: "details",
		comp: "textarea",
		label: "Description",
		config: {
			placeholder: "Add description",
		},
	},
	{
		key: "type",
		comp: "select",
		label: "Type",
	},
	{
		key: "start",
		comp: "date",
		label: "Start date",
	},
	{
		key: "end",
		comp: "date",
		label: "End date",
	},
	{
		key: "duration",
		comp: "counter",
		label: "Duration",
		config: {
			min: 1,
		},
	},
	{
		key: "unscheduled",
		comp: "twostate",
		label: "",
		config: { value: true, text: "Unschedule", textActive: "Schedule" },
	},
	{
		key: "progress",
		comp: "slider",
		label: "Progress",
		config: {
			min: 1,
			max: 100,
		},
	},
	{
		key: "links",
		comp: "links",
		label: "",
	},
];
