import type { TID } from "@svar-ui/lib-state";
import type { GanttDataTree, ILink, IDataHash, ITask } from "../types";
import { IOptionConfig } from "./menuOptions";
import { IButtonConfig } from "./toolbarButtons";

type TTarget = TID | IDataHash | null;

export function handleAction(
	api: any,
	action: string,
	target: TTarget,
	_: any
): void {
	const { selected, tasks } = api.getState();
	const hasSelection = selected.length;
	// single-target ops
	const single = [
		"edit-task",
		"paste-task",
		"edit-task:task",
		"edit-task:segment",
	];
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
	// targetless ops
	const untargeted = ["add-task", "undo", "redo"];
	// direct children should move with entire branch
	const checkParent = ["indent-task:add", "move-task:down", "move-task:up"];
	const checkLevel: { [k: string]: number } = {
		"indent-task:remove": 2,
	};
	const targetless = !hasSelection && untargeted.includes(action);
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

		const history = api.getHistory();

		// start batch for mass operations
		if (history) history.startBatch();
		order.forEach((id: TID, i: number) =>
			runSingleAction(api, action, id, _, i)
		);
		// end batch for mass operations
		if (history) history.endBatch();
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

function runSingleAction(
	api: any,
	action: string,
	target: TTarget,
	_: any,
	order?: number
): void {
	const exec = api.exec ? api.exec : api.in.exec;
	let op: string = action.split(":")[0];
	let mode: string | boolean = action.split(":")[1];
	const id = (target as IDataHash)?.id || target;
	let data: any = { id };
	let extraData: any = {};
	let select: boolean = false;

	if (op == "copy-task" || op == "cut-task") {
		if (!api._temp) api._temp = [];
		api._temp.push({ id, cut: op == "cut-task" });
		return;
	} else if (op == "paste-task") {
		if (api._temp && api._temp.length) {
			const history = api.getHistory();
			// start batch for mass operations
			if (history) history.startBatch();

			const idPairs = new Map<TID, TID>();

			api._temp.forEach((temp: any) => {
				const event = {
					id: temp.id,
					target: id,
					mode: "after",
				};
				exec(temp.cut ? "move-task" : "copy-task", event);
				idPairs.set(temp.id, event.id);
			});

			// if copying tasks, find links between them and copy them too
			if (!api._temp[0].cut) {
				const { links } = api.getState();
				const taskIds = api._temp.map((temp: ILink) => temp.id);
				const relevantLinks: ILink[] = [];

				// find links where both source and target ids are in copied tasks
				links.forEach((link: ILink) => {
					if (
						taskIds.includes(link.source) &&
						taskIds.includes(link.target)
					) {
						relevantLinks.push(link);
					}
				});

				relevantLinks.forEach((link: ILink) => {
					exec("add-link", {
						link: {
							source: idPairs.get(link.source),
							target: idPairs.get(link.target),
							type: link.type,
						},
					});
				});

				api._temp.forEach((temp: any, i: number) => {
					exec("select-task", {
						id: idPairs.get(temp.id),
						toggle: !!i,
					});
				});
			}

			// end batch for mass operations
			if (history) history.endBatch();
			api._temp = null;
		}
		return;
	} else if (op === "add-task") {
		extraData = {
			task: { type: "task", text: _("New Task") },
			target: id,
			show: true,
			select: false,
		};
		data = {};
		select = true;
	} else if (op === "edit-task") {
		op = "show-editor";
		if (mode === "segment" && typeof target === "object") {
			extraData = target;
		}
	} else if (op === "convert-task") {
		op = "update-task";
		extraData = { task: { type: mode } };
		mode = undefined;
	} else if (op === "indent-task") {
		mode = mode === "add";
	}
	if (op === "split-task" && typeof target === "object") {
		extraData = target;
	} else if (
		op === "delete-task" &&
		mode === "segment" &&
		typeof target === "object"
	) {
		const task: ITask = api.getTask(id);
		const { segmentIndex } = target;
		const segments = task.segments.filter(
			(s, index) => index !== segmentIndex
		);
		exec("update-task", {
			id,
			task: { segments },
		});
		return;
	}
	if (typeof mode !== "undefined") extraData = { mode, ...extraData };
	data = { ...data, ...extraData };

	exec(op, data);
	if (select) exec("select-task", { id: data.id, toggle: !!order });
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
