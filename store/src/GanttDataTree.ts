import { DataTree, tempID, TID } from "wx-lib-state";
import type { ITask, IParsedTask, TSort } from "./types";
import { sort } from "./helpers/sort";
import { getDiffer, getAdder } from "./time";
import { setSummaryDates } from "./tasks";

const dayAdd = getAdder("day");
const dayDiff = getDiffer("day");

export default class GanttDataTree extends DataTree<IParsedTask> {
	private _sort: TSort;

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
	getBounds(start: Date, end: Date) {
		if (!start) start = new Date(3000, 0, 0);
		if (!end) end = new Date(0);

		this._pool.forEach(t => {
			if (!start || t.start <= start) start = t.start;
			if (!end || t.end >= end) end = t.end;
		});

		return { start, end };
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
	update(id: TID, task: Partial<ITask>) {
		this.fillDates(id, task);
		this.normalizeDates(task);

		if (this.byId(id).base_start) {
			this.fillDates(id, task, true);
			this.normalizeDates(task, true);
		}
		super.update(id, task);
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

	private normalizeDates(task: Partial<ITask>, isBaseline?: boolean) {
		const { start, end, duration } = this.getFields(isBaseline);

		if (task.type === "milestone") {
			task[duration] = 0;
			// start is must-have for correcting
		} else if (task[start]) {
			if (!task[duration]) {
				if (task[end]) {
					task[duration] = dayDiff(task[end], task[start]);
				} else {
					task[end] = task[start];
					task[duration] = 0;
				}
			} else if (!task[end]) {
				task[end] = dayAdd(task[start], task[duration]);
			}
		}
	}

	normalizeTask(task: Partial<ITask>, tasks?: Partial<ITask>[]): ITask {
		const id = task.id || tempID();
		const parentId = task.parent || 0;
		const text = task.text || "";
		const type = task.type || "task";
		const progress = task.progress || 0;
		const details = task.details || "";

		this.normalizeDates(task);
		if (task.base_start) this.normalizeDates(task, true);

		const res: ITask = {
			...task,
			id,
			text,
			parent: parentId,
			progress,
			type,
			details,
		};

		this.normalizeDates(res);

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

	private fillDates(id: TID, task: Partial<ITask>, isBaseline = false) {
		const data = this.byId(id);
		task.type = task.type || data.type;

		const { start, end, duration } = this.getFields(isBaseline);

		// for partial task objects - fill related field for calculation
		// changing only start or end will not keep duration
		// duration is set to 1 for incorrect updates
		if (task.type !== "milestone") {
			if (!(data[end] && task[start])) task[start] = data[start];
			if (task[start] && !(task[duration] || task[end])) {
				task[end] = data[end] > task[start] ? data[end] : null;
				if (!task[end]) task[duration] = 1;
			} else if (task[end] && !(task[duration] || task[start])) {
				task[start] = data[start] < task[end] ? data[start] : task[end];
				if (task[start] === task[end]) {
					task[duration] = 1;
					delete task[end];
				}
			} else if (task[duration] && !(task[start] || task[end])) {
				task[start] = data[start];
			}
		} else {
			if (task[end]) delete task[end];
			if (data[end]) delete data[end];
		}
	}

	private getFields(isBaseline: boolean) {
		return {
			start: (isBaseline ? "base_" : "") + "start",
			end: (isBaseline ? "base_" : "") + "end",
			duration: (isBaseline ? "base_" : "") + "duration",
		};
	}
	sort(conf: TSort) {
		this._sort = conf;
		if (conf) this.sortBranch(conf, 0);
	}
	sortBranch(conf: TSort, parent?: TID) {
		const data = this._pool.get(parent || 0).data;
		if (data) {
			sort(data, conf);
			data.forEach(item => {
				this.sortBranch(conf, item.id);
			});
		}
	}
}
