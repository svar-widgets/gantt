import { Store, EventBus, DataArray, DataRouter, tempID } from "@svar-ui/lib-state";
import type { TDataConfig, TWritableCreator, TID } from "@svar-ui/lib-state";

import GanttDataTree from "./GanttDataTree";
import { calcScales, resetScales, getMinUnit, zoomScale } from "./scales";
import {
	updateTask,
	dragSummary,
	dragSummaryKids,
	setSummaryDates,
} from "./tasks";
import { normalizeLinks, updateLink } from "./links";
import { normalizeColumns } from "./columns";
import {
	getAdder,
	getDiffer,
	isCorrectLengthUnit,
	getUnitStart,
	adjustToWorkingDay,
	shiftByWorkingDays,
} from "./time";
import { isCommunity } from "./package";
import { handleAction } from "./helpers/actionHandlers";
import { postToNewWindow } from "./dom/formPost";


import type {
	IData,
	IDataConfig,
	ITask,
	TMethodsConfig,
	IGanttColumn,
	IGanttTask,
	IGanttLink,
	ILink,
	IVisibleArea,
	IZoomConfig,
	IParsedTask,
	TSort,
	TScrollTask,
	IMarker,
	IExportConfig,
} from "./types";

import { isEqual } from "date-fns";
import { normalizeDates, parseTaskDates } from "./normalizeDates";

export default class DataStore extends Store<IData> {
	public in: EventBus<TMethodsConfig, keyof TMethodsConfig>;
	private _router: DataRouter<IData, IDataConfig, TMethodsConfig>;
	private _modules = new Map<string, any>();

