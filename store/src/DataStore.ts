import { Store, EventBus, DataArray, DataRouter, tempID } from "wx-lib-state";
import type { TDataConfig, TWritableCreator, TID } from "wx-lib-state";

import GanttDataTree from "./GanttDataTree";
import {
	calcScales,
	resetScales,
	getMinUnit,
	normalizeZoom,
	zoomScale,
} from "./scales";
import {
	updateTask,
	dragSummary,
	dragSummaryKids,
	setSummaryDates,
} from "./tasks";
import { updateLink } from "./links";
import { normalizeColumns } from "./columns";
import { normalizeEditor } from "./sidebar";
import { getAdder, getDiffer, isCorrectLengthUnit, getUnitStart } from "./time";

import type {
	IData,
	IDataConfig,
	ITask,
	TMethodsConfig,
	GanttColumn,
	IGanttTask,
	IGanttLink,
	ILink,
	IVisibleArea,
	IZoomConfig,
	IParsedTask,
} from "./types";
import { isEqual } from "date-fns";

export default class DataStore extends Store<IData> {
	public in: EventBus<TMethodsConfig, keyof TMethodsConfig>;
	private _router: DataRouter<IData, IDataConfig, TMethodsConfig>;

	constructor(w: TWritableCreator) {
		super(w);

		this._router = new DataRouter(
			super.setState.bind(this),
			// data recalculation dependencies
			[
				// recalculate scales in auto-scale mode
				{
					in: ["tasks", "start", "end", "scales"],
					out: ["_start", "_end"],
					exec: (ctx: TDataConfig) => {
						const { _end, _start, start, end, tasks, scales } =
							this.getState();
						if (!start || !end) {
							const minUnit = getMinUnit(scales).unit;

							const bounds = calcScales(
								start,
								end,
								minUnit,
								tasks
							);
							if (bounds._end != _end || bounds._start != _start)
								this.setState(bounds, ctx);
						} else {
							this.setState({ _start: start, _end: end }, ctx);
						}
					},
				},
				// prepare scale structure for rendering
				{
					in: [
						"_start",
						"_end",
						"cellWidth",
						"scaleHeight",
						"scales",
						"lengthUnit",
					],
					out: ["_scales"],
					exec: (ctx: TDataConfig) => {
						const state = this.getState();
						let { lengthUnit } = state;
						const { _start, _end, cellWidth, scaleHeight, scales } =
							state;

						const minUnit = getMinUnit(scales).unit;
						if (!isCorrectLengthUnit(minUnit, lengthUnit))
							lengthUnit = minUnit;

						const _scales = resetScales(
							_start,
							_end,
							lengthUnit,
							cellWidth,
							scaleHeight,
							scales
						);
						this.setState({ _scales }, ctx);
					},
				},
				// prepare tasks positions
				{
					in: ["_scales", "tasks", "cellHeight", "baselines"],
					out: ["_tasks"],
					exec: (ctx: TDataConfig) => {
						const {
							cellWidth,
							cellHeight,
							tasks,
							_scales,
							baselines,
						} = this.getState();

						const _tasks = tasks
							.toArray()
							.map((task, i) =>
								updateTask(
									task as IGanttTask,
									i,
									cellWidth,
									cellHeight,
									_scales,
									baselines
								)
							);
						this.setState({ _tasks }, ctx);
					},
				},
				// prepare link positions
				{
					in: ["_tasks", "links", "cellHeight"],
					out: ["_links"],
					exec: (ctx: TDataConfig) => {
						const { tasks, links, cellHeight, baselines } =
							this.getState();
						const _links = links
							.map<IGanttLink>(link => {
								const startTask = tasks.byId(link.source);
								const endTask = tasks.byId(link.target);
								return updateLink(
									link as IGanttLink,
									startTask as IGanttTask,
									endTask as IGanttTask,
									cellHeight,
									baselines
								);
							})
							.filter(a => a !== null);
						this.setState({ _links }, ctx);
					},
				},
				// activeTask
				{
					in: ["tasks", "activeTask"],
					out: ["_activeTask"],
					exec: (ctx: TDataConfig) => {
						const { tasks, activeTask } = this.getState();
						this.setState(
							{ _activeTask: tasks.byId(activeTask) || null },
							ctx
						);
					},
				},
				// selection
				{
					in: ["tasks", "selected"],
					out: ["_selected"],
					exec: (ctx: TDataConfig) => {
						const { tasks, selected, _scrollSelected } =
							this.getState();
						const _selected = selected
							.map(id => tasks.byId(id))
							.filter((task: ITask) => !!task);
						const update: Partial<IData> = { _selected };
						if (typeof _scrollSelected == "undefined")
							update._scrollSelected = false;
						this.setState(update, ctx);
					},
				},
				// restore config cellWidth on scale change
				{
					in: ["start", "end"],
					out: ["cellWidth"],
					exec: (ctx: TDataConfig) => {
						const { _cellWidth, cellWidth } = this.getState();
						if (_cellWidth != cellWidth)
							this.setState({ cellWidth: _cellWidth }, ctx);
					},
				},
			],
			// data initializers
			{
				tasks: (v: ITask[]) => new GanttDataTree(v),
				links: (v: ILink[]) => new DataArray(v),
				columns: (v: GanttColumn[]) => normalizeColumns(v),
			}
		);

		const inBus = (this.in = new EventBus());

		/* before data modifications */
		inBus.on("show-editor", ({ id }: TMethodsConfig["show-editor"]) => {
			this.setStateAsync({ activeTask: id });
		});
		inBus.on(
			"select-task",
			({ id, toggle, range, show }: TMethodsConfig["select-task"]) => {
				const { selected, _tasks, activeTask } = this.getState();
				let unselect = false;

				let ids;
				if (selected.length && (toggle || range)) {
					const result = [...selected];

					// in case of Ctrl/Command+Shift, handle as Shift
					if (range) {
						const sourceId = result[result.length - 1];
						const sourceInd = _tasks.findIndex(
							tobj => tobj.id == sourceId
						);
						const targetInd = _tasks.findIndex(
							tobj => tobj.id == id
						);

						const start = Math.min(sourceInd, targetInd);
						const end = Math.max(sourceInd, targetInd) + 1;

						const range = _tasks
							.slice(start, end)
							.map(obj => obj.id);

						range.forEach(selId => {
							if (!result.includes(selId)) result.push(selId);
						});
					} else if (toggle) {
						const selIndex = result.findIndex(selId => selId == id);
						if (selIndex === -1) {
							result.push(id);
						} else {
							unselect = true;
							result.splice(selIndex, 1);
						}
					}

					ids = result;
				} else {
					ids = [id];
				}
				this.setStateAsync({
					selected: ids,
					_scrollSelected: !!show,
				});

				if (!unselect && activeTask && activeTask != id) {
					inBus.exec("show-editor", { id });
				}
			}
		);
		inBus.on("delete-link", ({ id }: TMethodsConfig["delete-link"]) => {
			const { links } = this.getState();
			links.remove(id);
			this.setStateAsync({ links });
		});
		inBus.on("update-link", (ev: TMethodsConfig["update-link"]) => {
			const { links } = this.getState();
			const { id, link } = ev;

			links.update(id, link as ILink);
			this.setStateAsync({ links });

			ev.link = links.byId(id);
		});
		inBus.on("add-link", (ev: TMethodsConfig["add-link"]) => {
			const { link } = ev;
			const { links } = this.getState();

			if (!link.source || !link.target) return;
			if (!link.type) link.type = "e2s";

			link.id = link.id || tempID();

			links.add(link as ILink);
			this.setStateAsync({ links });

			ev.id = link.id;
			ev.link = links.byId(link.id);
		});

		let source: TID = null; //stable task parent until final call
		inBus.on("move-task", (ev: TMethodsConfig["move-task"]) => {
			const { tasks } = this.getState();
			let { mode, target } = ev;
			const { id, inProgress } = ev;
			const task = tasks.byId(id);

			if (typeof inProgress == "undefined") ev.source = task.parent;
			else ev.source = source = source ?? task.parent;

			if (inProgress === false) {
				// end of dnd move
				task.$reorder = false;
				tasks.update(task.id, task); //[FIXME] repaint signal
				this.setState({ tasks });
				source = null;
				return;
			}
			if (target === id || tasks.contains(id, target)) {
				ev.skipProvider = true;
				return;
			}

			if (mode === "up" || mode === "down") {
				const parent = tasks.getBranch(id);
				let taskIndex = tasks.getIndexById(id);

				if (mode === "up") {
					const isRootBranch = task.parent === 0;
					if (taskIndex === 0 && isRootBranch) {
						ev.skipProvider = true;
						return;
					}
					taskIndex -= 1;
					mode = "before";
				} else if (mode === "down") {
					const isLastIndex = taskIndex === parent.length - 1;
					const isRootBranch = task.parent === 0;

					if (isLastIndex && isRootBranch) {
						ev.skipProvider = true;
						return;
					}
					taskIndex += 1;
					mode = "after";
				}

				// expected target
				target =
					(parent[taskIndex] && parent[taskIndex].id) || task.parent;

				if (target) {
					const targetBranch = tasks.getBranch(target);
					let targetIndex = tasks.getIndexById(target);
					let targetTask = targetBranch[targetIndex];

					// check for branches
					if (targetTask.data) {
						if (mode === "before") {
							if (targetTask.parent === task.parent) {
								// return deepest branch if the task is being moved upwards
								while (targetTask.data) {
									if (!targetTask.open)
										inBus.exec("open-task", {
											id: targetTask.id,
											mode: true,
										});

									targetTask =
										targetTask.data[
											targetTask.data.length - 1
										];
								}

								target = targetTask.id;
							}
						} else if (mode === "after") {
							let targetParent;
							if (targetTask.parent === task.parent) {
								// target is on the same level - add it as the first child to the target branch
								targetParent = targetTask;
								targetTask = targetTask.data[0];
								target = targetTask.id;

								mode = "before";
							} else {
								if (targetBranch.length - 1 !== targetIndex) {
									targetParent = targetTask;
									targetIndex += 1;
									targetTask = targetBranch[targetIndex];

									// target is on a lower level - add it as the first child to the target branch
									if (
										task.$level > targetTask.$level &&
										targetTask.data
									) {
										targetParent = targetTask;
										targetTask = targetTask.data[0];
										target = targetTask.id;

										mode = "before";
									} else {
										target = targetTask.id;
									}
								}
							}

							if (targetParent && !targetParent.open)
								inBus.exec("open-task", {
									id: targetParent.id,
									mode: true,
								});
						}
					}

					const oldSummary = tasks.getSummaryId(task.id);

					tasks.move(id, mode, target);

					const newSummary = tasks.getSummaryId(id);
					if (oldSummary != newSummary) {
						if (oldSummary)
							this.resetSummaryDates(oldSummary, "move-task");
						if (newSummary)
							this.resetSummaryDates(newSummary, "move-task");
					}
				}
			} else {
				const targetTask = tasks.byId(target);

				//prevent moving into itself, copy-paste
				let tobj = targetTask;
				let isDirectDescendant = false;
				while (tobj.$level > task.$level) {
					tobj = tasks.byId(tobj.parent);
					if (tobj.id === id) isDirectDescendant = true;
				}
				if (isDirectDescendant) return;

				const oldSummary = tasks.getSummaryId(task.id);

				tasks.move(id, mode, target);

				// [FIXME] in lib-state
				// indent-outdent operations: tasks need to be
				// explicitely updated to be re-painted in UI
				// indent: update source task; outdent: update target
				tasks.update(id, { $level: task.$level });
				tasks.update(target, targetTask);

				if (mode == "child") {
					let tobj = targetTask;
					while (tobj.id !== 0 && !tobj.open) {
						inBus.exec("open-task", {
							id: tobj.id,
							mode: true,
						});
						tobj = tasks.byId(tobj.parent);
					}
				}

				const newSummary = tasks.getSummaryId(id);
				if (oldSummary != newSummary) {
					if (oldSummary)
						this.resetSummaryDates(oldSummary, "move-task");
					if (newSummary)
						this.resetSummaryDates(newSummary, "move-task");
				}
			}

			if (inProgress)
				//smooth dnd requires sync calculations
				this.setState({ tasks });
			else this.setStateAsync({ tasks });

			ev.target = target;
			ev.mode = mode;
		});

		inBus.on("drag-task", (ev: TMethodsConfig["drag-task"]) => {
			const { id, width, left, top, inProgress } = ev;
			const state = this.getState();
			const { tasks, _tasks, _selected, _scales, cellWidth } = state;

			const update: Partial<IData> = { _tasks, _selected };

			const task = tasks.byId(id);
			if (typeof width !== "undefined") {
				task.$w = width;
				dragSummary(tasks, task, _scales, cellWidth);
			}
			if (typeof left !== "undefined") {
				if (task.type === "summary") {
					dragSummaryKids(task, left - task.$x);
				}
				task.$x = left;
				dragSummary(tasks, task, _scales, cellWidth);
			}
			if (typeof top !== "undefined") {
				task.$y = top + 4;
				task.$reorder = inProgress;
			}

			if (typeof width !== "undefined") task.$w = width;
			if (typeof left !== "undefined") task.$x = left;
			if (typeof top !== "undefined") {
				task.$y = top + 4;
				task.$reorder = inProgress;
			}

			// we need not calculate task position,
			// but we need to recalculate things which depends on task positions
			this.setState(update);
		});
		inBus.on("update-task", (ev: TMethodsConfig["update-task"]) => {
			const { id, task, eventSource } = ev;
			let diff = ev.diff;
			const { tasks, _scales } = this.getState();

			if (
				eventSource === "add-task" ||
				eventSource === "copy-task" ||
				eventSource === "move-task" ||
				eventSource === "update-task" ||
				eventSource === "delete-task"
			) {
				tasks.update(id, task);
				return;
			}

			const minUnit = _scales.lengthUnit;

			const adder = getAdder(minUnit);
			const differ = getDiffer(minUnit);

			const t = tasks.byId(id);

			if (diff) {
				//dnd
				if (task.start) task.start = adder(task.start, diff);
				if (task.end) task.end = adder(task.end, diff);
			}

			if (task.start && task.end) {
				if (
					!isEqual(task.start, t.start) ||
					!isEqual(task.end, t.end)
				) {
					if (t.type == "summary" && t.data?.length) {
						if (!diff) {
							diff = differ(task.start, t.start);
							// summary dates must be changed equally
							if (differ(task.end, t.end) !== diff) return;
						}
						this.moveSummaryKids(
							t,
							date => adder(date, diff),
							"update-task"
						);
					}
				}
			} //summary dates must be changed both
			else if (
				t.type == "summary" &&
				((task.start && !task.end) ||
					(task.end && !task.start) ||
					task.duration)
			)
				return;

			tasks.update(id, task);

			if (task.type === "summary" && t.type !== "summary") {
				this.resetSummaryDates(id, "update-task");
			}

			const summary = tasks.getSummaryId(id);
			if (summary) {
				this.resetSummaryDates(summary, "update-task");
			}

			this.setStateAsync({ tasks });

			ev.task = tasks.byId(id);
		});

		inBus.on("add-task", (ev: TMethodsConfig["add-task"]) => {
			const { tasks, _scales, baselines } = this.getState();
			const { target, mode, task } = ev;

			let ind = -1;
			let parent;
			let targetObj;

			if (target) {
				targetObj = tasks.byId(target);
				if (mode == "child") {
					parent = targetObj;
					task.parent = parent.id;
				} else {
					if (targetObj.parent !== null) {
						parent = tasks.byId(targetObj.parent);
						task.parent = parent.id;
					}
					ind = tasks.getIndexById(target);
					if (mode == "after") ind += 1;
				}
			} else if (task.parent) parent = tasks.byId(task.parent);

			if (!task.start) {
				if (parent?.start)
					task.start = new Date(parent.start.valueOf());
				else if (targetObj)
					task.start = new Date(targetObj.start.valueOf());
				else {
					const branch = tasks.getBranch(0);
					let start;
					if (branch.length) {
						const task = branch[branch.length - 1];
						if (!task.$skip) {
							const d = new Date(task.start.valueOf());
							if (_scales.start <= d) start = d;
						}
					}
					task.start = start || getAdder("day")(_scales.start, 1);
				}
				task.duration = 1;

				if (baselines) {
					task.base_start = task.start;
					task.base_duration = task.duration;
				}
			}

			const newTask = tasks.add(task, ind);

			if (parent) {
				while (parent && parent.id) {
					inBus.exec("open-task", {
						id: parent.id,
						mode: true,
					});
					parent = tasks.byId(parent.parent);
				}
			}

			ev.id = newTask.id;

			const summary = tasks.getSummaryId(newTask.id);
			if (summary) {
				this.resetSummaryDates(summary, "add-task");
			}

			this.setStateAsync({ tasks });

			inBus.exec("select-task", { id: newTask.id });
			inBus.exec("show-editor", { id: newTask.id });

			ev.id = newTask.id;
			ev.task = newTask;
		});

		inBus.on("delete-task", (ev: TMethodsConfig["delete-task"]) => {
			const { id } = ev;
			const { tasks, links, selected } = this.getState();
			ev.source = tasks.byId(id).parent;

			const summary = tasks.getSummaryId(id);

			const toRemove = [id];
			tasks.eachChild(t => toRemove.push(t.id), id);
			links.filter(a => {
				return !(
					toRemove.includes(a.source) || toRemove.includes(a.target)
				);
			});

			tasks.remove(id);

			if (summary) {
				this.resetSummaryDates(summary, "delete-task");
			}

			const update: Partial<IData> = { tasks, links };
			if (selected.includes(id)) {
				update.selected = selected.filter(sel => sel !== id);
			}

			this.setStateAsync(update);
		});

		inBus.on(
			"indent-task",
			({ id, mode }: TMethodsConfig["indent-task"]) => {
				const { tasks } = this.getState();
				if (mode) {
					// Increase indentation
					const parent = tasks.getBranch(id);
					const targetTask = parent[tasks.getIndexById(id) - 1];

					if (targetTask)
						inBus.exec("move-task", {
							id,
							mode: "child",
							target: targetTask.id,
						});
				} else {
					// Decrease indentation
					const task = tasks.byId(id);
					const targetTask = tasks.byId(task.parent);

					if (targetTask && targetTask.parent !== null)
						inBus.exec("move-task", {
							id,
							mode: "after",
							target: task.parent,
						});
				}
			}
		);

		inBus.on("copy-task", (ev: TMethodsConfig["copy-task"]) => {
			const { id, target, mode, eventSource } = ev;
			if (eventSource === "copy-task") return;

			const { tasks, links } = this.getState();
			if (tasks.contains(id, target)) {
				ev.skipProvider = true;
				return;
			}

			const oldSummary = tasks.getSummaryId(id);
			const newSummary = tasks.getSummaryId(target);

			let ind = tasks.getIndexById(target);
			if (mode == "before") ind -= 1;

			const origin = tasks.byId(id);
			const idPairs = tasks.copy(
				origin,
				tasks.byId(target).parent,
				ind + 1
			);

			ev.source = ev.id;
			ev.id = idPairs[0][1];
			if (origin.lazy) ev.lazy = true;

			if (oldSummary != newSummary && newSummary)
				this.resetSummaryDates(newSummary, "copy-task");

			let linkCopies: ILink[] = [];
			for (let i = 1; i < idPairs.length; i++) {
				const [id, newId] = idPairs[i];
				links.forEach(link => {
					if (link.source === id) {
						const l = { ...link };
						delete l.target;
						linkCopies.push({
							...l,
							source: newId,
						});
					} else if (link.target === id) {
						const l = { ...link };
						delete l.source;
						linkCopies.push({
							...l,
							target: newId,
						});
					}
				});
			}

			linkCopies = linkCopies.reduce((arr, l) => {
				const match = arr.findIndex(r => r.id === l.id);
				if (match > -1) arr[match] = { ...arr[match], ...l };
				else arr.push(l);
				return arr;
			}, []);

			for (let i = 1; i < idPairs.length; i++) {
				const [id, newId] = idPairs[i];
				const copy = tasks.byId(newId);

				inBus.exec("copy-task", {
					source: id,
					id: newId,
					lazy: !!copy.lazy,
					eventSource: "copy-task",
					target: copy.parent,
					mode: "child",
				});
			}
			// relink copied branch links
			linkCopies.forEach(link => {
				inBus.exec("add-link", {
					link: {
						source: link.source,
						target: link.target,
						type: link.type,
					},
				});
			});

			this.setStateAsync({ tasks });
		});

		inBus.on("open-task", ({ id, mode }: TMethodsConfig["open-task"]) => {
			const { tasks } = this.getState();
			const task = tasks.byId(id);

			if (task.lazy) inBus.exec("request-data", { id: task.id });
			else {
				tasks.toArray().forEach(t => (t.$y = 0));
				tasks.update(id, { open: mode });
				this.setState({ tasks });
			}
		});

		inBus.on(
			"scroll-chart",
			({ left, top }: TMethodsConfig["scroll-chart"]) => {
				if (!isNaN(left)) {
					const d = this.calcScaleDate(left);
					this.setState({ scrollLeft: left, _scaleDate: d });
				}
				if (!isNaN(top)) this.setState({ scrollTop: top });
			}
		);

		inBus.on("render-data", (ev: TMethodsConfig["render-data"]) => {
			this.setState({ area: ev });
		});

		inBus.on("provide-data", (ev: TMethodsConfig["provide-data"]) => {
			const { tasks, links } = this.getState();
			const parent = tasks.byId(ev.id);

			if (parent.lazy) {
				parent.lazy = false;
				parent.open = true;
			} else parent.data = [];

			tasks.parse(ev.data.tasks, ev.id);
			// fixme: DataArray needs the parse() method
			this.setStateAsync({
				tasks,
				links: new DataArray(links.map(l => l).concat(ev.data.links)),
			});
		});

		inBus.on(
			"zoom-scale",
			({ dir, offset }: TMethodsConfig["zoom-scale"]) => {
				const { zoom, cellWidth, _cellWidth, scrollLeft } =
					this.getState();
				const pointerX = offset + scrollLeft;
				const date = this.calcScaleDate(pointerX);
				let w = cellWidth;
				if (dir < 0) w = _cellWidth || cellWidth;
				const width = w + dir * 50; // 50px is a zoom step
				const currentLevel = zoom.levels[zoom.level];
				const isExpanded =
					dir < 0 && cellWidth > currentLevel.maxCellWidth;
				if (
					width < currentLevel.minCellWidth ||
					width > currentLevel.maxCellWidth ||
					isExpanded
				) {
					if (!this.changeScale(zoom, dir)) return;
				} else {
					this.setState({ cellWidth: width, _cellWidth: width });
				}

				const { _scales, _start, cellWidth: cw } = this.getState();
				const start = getUnitStart(_scales.minUnit, _start);
				const num = _scales.diff(date, start, "hour");
				if (typeof offset === "undefined") offset = cw;
				let newScrollLeft = Math.round(num * cw) - offset;
				if (newScrollLeft < 0) {
					newScrollLeft = 0;
				}

				this.setState({
					scrollLeft: newScrollLeft,
					_scaleDate: date,
					_zoomOffset: offset,
				});
			}
		);

		inBus.on(
			"expand-scale",
			({ minWidth }: TMethodsConfig["expand-scale"]) => {
				const {
					_start,
					_scales,
					start,
					end,
					_end,
					cellWidth,
					_scaleDate,
					_zoomOffset,
				} = this.getState();
				const adder = getAdder(_scales.minUnit);

				let width = _scales.width;
				if (start && end) {
					if (width < minWidth && width) {
						const k = minWidth / width;
						this.setState({
							cellWidth: cellWidth * k,
						});
					}
					return true;
				}
				let step = 0;
				while (width < minWidth) {
					width += cellWidth;
					step++;
				}

				const startStep = step ? (end ? -step : -1) : 0;
				const newStart = start || adder(_start, startStep);
				let newScroll = 0;
				if (_scaleDate) {
					const num = _scales.diff(_scaleDate, newStart, "hour");
					newScroll = Math.max(
						0,
						Math.round(num * cellWidth) - (_zoomOffset || 0)
					);
				}

				this.setState({
					_start: newStart,
					_end: end || adder(_end, step),
					scrollLeft: newScroll,
				});
			}
		);
		inBus.on(
			"sort-tasks",
			({ key, order }: TMethodsConfig["sort-tasks"]) => {
				const { tasks } = this.getState();
				const _sort = { key, order };
				tasks.sort(_sort);
				this.setState({ _sort, tasks });
			}
		);
	}

