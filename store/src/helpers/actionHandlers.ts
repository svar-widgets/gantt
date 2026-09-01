import type { TID } from "@svar-ui/lib-state";
import type { ILink, IDataHash, ITask, IData } from "../types";
import { IOptionConfig } from "./menuOptions";
import { IButtonConfig } from "./toolbarButtons";

type TTarget = TID | IDataHash | null;

export function handleAction(
	api: any,
	action: string,
	target: TTarget,
	_: any
): void {
	const state = api.getState();
	const selected = state._selected.map((t: ITask) => t.id);
	const hasSelection = selected.length;
	// single-target ops
	const single = ["edit-task", "paste-task", "undo", "redo"];
	// do not sort index-/level-wise
	const avoidSort = ["copy-task", "cut-task"];
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
	// direct children should move/copy with entire branch
	const checkParent = [
		"indent-task:add",
		"move-task:down",
		"move-task:up",
		"copy-task",
		"cut-task",
	];
	const checkLevel: { [k: string]: number } = {
		"indent-task:remove": 2,
	};
	const targetless = !hasSelection && untargeted.includes(action);
	const limit = {
		parent: checkParent.includes(action),
		level: checkLevel[action],
		sort: !avoidSort.includes(action),
	};

	target = target || (hasSelection ? selected[selected.length - 1] : null);
	if (!target && !targetless) return;

	if (action !== "paste-task") api._temp = null;

	if (single.includes(action) || targetless || selected.length === 1) {
		runSingleAction(api, action, target, _);
	} else if (hasSelection) {
		const order = mapOrder(selected, limit, state);
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
	limit: { parent: boolean; level: number; sort: boolean },
	state: IData
): TID[] {
	const { tasks, tree, groupBy } = state;
	let order = selected.map(treeTaskId => {
		let id = treeTaskId;
		if (groupBy?.field) id = tree.byId(id)?.$id || id;
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
	if (limit.sort) {
		order.sort((a, b) => {
			return a.level - b.level || a.index - b.index;
		});
	}
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

	if (op === "copy-task" || op === "cut-task") {
		if (!api._temp) api._temp = [];
		api._temp.push({ id, cut: op === "cut-task" });
		return;
	} else if (op === "paste-task") {
		const { tasks } = api.getState();
		// the clipboard outlives its tasks, any of them can be deleted before the paste
		const clipboard = api._temp?.filter((temp: any) => tasks.byId(temp.id));

		if (clipboard && clipboard.length) {
			const history = api.getHistory();
			// start batch for mass operations
			if (history) history.startBatch();

			const idPairs = new Map<TID, TID>();

			clipboard.forEach((temp: any) => {
				const event = {
					id: temp.id,
					target: id,
					mode: "after",
				};
				exec(temp.cut ? "move-task" : "copy-task", event);
				idPairs.set(temp.id, event.id);
			});

			// if copying tasks, find links between them and copy them too
			if (!clipboard[0].cut) {
				const { links } = api.getState();
				const taskIds = clipboard.map((temp: ILink) => temp.id);
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

				clipboard.forEach((temp: any, i: number) => {
					exec("select-task", {
						id: idPairs.get(temp.id),
						toggle: !!i,
					});
				});
			}

			// end batch for mass operations
			if (history) history.endBatch();
		}
		api._temp = null;
		return;
	} else if (op === "add-task") {
		extraData = {
			task: { type: "task", text: _("New Task") },
			target: id,
			show: true,
			mode: "after",
			select: false,
		};
		data = {};
		select = true;
	} else if (op === "edit-task") {
		op = "show-editor";
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
	if (typeof mode !== "undefined") extraData = { ...extraData, mode };
	data = { ...data, ...extraData };

	exec(op, data);

	if (select)
		exec("select-task", { id: data.id, toggle: !!order, eventSource: op });
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
