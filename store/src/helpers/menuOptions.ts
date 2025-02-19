import type { TID } from "wx-lib-state";
import type { ITask, IGanttTask } from "../types";

export interface IOptionConfig {
	id?: TID;
	separator?: boolean;
	text?: string;
	icon?: string;
	data?: IOptionConfig[];
	type?: string;
	check?: (task: ITask, _tasks?: IGanttTask[]) => boolean | TID;
	dataFactory?: (obj: any) => IOptionConfig;
}

export function assignChecks<T extends IOptionConfig>(items: T[]): T[] {
	return items.map(item => {
		if (item.data) assignChecks(item.data);

		switch (item.id) {
			case "add-task:before":
			case "move-task:up":
				item.check = (task, _tasks) => !isFirstTask(task, _tasks);
				break;
			case "move-task:down":
				item.check = (task, _tasks) => !isLastTask(task, _tasks);
				break;
			case "indent-task:add":
				item.check = (task, _tasks) =>
					prevTaskID(task, _tasks) !== task.parent;
				break;
			case "indent-task:remove":
				item.check = task => !isRootTask(task);
				break;
		}
		return item;
	});
}

function isRootTask(task: ITask) {
	return task.parent === 0;
}

function isFirstTask(task: ITask, _tasks: IGanttTask[]): boolean {
	return _tasks[0]?.id === task.id;
}
function isLastTask(task: ITask, _tasks: IGanttTask[]): boolean {
	return _tasks[_tasks.length - 1]?.id === task.id;
}
function prevTaskID(task: ITask, _tasks: IGanttTask[]): TID {
	const taskIndex = _tasks.findIndex(t => t.id === task.id);
	return _tasks[taskIndex - 1]?.id ?? task.parent;
}

const exclude = (v: any) => (task: ITask) => task.type !== v;

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
		dataFactory: type => {
			return {
				id: `convert-task:${type.id}`,
				text: `${type.label}`,
				check: exclude(type.id),
			};
		},
	},
	{
		id: "edit-task",
		text: "Edit",
		icon: "wxi-edit",
	},
	{ id: "cut-task", text: "Cut", icon: "wxi-content-cut" },
	{ id: "copy-task", text: "Copy", icon: "wxi-content-copy" },
	{ id: "paste-task", text: "Paste", icon: "wxi-content-paste" },
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
	},
]);