	init(state: Partial<IDataConfig>) {
		const update: Partial<IDataConfig> = this.getState().area
			? {}
			: {
					scrollLeft: 0,
					scrollTop: 0,
					area: { from: 0, start: 0, end: 0 },
				};

		if (state.cellWidth) state._cellWidth = state.cellWidth;
		state._sort = null;
		state.editorShape = normalizeEditor(state);
		this._router.init({
			selected: [],
			...update,
			...state,
		});

		if (state.zoom) {
			const res = normalizeZoom(
				state.zoom,
				state.scales,
				state.cellWidth
			);
			this.setState({
				zoom: res._zoom,
				cellWidth: res.cellWidth,
				_cellWidth: res.cellWidth,
				scales: res.scales,
			});
		}
	}
	setState(state: Partial<IData>, ctx?: TDataConfig) {
		return this._router.setState(state, ctx);
	}

	setStateAsync(state: Partial<IData>) {
		this._router.setStateAsync(state);
	}

	getTask(id: TID) {
		const { tasks } = this.getState();
		return tasks.byId(id);
	}

	private changeScale(zoom: IZoomConfig, step: number) {
		const level = zoom.level + step;
		const nextUnit = zoom.levels[level];
		if (nextUnit) {
			const { cellWidth, scales, _scales } = this.getState();
			const scaleState: Partial<IData> = zoomScale(
				zoom,
				step,
				level,
				nextUnit,
				_scales.lengthUnit,
				scales,
				cellWidth
			);
			scaleState._cellWidth = scaleState.cellWidth;
			this.setState(scaleState);
			return true;
		}
		return false;
	}

