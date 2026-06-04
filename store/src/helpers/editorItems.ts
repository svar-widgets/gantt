import type {
	TEditorItem,
	ITask,
	IData,
	IDataConfig,
	IDataHash,
} from "../types";
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
	const typeItem = items.find(item => item.key === "type");
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
		config: {
			format: "%d-%m-%Y",
		},
		isHidden: task => isSummary(task),
		isDisabled: isUnscheduled,
	},
	{
		key: "end",
		comp: "date",
		label: "End date",
		config: {
			format: "%d-%m-%Y",
		},
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
		batch: "links",
		isHidden: task => isSegment(task),
	},
];

export function filterEditorButtons(
	items: IDataHash[],
	handler?: (item: IDataHash) => boolean
): IDataHash[] {
	if (!items || !Array.isArray(items)) return items;
	return items.filter(handler).map(item => {
		if (item.items && Array.isArray(item.items)) {
			return {
				...item,
				items: filterEditorButtons(item.items, handler),
			};
		}
		return { ...item };
	});
}

const defaultEditorButtons: IDataHash[] = [
	{
		items: [
			{ comp: "icon", icon: "wxi-close", id: "close" },
			{ comp: "spacer" },
			{
				comp: "button",
				type: "danger",
				text: "Delete",
				id: "delete",
			},
			{
				comp: "button",
				type: "primary",
				text: "Save",
				id: "save",
			},
		],
	},
	{
		id: "tabs",
		comp: "tabs",
		css: "wx-toolbar-tabs",
		options: [
			{ id: "general", label: "General" },
			{ id: "links", label: "Links" },
		],
	},
];
export function getEditorButtons(
	config?: IDataConfig & { autoSave: boolean }
): IDataHash[] {
	let buttons = defaultEditorButtons.map(b => ({ ...b }));
	if (config?.autoSave !== false) {
		buttons = filterEditorButtons(
			buttons,
			(item: IDataHash) => item.id !== "save"
		);
	}
	const tabs = buttons.find(item => item.id === "tabs");
	if (tabs?.options) tabs.options = [...tabs.options];
	if (config?.resources) {
		tabs?.options.push({
			id: "resources",
			label: "Resources",
			isHidden: (task: ITask) => isSummary(task) || isSegment(task),
		} as any);
	}
	if (config?.splitTasks) {
		tabs?.options.push({
			id: "segments",
			label: "Segments",
			isHidden: (task: ITask) => !task.segments?.length,
		} as any);
	}
	return buttons;
}
