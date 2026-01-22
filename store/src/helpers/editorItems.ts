import type { TEditorItem, ITask, IData, IDataConfig } from "../types";
import { defaultTaskTypes } from "../taskTypes";

function isSummary(task: Partial<ITask>) {
	return task.type === "summary";
}

function isMilestone(task: Partial<ITask>) {
	return task.type === "milestone";
}

function isSegment(task: Partial<ITask>): boolean {
	return typeof task.parent === "undefined";
}

function isUnscheduled(task: Partial<ITask>, state: IData) {
	return state.unscheduledTasks && task.unscheduled;
}

export function getEditorItems(config?: IDataConfig) {
	const items = defaultEditorItems.map(i => ({ ...i }));
	const typeItem = items.find(item => item.key == "type");
	typeItem.options = config?.taskTypes || defaultTaskTypes;

	return items;
}

export const defaultEditorItems: TEditorItem[] = [
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
		isHidden: task => isSegment(task),
	},
	{
		key: "start",
		comp: "date",
		label: "Start date",
		isHidden: task => isSummary(task),
		isDisabled: isUnscheduled,
	},
	{
		key: "end",
		comp: "date",
		label: "End date",
		isHidden: task => isSummary(task) || isMilestone(task),
		isDisabled: isUnscheduled,
	},
	{
		key: "duration",
		comp: "counter",
		label: "Duration",
		config: {
			min: 1,
		},
		isHidden: task => isSummary(task) || isMilestone(task),
		isDisabled: isUnscheduled,
	},
	{
		key: "progress",
		comp: "slider",
		label: "Progress",
		config: {
			min: 1,
			max: 100,
		},
		isHidden: task => isMilestone(task) || isSegment(task),
	},
	{
		key: "links",
		comp: "links",
		label: "",
		isHidden: task => isSegment(task),
	},
];