	private resetSummaryDates(id: TID, eventSource: string) {
		const { tasks } = this.getState();
		const obj = tasks.byId(id);
		// do not reset dates if the last non-milestone subtask was (re)moved
		const kids = obj.data;
		if (
			kids?.length > 1 ||
			(kids?.length && kids[0].type !== "milestone")
		) {
			const task = setSummaryDates({
				...obj,
				start: undefined,
				end: undefined,
				duration: undefined,
			});

			if (
				!isEqual(obj.start, task.start) ||
				!isEqual(obj.end, task.end)
			) {
				this.in.exec("update-task", { id, task, eventSource });
				const summary = tasks.getSummaryId(id);
				if (summary) this.resetSummaryDates(summary, eventSource);
			}
		}
	}

	private moveSummaryKids(
		task: Partial<ITask>,
		move: (date: Date) => Date,
		eventSource: string
	) {
		const { tasks } = this.getState();

		task.data.forEach((kid: IParsedTask) => {
			const task = {
				...tasks.byId(kid.id),
				start: move(kid.start),
			};
			if (task.type !== "milestone") {
				task.end = move(kid.end);
			}
			delete task.id;
			this.in.exec("update-task", {
				id: kid.id,
				task,
				eventSource,
			});

			if (kid.data?.length) this.moveSummaryKids(kid, move, eventSource);
		});
	}

