import { DataTree, tempID, TID } from "wx-lib-state";
import type { ITask, IParsedTask, TSort } from "./types";
import { sort } from "./helpers/sort";
import { setSummaryDates } from "./tasks";

export default class GanttDataTree extends DataTree<IParsedTask> {
	private _sort: TSort[];

	constructor(tasks?: Partial<ITask>[]) {
		super();
		this.parse(tasks, 0);
	}
	parse(tasks: Partial<ITask>[], parent: TID): void {
		if (!tasks || !tasks.length) return;
		const preparedTasks = tasks.map(task =>
			this.normalizeTask(task, tasks)
		);
		super.parse(preparedTasks as IParsedTask[], parent);
		if (this._sort) this.sortBranch(this._sort, parent);
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

	normalizeTask(task: Partial<ITask>, tasks?: Partial<ITask>[]): ITask {
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

		if (res.type === "summary" && !(res.start && res.end)) {
			const { start: pStart, end: pEnd } = setSummaryDates(
				{ ...(res as IParsedTask) },
				tasks
			);
			res.start = pStart;
			res.end = pEnd;
		}

		return res;
	}

	getSummaryId(id: TID): TID | null {
		const task = this._pool.get(id);
		if (!task.parent) return null;
		const parent = this._pool.get(task.parent);
		if (parent.type === "summary") return parent.id;
		return this.getSummaryId(parent.id);
	}

	sort(conf: TSort[]) {
		this._sort = conf;
		if (conf) this.sortBranch(conf, 0);
	}
	sortBranch(conf: TSort[], parent?: TID) {
		const data = this._pool.get(parent || 0).data;
		if (data) {
			sort(data, conf);
			data.forEach(item => {
				this.sortBranch(conf, item.id);
			});
		}
	}
	serialize() {
		const out: Partial<ITask>[] = [];
		const kids = this._pool.get(0).data;
		if (kids) toArray(kids, out);
		return out;
	}
}

function toArray(line: Partial<ITask>[], out: Partial<ITask>[]): void {
	line.forEach(a => {
		out.push(a);
		if (a.data) toArray(a.data, out);
	});
}
