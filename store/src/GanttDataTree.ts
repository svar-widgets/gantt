import { DataTree, tempID, TID } from "@svar-ui/lib-state";
import {
	ITask,
	IParsedTask,
	TSort,
	TFilterHandler,
	IGanttColumn,
} from "./types";
import { sort } from "./helpers/sort";
import { deleteFromFiltered, filterTask } from "./helpers/filter";

export default class GanttDataTree extends DataTree<IParsedTask> {
	private _filteredIds: Set<string | number>;

	constructor(tasks?: Partial<ITask>[]) {
		super();
		this.parse(tasks, 0);
	}
	parse(tasks: Partial<ITask>[], parent: TID): void {
		if (!tasks || !tasks.length) return;
		const preparedTasks = tasks.map(task => this.normalizeTask(task));
		super.parse(preparedTasks as IParsedTask[], parent);
	}
	getBranch(id: TID) {
		const task = this._pool.get(id);
		return this._pool.get(task.parent || 0).data;
	}
	contains(id: TID, target: TID): boolean {
		const branch = this._pool.get(id).data;
		let res = false;
		if (branch) {
			for (let i = 0; i < branch.length; i++) {
				if (branch[i].id === target) {
					res = true;
					break;
				}
				if (branch[i].data) {
					res = this.contains(branch[i].id, target);
					if (res) break;
				}
			}
		}
		return res;
	}
	getIndexById(id: TID) {
		return this.getBranch(id).findIndex(task => task.id === id);
	}
	add(task: Partial<ITask>, index: number): IParsedTask {
		const normalizedTask = this.normalizeTask(task);
		super.add(normalizedTask as IParsedTask, index);
		if (this._filteredIds) this._filteredIds.add(normalizedTask.id);
		if (this._filteredIds && task.parent) {
			const pTask = this.byId(task.parent);
			if (this.hasChildItems(pTask)) delete pTask.$empty;
		}
		return normalizedTask as IParsedTask;
	}

	copy(taskObj: ITask, parent: TID, ind: number) {
		const n = this.add({ ...taskObj, id: null, data: null, parent }, ind);
		let ids: Array<TID[]> = [[taskObj.id, n.id]];
		taskObj.data?.forEach((kid: ITask, i: number) => {
			const kIds = this.copy(kid, n.id, i);
			ids = ids.concat(kIds);
		});
		return ids;
	}
	remove(id: TID) {
		const task = this.byId(id);
		if (this._filteredIds)
			deleteFromFiltered(this._filteredIds, id, task.data);
		super.remove(id);
		if (this._filteredIds && task.parent) {
			const pTask = this.byId(task.parent);
			if (!this.hasChildItems(pTask)) pTask.$empty = true;
		}
	}

	normalizeTask(task: Partial<ITask>): ITask {
		const id = task.id || tempID();
		const parentId = task.parent || 0;
		const text = task.text || "";
		const type = task.type || "task";
		const progress = task.progress || 0;
		const details = task.details || "";

		const res: ITask = {
			...task,
			id,
			text,
			parent: parentId,
			progress,
			type,
			details,
		};
		if (task.segments) res.segments = task.segments.map(s => ({ ...s }));

		if (task.segments) res.segments = task.segments.map(s => ({ ...s }));

		return res;
	}

	getSummaryId(id: TID): TID | null;
	getSummaryId(id: TID, all: boolean): TID[] | null;
	getSummaryId(id: TID, all: boolean = false): TID | TID[] | null {
		const task = this._pool.get(id);
		if (!task.parent) return null;
		const parent = this._pool.get(task.parent);
		if (all) {
			let currentId = id;
			let parentId = this.getSummaryId(currentId);
			const parents = [];

			while (parentId) {
				currentId = parentId as TID;
				parents.push(parentId);
				parentId = this.getSummaryId(currentId);
			}
			return parents as TID[];
		}
		if (parent.type === "summary") return parent.id;
		return this.getSummaryId(parent.id);
	}

	sort(conf: TSort[], columns: IGanttColumn[]) {
		if (conf) this.sortBranch(conf, 0, columns);
	}
	sortBranch(conf: TSort[], parent: TID, columns: IGanttColumn[]) {
		const data = this._pool.get(parent || 0).data;
		if (data) {
			sort(data, conf, columns);
			data.forEach(item => {
				this.sortBranch(conf, item.id, columns);
			});
		}
	}
	serialize() {
		const out: Partial<ITask>[] = [];
		const kids = this._pool.get(0).data;
		if (kids) toArray(kids, out);
		return out;
	}
	clear() {
		this.forEach(t => {
			this.remove(t.id);
		});
	}
	filterTree(filter?: TFilterHandler, open?: boolean) {
		if (filter) {
			const root = this._pool.get(0);
			const ids = new Set<TID>();
			filterTask(root, filter, ids, open);
			this._filteredIds = ids;
		} else {
			this._filteredIds = null;
		}
	}
	toArray(all?: boolean) {
		let out = super.toArray();
		if (!all && this._filteredIds) {
			out = out.filter(t => this.isFilteredId(t.id));
		}
		return out;
	}
	isFilteredId(id: TID) {
		return this._filteredIds?.has(id);
	}
	hasChildItems(task: Partial<IParsedTask>) {
		const childCount = task.data?.length;
		if (childCount && this._filteredIds)
			return task.data.some(t => this.isFilteredId(t.id));
		return !!childCount;
	}
}

function toArray(line: Partial<ITask>[], out: Partial<ITask>[]): void {
	line.forEach(a => {
		out.push(a);
		if (a.data) toArray(a.data, out);
	});
}