	private calcScaleDate(x: number) {
		const { _scales, _start } = this.getState();
		const width =
			_scales.lengthUnit === "day"
				? _scales.lengthUnitWidth / 24
				: _scales.lengthUnitWidth;
		return getAdder("hour")(
			getUnitStart(_scales.minUnit, _start),
			Math.floor(x / width)
		);
	}
}

type CombineTypes<T, N> = {
	[P in keyof T]: T[P] & N;
};

export type IDataMethodsConfig = CombineTypes<
	{
		["add-task"]: {
			id?: TID;
			task: Partial<ITask>;
			target?: TID;
			mode?: "before" | "after" | "child";
		};
		["update-task"]: {
			id: TID;
			task: Partial<ITask>;
			diff?: number;
			inProgress?: boolean;
			eventSource?: string;
		};
		["delete-task"]: { id: TID; source?: TID };
		["open-task"]: { id: TID; mode: boolean };
		["select-task"]: {
			id: TID;
			toggle?: boolean;
			range?: boolean;
			show?: boolean;
		};
		["drag-task"]: {
			id: TID;
			width?: number;
			left?: number;
			top?: number;
			inProgress?: boolean;
		};

		["copy-task"]: {
			id: TID;
			target?: TID;
			mode?: "before" | "after" | "child";
			source?: TID;
			lazy?: boolean;
			eventSource?: string;
		};
		["move-task"]: {
			id: TID;
			target?: TID;
			mode?: "before" | "after" | "up" | "down" | "child";
			inProgress?: boolean;
			source?: TID;
		};

		["indent-task"]: { id: TID; mode: boolean };

		["show-editor"]: { id: TID };
		["add-link"]: { id?: TID; link: Partial<ILink> };
		["update-link"]: { id: TID; link: Partial<ILink> };
		["delete-link"]: { id: TID };

		["scroll-chart"]: { left?: number; top?: number };
		["render-data"]: IVisibleArea;
		// requesting data loading for the branch
		["request-data"]: {
			id: TID;
		};
		// providing new data for branch
		["provide-data"]: {
			id: TID;
			data: {
				tasks?: Array<ITask>;
				links?: Array<ILink>;
			};
		};

		["zoom-scale"]: { dir: number; date: Date; offset?: number };
		["expand-scale"]: {
			minWidth: number;
			date?: Date;
			offset?: number;
		};
		["sort-tasks"]: { key: string; order: "asc" | "desc" };
	},
	{
		skipProvider?: boolean;
	}
>;
