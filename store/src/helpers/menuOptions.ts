import type { TID } from "@svar-ui/lib-state";
import type {
	ITask,
	IParsedTask,
	IHistory,
	IData,
	IDataConfig,
	IDataHash,
} from "../types";

export function getMenuOptions(config: IDataConfig) {
	let options = [...defaultMenuOptions];

	return options;
}

export interface IOptionConfig {
	id?: TID;
	separator?: boolean;
	text?: string;
	icon?: string;
	data?: IOptionConfig[];
	type?: string;
	isDisabled?:
		| ((
				task: IParsedTask,
				state: IData,
				target?: TID | IDataHash
		  ) => boolean)
		| ((history: IHistory) => boolean);
	dataFactory?: (obj: any) => IOptionConfig;
	subtext?: string;
	isHidden?: (
		task: IParsedTask,
		state: IData,
		target?: TID | IDataHash
	) => boolean;
}

export function assignChecks<T extends IOptionConfig>(items: T[]): T[] {
	return items.map(item => {
		if (item.data) assignChecks(item.data);

		switch (item.id) {
			case "add-task:before":
			case "move-task:up":
				item.isDisabled = (task, state) => isFirstTask(task, state);
				break;
			case "move-task:down":
				item.isDisabled = (task, state) => isLastTask(task, state);
				break;
			case "indent-task:add":
				item.isDisabled = (task, state) =>
					prevTaskID(task, state) === task.parent;
				break;
			case "indent-task:remove":
				item.isDisabled = (task: IParsedTask) => isRootTask(task);
				break;
		}
		return item;
	});
}

function isRootTask(task: ITask) {
	return task.parent === 0;
}

function isFirstTask(task: ITask, state: IData): boolean {
	const { _tasks } = state;
	return _tasks[0]?.id === task.id;
}
function isLastTask(task: ITask, state: IData): boolean {
	const { _tasks } = state;
	return _tasks[_tasks.length - 1]?.id === task.id;
}
function prevTaskID(task: ITask, state: IData): TID {
	const { _tasks } = state;
	const taskIndex = _tasks.findIndex(t => t.id === task.id);
	return _tasks[taskIndex - 1]?.id ?? task.parent;
}

function isSegment(target: TID | IDataHash): boolean {
	return target && typeof target === "object";
}
function isSingle(s: IData): boolean {
	return !s.selected || s.selected.length < 2;
}

const exclude = (v: any) => (task: ITask) => task.type === v;

export const defaultMenuOptions: IOptionConfig[] = assignChecks<IOptionConfig>([
	{
		id: "add-task",
		text: "Add",
		icon: "wxi-plus",
		data: [
			{ id: "add-task:child", text: "Child task" },
			{ id: "add-task:before", text: "Task above" },
			{ id: "add-task:after", text: "Task below" },
		],
	},
	{ type: "separator" },
	{
		id: "convert-task",
		text: "Convert to",
		icon: "wxi-swap-horizontal",
		dataFactory: type => ({
			id: `convert-task:${type.id}`,
			text: `${type.label}`,
			isDisabled: exclude(type.id),
		}),
	},
	{
		id: "edit-task",
		text: "Edit",
		icon: "wxi-edit",
		isHidden: (t, s, target) => isSegment(target),
	},
	{ type: "separator" },
	{ id: "cut-task", text: "Cut", icon: "wxi-content-cut", subtext: "Ctrl+X" },
	{
		id: "copy-task",
		text: "Copy",
		icon: "wxi-content-copy",
		subtext: "Ctrl+C",
	},
	{
		id: "paste-task",
		text: "Paste",
		icon: "wxi-content-paste",
		subtext: "Ctrl+V",
	},
	{
		id: "move-task",
		text: "Move",
		icon: "wxi-swap-vertical",
		data: [
			{ id: "move-task:up", text: "Up" },
			{ id: "move-task:down", text: "Down" },
		],
	},
	{ type: "separator" },
	{ id: "indent-task:add", text: "Indent", icon: "wxi-indent" },
	{ id: "indent-task:remove", text: "Outdent", icon: "wxi-unindent" },
	{ type: "separator" },
	{
		id: "delete-task",
		icon: "wxi-delete",
		text: "Delete",
		subtext: "Ctrl+D / BS",
		isHidden: (t, s, target) => isSingle(s) && isSegment(target),
	},
]);