	constructor(w: TWritableCreator) {
		super({ writable: w, async: false });

		this._router = new DataRouter(
			super.setState.bind(this),
			// data recalculation dependencies
			[
				// recalculate scales in auto-scale mode
				{
					in: [
						"tasks",
						"start",
						"end",
						"scales",
						"autoScale",
						"markers",
					],
					out: ["_start", "_end"],
					exec: (ctx: TDataConfig) => {
						const {
							_end,
							_start,
							start,
							end,
							tasks,
							scales,
							autoScale,
							markers,
						} = this.getState();
						if (!start || !end || autoScale) {
							const minUnit = getMinUnit(scales).unit;

							const bounds = calcScales(
								start,
								end,
								autoScale,
								minUnit,
								tasks,
								markers
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
						"_weekStart",
					],
					out: ["_scales"],
					exec: (ctx: TDataConfig) => {
						const state = this.getState();
						let { lengthUnit } = state;
						const {
							_start,
							_end,
							cellWidth,
							scaleHeight,
							scales,
							_weekStart,
						} = state;

						const minUnit = getMinUnit(scales).unit;
						if (!isCorrectLengthUnit(minUnit, lengthUnit))
							lengthUnit = minUnit;

						const _scales = resetScales(
							_start,
							_end,
							lengthUnit,
							cellWidth,
							scaleHeight,
							_weekStart,
							scales
						);
						this.setState({ _scales }, ctx);
					},
				},
				// prepare tasks positions
				{
					in: [
						"_scales",
						"tasks",
						"cellHeight",
						"baselines",
						"unscheduledTasks",
					],
					out: ["_tasks"],
					exec: (ctx: TDataConfig) => {
						const {
							cellWidth,
							cellHeight,
							tasks,
							_scales,
							baselines,
							splitTasks,
							unscheduledTasks,
						} = this.getState();

						const _tasks = tasks.toArray().map((task, i) =>
							updateTask(task as IGanttTask, i, {
								cellWidth,
								cellHeight,
								_scales,
								baselines,
								splitTasks,
								unscheduledTasks,
							})
						);
						this.setState({ _tasks }, ctx);
					},
				},
				// prepare link positions
				{
					in: ["_tasks", "links", "cellHeight"],
					out: ["_links"],
					exec: (ctx: TDataConfig) => {
						const {
							tasks,
							links,
							cellHeight,
							baselines,
							criticalPath,
						} = this.getState();

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
							.toSorted((a: IGanttLink, b: IGanttLink) => {
								if (criticalPath) {
									// sort by length (shortest first) when critical status is the same
									if (!!a.$critical === !!b.$critical) {
										return b.$pl - a.$pl;
									}
									// critical links first
									return a.$critical ? 1 : -1;
								}
								return b.$pl - a.$pl;
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
						const state = this.getState();
						let { activeTask } = state;
						if (activeTask && typeof activeTask === "object")
							activeTask = activeTask.id;
						const task = state.tasks.byId(activeTask as TID);
						this.setState({ _activeTask: task || null }, ctx);
					},
				},
				// selection
				{
					in: ["tasks", "selected"],
					out: ["_selected"],
					exec: (ctx: TDataConfig) => {
						const { tasks, selected } = this.getState();
						const _selected = selected
							.map(id => tasks.byId(id))
							.filter((task: ITask) => !!task);
						this.setState({ _selected }, ctx);
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
				columns: (v: IGanttColumn[]) => normalizeColumns(v),
			}
		);

		const inBus = (this.in = new EventBus());

		/* before data modifications */
		inBus.on("show-editor", (ev: TMethodsConfig["show-editor"]) => {
			const { splitTasks } = this.getState();
			if (splitTasks) {
				const { id, segmentIndex } = ev;
				if (id && (segmentIndex || segmentIndex === 0)) {
					this.setStateAsync({ activeTask: { id, segmentIndex } });
					return;
				}
			}
			this.setStateAsync({ activeTask: ev.id });
		});
		inBus.on(
			"select-task",
			({
				id,
				toggle,
				range,
				show,
				segmentIndex,
			}: TMethodsConfig["select-task"]) => {
				const { selected, _tasks, activeTask, splitTasks } =
					this.getState();
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
						if (sourceInd > targetInd) range.reverse();

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
				const update: Partial<IData> = {
					selected: ids,
				};

				if (show && ids.length)
					update._scrollTask = { id: ids[0], mode: show };

				this.setStateAsync(update);

				if (
					!unselect &&
					activeTask &&
					(activeTask !== id || splitTasks)
				) {
					inBus.exec("show-editor", {
						id,
						...(splitTasks && { segmentIndex }),
					});
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
			const id = ev.id;
			let link = ev.link;

			links.update(id, link as ILink);
			link = links.byId(id);

			if (!link.lag && link.lag !== 0) delete link.lag;

			this.setStateAsync({ links });

			ev.link = link;
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
				tasks.update(task.id, { $reorder: false });
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
			const state = this.getState();
			const { tasks, _tasks, _selected, _scales, cellWidth, cellHeight } =
				state;
			const task = tasks.byId(ev.id);
			const { left, top, width, start, inProgress } = ev;

			const update: Partial<IData> = { _tasks, _selected };

			if (typeof width !== "undefined") {
				task.$w = width;
				dragSummary(tasks, task, { _scales, cellWidth });
			}
			if (typeof left !== "undefined") {
				if (task.type === "summary") {
					const dx = left - task.$x;
					dragSummaryKids(task, dx, { _scales, cellWidth });
				}
				task.$x = left;
				dragSummary(
					tasks,
					task,
					{ _scales, cellWidth, cellHeight },
					!start
				);
			}
			if (typeof top !== "undefined") {
				task.$y = top + 4;
				task.$reorder = inProgress;
			}

			// we need not calculate task position,
			// but we need to recalculate things which depends on task positions
			this.setState(update);
		});

		inBus.on("update-task", (ev: TMethodsConfig["update-task"]) => {
			const { id, segmentIndex, diff, eventSource } = ev;
			let { task } = ev;
			const { tasks, _scales, durationUnit, splitTasks, calendar } =
				this.getState();

			const t = tasks.byId(id);
			const stateOptions: Partial<IData> = {
				_scales,
				durationUnit,
				calendar,
				splitTasks,
			};

			if (
				eventSource === "add-task" ||
				eventSource === "copy-task" ||
				eventSource === "move-task" ||
				eventSource === "update-task" ||
				eventSource === "delete-task" ||
				eventSource === "provide-data"
			) {

				normalizeDates(task, stateOptions);
				tasks.update(id, task);
				return;
			}
			const minUnit = _scales.lengthUnit;

			let adder = getAdder(minUnit);
			const differ = getDiffer(durationUnit, calendar);

			if (diff) {
				if (task.start) task.start = adder(task.start, diff);

				if (!segmentIndex && segmentIndex !== 0) {
					if (task.start && task.end) {
						task.duration = t.duration;
					} else {
						// preserve end date to recalculate duration when only start changes
						if (task.start) task.end = t.end;
						else {
							task.end = adder(task.end, diff);
							// preserve start date and calculate duration to recalculate correct end when only end changes
							task.start = t.start;
							task.duration = differ(task.end, task.start);
						}

						if (!differ(task.end, task.start)) {
							task.duration = 1;
						}
					}
				}
			}


			task.type = task.type ?? t.type;

			// adjust start date to nearest working day based on drag direction
			if (calendar && task.start)
				task.start = adjustToWorkingDay(task.start, diff, calendar);

			if (task.start && task.end) {
				if (
					!isEqual(task.start, t.start) ||
					!isEqual(task.end, t.end)
				) {
					if (task.type === "summary" && t.data?.length) {
						let shift = diff || differ(task.start, t.start);
						if (calendar) {
							//recalculate real diff
							shift =
								task.start > t.start
									? differ(task.start, t.start)
									: -differ(t.start, task.start);
							adder = shiftByWorkingDays(calendar);
						}

						this.moveSummaryKids(
							t,
							date => {
								date = adder(date, shift);
								return calendar
									? adjustToWorkingDay(date, diff, calendar)
									: date;
							},
							"update-task"
						);
					}
				}
			}

			// for partial task objects - fill related field for calculation
			if (!task.start) task.start = t.start;
			if (!task.end && !task.duration) task.duration = t.duration;

			normalizeDates(task, stateOptions);
			tasks.update(id, task);

			if (
				(calendar && task.type === "summary") ||
				(task.type === "summary" && t.type !== "summary")
			) {
				//silent update for itself
				this.resetSummaryDates(id, "update-task", true);
			}

			const summary = tasks.getSummaryId(id);
			if (summary) {
				this.resetSummaryDates(summary, "update-task");
			}

			this.setStateAsync({ tasks });

			ev.task = tasks.byId(id);
		});

		inBus.on("add-task", (ev: TMethodsConfig["add-task"]) => {
			const {
				tasks,
				_scales,
				unscheduledTasks,
				durationUnit,
				splitTasks,
				calendar,
			} = this.getState();

			const { target, mode, task, show, select = true } = ev;

			if (!ev.eventSource && unscheduledTasks) task.unscheduled = true;
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
					if (branch?.length) {
						const task = branch[branch.length - 1];
						if (!task.$skip) {
							const d = new Date(task.start.valueOf());
							if (_scales.start <= d) start = d;
						}
					}
					task.start =
						start ||
						getAdder(durationUnit, calendar)(_scales.start, 1);
				}
				task.duration = 1;
			}

			if (calendar)
				task.start = adjustToWorkingDay(task.start, 1, calendar);

			if (this.getState().baselines) {
				task.base_start = task.start;
				task.base_duration = task.duration;
			}

			normalizeDates(task, { durationUnit, splitTasks, calendar });
			const newTask = tasks.add(task, ind);

			const update: Partial<IData> = {
				tasks,
			};

			if (parent && show) {
				while (parent && parent.id) {
					inBus.exec("open-task", {
						id: parent.id,
						mode: true,
					});
					parent = tasks.byId(parent.parent);
				}

				update._scrollTask = { id: newTask.id, mode: show };
			}

			ev.id = newTask.id;

			const summary = tasks.getSummaryId(newTask.id);
			if (summary) {
				this.resetSummaryDates(summary, "add-task");
			}

			this.setStateAsync(update);

			ev.id = newTask.id;
			ev.task = newTask;

			if (select) inBus.exec("select-task", { id: newTask.id });
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

			const update: Partial<IData> = { tasks, links };
			if (selected.includes(id)) {
				update.selected = selected.filter(sel => sel !== id);
			}

			tasks.remove(id);

			if (summary) {
				this.resetSummaryDates(summary, "delete-task");
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
					skipUndo: true,
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
					eventSource: "copy-task",
					skipUndo: true,
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
					this.setState({
						scrollLeft: left,
						_scaleDate: d,
					});
				}
				if (!isNaN(top)) this.setState({ scrollTop: top });
			}
		);

		inBus.on("render-data", (ev: TMethodsConfig["render-data"]) => {
			this.setState({ area: ev });
		});

		inBus.on("provide-data", (ev: TMethodsConfig["provide-data"]) => {
			const { tasks, links, durationUnit, calendar, splitTasks } =
				this.getState();
			const parent = tasks.byId(ev.id);

			if (parent.lazy) {
				parent.lazy = false;
				parent.open = true;
			} else parent.data = [];

			parseTaskDates(ev.data.tasks, {
				durationUnit,
				splitTasks,
				calendar,
			});
			tasks.parse(ev.data.tasks, ev.id);
			if (parent.type == "summary")
				this.resetSummaryDates(parent.id, "provide-data");
			// fixme: DataArray needs the parse() method
			this.setStateAsync({
				tasks,
				links: new DataArray(
					links.map(l => l).concat(normalizeLinks(ev.data.links))
				),
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

				const {
					_scales,
					_start,
					cellWidth: cw,
					_weekStart,
				} = this.getState();
				const start = getUnitStart(_scales.minUnit, _start, _weekStart);
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

				const startStep = step && end ? -step : 0;
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
			({ key, order, add }: TMethodsConfig["sort-tasks"]) => {
				const state = this.getState();
				const { tasks } = state;
				let sort = state._sort;
				const sortBy: TSort = { key, order };

				let index = sort?.length || 0;
				if (index && add) {
					sort.forEach((a, i) => {
						if (a.key === key) index = i;
					});
					sort[index] = sortBy;
				} else sort = [sortBy];

				tasks.sort(sort);
				this.setState({ _sort: sort, tasks });
			}
		);
		inBus.on(
			"hotkey",
			({ key, event, eventSource }: IDataMethodsConfig["hotkey"]) => {
				switch (key) {
					case "arrowup":
					case "arrowdown": {
						const { selected, _tasks } = this.getState();
						event.preventDefault();
						const len = selected.length;
						let id;
						if (key === "arrowup") {
							id = len
								? this.getPrevRow(selected[len - 1])?.id
								: _tasks[_tasks.length - 1]?.id;
						} else {
							id = len
								? this.getNextRow(selected[len - 1])?.id
								: _tasks[0]?.id;
						}
						if (id) {
							const show = eventSource === "chart" ? "xy" : true;
							this.in.exec("select-task", { id, show });
						}
						break;
					}
					case "ctrl+c": {
						handleAction(this, "copy-task", null, null);
						break;
					}
					case "ctrl+x": {
						handleAction(this, "cut-task", null, null);
						break;
					}
					case "ctrl+v": {
						handleAction(this, "paste-task", null, null);
						break;
					}
					case "ctrl+d":
					case "backspace": {
						event.preventDefault();
						handleAction(this, "delete-task", null, null);
						break;
					}
					case "ctrl+z": {
						this.in.exec("undo", {});
						break;
					}
					case "ctrl+y": {
						this.in.exec("redo", {});
						break;
					}
					/*case "ctrl+e": {
					const { selected, _tasks } = this.getState();
					event.preventDefault();
					const id = selected.length
						? selected[selected.length - 1]
						: _tasks[0]?.id;

					this.in.exec("show-editor", { id });
					break;
				}*/
				}
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

		if (isCommunity()) {
			state.unscheduledTasks = false;
			state.baselines = false;
			state.markers = [];
			state._markers = [];
			state.undo = false;
			state.schedule = {};
			state.criticalPath = null;
			state.splitTasks = false;
			state.summary = {};
		}

		if (Array.isArray(state.tasks)) {
			this.getHistory()?.resetHistory();
		}

		this._router.init({
			_scrollTask: null,
			selected: [],
			markers: [],
			autoScale: true,
			durationUnit: "day",
			...update,
			...state,
		});

		// [FIXME] reacts to any external changes to props
		// must compare prev. and current state (+use the initOnce logic?)

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

	getHistory() {
		if (!this.getState().undo) return null;
		return this._modules.get("historyManager") as
			| HistoryManager
			| undefined;
	}

	serialize() {
		return this.getState().tasks.serialize();
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

	private isScheduled(data: ITask[]) {
		if (!this.getState().unscheduledTasks) return true;

		const result = data.some((kid: ITask) => {
			return !kid.unscheduled || (kid.data && this.isScheduled(kid.data));
		});
		return result;
	}

	private resetSummaryDates(id: TID, eventSource: string, silent?: boolean) {
		const { tasks, durationUnit, splitTasks, calendar } = this.getState();
		const obj = tasks.byId(id);
		const kids = obj.data;

		// do not reset dates if there are no kids or all kids are unscheduled
		if (kids?.length && this.isScheduled(kids)) {
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
				if (silent) {
					normalizeDates(task, {
						durationUnit,
						splitTasks,
						calendar,
					});
					tasks.update(id, task);
				} else
					this.in.exec("update-task", {
						id,
						task,
						eventSource,
						skipUndo: true,
					});

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
			delete task.end;
			delete task.id;
			this.in.exec("update-task", {
				id: kid.id,
				task,
				eventSource,
				skipUndo: true,
			});

			if (kid.data?.length) this.moveSummaryKids(kid, move, eventSource);
		});
	}

	private calcScaleDate(x: number) {
		const { _scales, _start, _weekStart } = this.getState();
		const width =
			_scales.lengthUnit === "day"
				? _scales.lengthUnitWidth / 24
				: _scales.lengthUnitWidth;
		return getAdder("hour")(
			getUnitStart(_scales.minUnit, _start, _weekStart),
			Math.floor(x / width)
		);
	}
	getNextRow(id: TID): IParsedTask {
		const data = this.getState()._tasks;
		const index = data.findIndex((t: IParsedTask) => t.id == id);
		return data[index + 1];
	}

	getPrevRow(id: TID): IParsedTask {
		const data = this.getState()._tasks;
		const index = data.findIndex((t: IParsedTask) => t.id == id);
		return data[index - 1];
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
			show?: TScrollTask["mode"];
			select?: boolean;
			eventSource?: string;
		};
		["update-task"]: {
			id: TID;
			segmentIndex?: number;
			task: Partial<ITask>;
			diff?: number;
			inProgress?: boolean;
			eventSource?: string;
			skipUndo?: boolean;
		};
		["delete-task"]: { id: TID; source?: TID };
		["open-task"]: { id: TID; mode: boolean };
		["select-task"]: {
			id: TID;
			toggle?: boolean;
			range?: boolean;
			show?: TScrollTask["mode"];
		};
		["drag-task"]: {
			id: TID;
			segmentIndex?: number;
			width?: number;
			left?: number;
			top?: number;
			start?: boolean;
			inProgress?: boolean;
		};
		["copy-task"]: {
			id: TID;
			target?: TID;
			mode?: "before" | "after" | "child";
			source?: TID;
			lazy?: boolean;
			eventSource?: string;
			skipUndo?: boolean;
		};
		["move-task"]: {
			id: TID;
			target?: TID;
			mode: "before" | "after" | "up" | "down" | "child";
			inProgress?: boolean;
			source?: TID;
		};

		["indent-task"]: { id: TID; mode: boolean };

		["show-editor"]: { id: TID };
		["add-link"]: {
			id?: TID;
			link: Partial<ILink>;
			eventSource?: string;
			skipUndo: boolean;
		};
		["update-link"]: { id: TID; link: Partial<ILink> };
		["delete-link"]: { id: TID };

		["scroll-chart"]: { left?: number; top?: number };
		["render-data"]: IVisibleArea;
		["request-data"]: {
			id: TID;
		};
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
		["sort-tasks"]: { key: string; order: "asc" | "desc"; add?: boolean };
		["hotkey"]: {
			key: string;
			event: any;
			eventSource?: string;
		};
		["schedule-tasks"]: {
			id?: TID;
			task?: Partial<ITask>;
		};
		["undo"]: void;
		["redo"]: void;
		["split-task"]: { id: TID; segmentIndex?: number };
		["export-data"]: IExportConfig;
		["import-data"]: { data: string; format?: "mspx" };
	},
	{
		skipProvider?: boolean;
		spipUndo?: boolean;
		[key: string]: any;
	}
>;
