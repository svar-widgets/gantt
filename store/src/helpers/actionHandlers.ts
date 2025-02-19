import type { TID } from "wx-lib-state";
import type { GanttDataTree } from "../types";
import { IOptionConfig } from "./menuOptions";
import { IButtonConfig } from "./toolbarButtons";

export function handleAction(
	api: any,
	action: string,
	target: TID | null,
	_: any
): void {
	const { selected, tasks } = api.getState();
	const hasSelection = selected.length;
	const targetless = !hasSelection && action === "add-task";
	// single-target ops
	const single = ["edit-task", "paste-task"];
	// do not sort index-/level-wise
	const avoidMap = ["copy-task", "cut-task"];
	// apply in reverse to maintain relative positions
	const reversed = [
		"copy-task",
		"cut-task",
		"delete-task",
		"indent-task:remove",
		"move-task:down",
	];
	// direct children should move with entire branch
	const checkParent = ["indent-task:add", "move-task:down", "move-task:up"];
	const checkLevel: { [k: string]: number } = {
		"indent-task:remove": 2,
	};
	const limit = {
		parent: checkParent.includes(action),
		level: checkLevel[action],
	};

	target = target || (hasSelection ? selected[selected.length - 1] : null);
	if (!target && !targetless) return;

	if (action !== "paste-task") api._temp = null;

	if (single.includes(action) || targetless || selected.length === 1) {
		runSingleAction(api, action, target, _);
	} else if (hasSelection) {
		const order = avoidMap.includes(action)
			? selected
			: mapOrder(selected, tasks, limit);
		if (reversed.includes(action)) {
			order.reverse();
		}
		order.forEach((id: TID) => runSingleAction(api, action, id, _));
	}
}

function mapOrder(
	selected: TID[],
	tasks: GanttDataTree,
	limit: { parent: boolean; level: number }
): TID[] {
	let order = selected.map(id => {
		const tobj = tasks.byId(id);
		return {
			id,
			level: tobj.$level,
			parent: tobj.parent,
			index: tasks.getIndexById(id),
		};
	});
	if (limit.parent || limit.level) {
		order = order.filter(obj => {
			const ignoreParent = limit.level && obj.level <= limit.level;
			return ignoreParent || !selected.includes(obj.parent);
		});
	}
	order.sort((a, b) => {
		return a.level - b.level || a.index - b.index;
	});
	return order.map(o => o.id);
}

function runSingleAction(api: any, action: string, target: TID, _: any): void {
	let op: string = action.split(":")[0];
	let mode: string | boolean = action.split(":")[1];
	let data: any = { id: target };
	let extraData: any = {};

	if (op == "copy-task" || op == "cut-task") {
		if (!api._temp) api._temp = [];
		api._temp.push({ id: target, cut: op == "cut-task" });
		return;
	} else if (op == "paste-task") {
		if (api._temp && api._temp.length) {
			api._temp.forEach((temp: any) => {
				api.exec(temp.cut ? "move-task" : "copy-task", {
					id: temp.id,
					target,
					mode: "after",
				});
			});
			api._temp = null;
		}
		return;
	} else if (op === "add-task") {
		extraData = {
			task: { type: "task", text: _("New Task") },
			target,
		};
		data = {};
	} else if (op === "edit-task") {
		op = "show-editor";
	} else if (op === "convert-task") {
		op = "update-task";
		extraData = { task: { type: mode } };
		mode = undefined;
	} else if (op === "indent-task") {
		mode = mode === "add";
	}

	if (typeof mode !== "undefined") extraData = { mode, ...extraData };
	data = { ...data, ...extraData };

	api.exec(op, data);
}

export function isHandledAction(
	options: IOptionConfig[] | IButtonConfig[],
	id: TID
): boolean {
	return options.some(op => {
		if ((op as IOptionConfig).data)
			return isHandledAction((op as IOptionConfig).data, id);
		return op.id === id;
	});
}
