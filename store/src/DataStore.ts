import {
	Store,
	EventBus,
	DataArray,
	DataTree,
	DataRouter,
	tempID,
	isSame,
} from "@svar-ui/lib-state";
import type { TDataConfig, TWritableCreator, TID } from "@svar-ui/lib-state";
import { createFilter, IFilterColumn } from "@svar-ui/grid-store";

import GanttDataTree from "./GanttDataTree";
import {
	calcScales,
	resetScales,
	getMinUnit,
	zoomScale,
	expandScale,
	calcScaleDate,
} from "./scales";
import {
	updateTask,
	dragSummary,
	dragSummaryKids,
	setSummaryDates,
} from "./tasks";
import { normalizeLinks, updateLink } from "./links";
import {
	ADD_TASK_COLUMN_WIDTH,
	normalizeColumns,
	ensureVisibleFlex,
} from "./columns";
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
import { calculateArea } from "./helpers/area";
import { postToNewWindow } from "./dom/formPost";


import { Calendar } from "./schedule-types";
import type {
	IData,
	IDataConfig,
	ITask,
	TMethodsConfig,
	IGanttColumn,
	IResourceColumn,
	IGanttTask,
	IGanttLink,
	ILink,
	IResource,
	IVisibleArea,
	IZoomConfig,
	IParsedTask,
	TSort,
	IMarker,
	IExportConfig,
	TFilterHandler,
	TScrollMode,
	IAssignment,
	IDataAssignment,
	IComputedResource,
	IGroupByConfig,
	TDataName,
	TResourceAssignment,
	ICalendar,
	TDurationUnit,
	TDisplayMode,
	TLengthUnit,
} from "./types";

import { isEqual } from "date-fns";
import { normalizeDates, parseTaskDates } from "./normalizeDates";

export default class DataStore extends Store<IData> {
	public in: EventBus<TMethodsConfig, keyof TMethodsConfig>;
	private _router: DataRouter<IData, IDataConfig, TMethodsConfig>;
	private _modules = new Map<string, any>();
	private _prevScaleMinUnit?: TLengthUnit;
	private _prevConfig: Partial<IDataConfig> = {};

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
						"projectStart",
						"projectEnd",
						"baselines",
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
							projectStart,
							projectEnd,
							baselines,
							_tasksPatch,
						} = this.getState();

						if (_tasksPatch) return;

						if (!start || !end || autoScale) {
							const minUnit = getMinUnit(scales).unit;
							const bounds = calcScales(
								start,
								end,
								autoScale,
								minUnit,
								tasks,
								markers,
								projectStart,
								projectEnd,
								baselines
							);
							if (
								bounds._end !== _end ||
								bounds._start !== _start
							)
								this.setState(bounds, ctx);
						} else {
							this.setState({ _start: start, _end: end }, ctx);
						}
					},
				},
				// prepare scale structure for rendering
				{
					in: ["columns"],
					out: ["_headerLength", "_gridCollapseThreshold"],
					exec: (ctx: TDataConfig) => {
						const columns = this.getState().columns;
						let count = 1;
						let threshold = ADD_TASK_COLUMN_WIDTH;
						if (columns.length) {
							columns.forEach(col => {
								if (col.id === "add-task" && col.width)
									threshold = col.width;
								count = Math.max(
									(col.header as IFilterColumn["header"])
										.length,
									count
								);
							});
						}
						this.setState(
							{
								_headerLength: count,
								_gridCollapseThreshold: threshold,
							},
							ctx
						);
					},
				},
				{
					in: ["_compactMode"],
					out: ["displayMode"],
					exec: (ctx: TDataConfig) => {
						const { displayMode, _compactMode } = this.getState();
						let mode = displayMode;
						if (_compactMode) {
							mode = displayMode === "all" ? "grid" : mode;
						} else {
							mode = "all";
						}

						this.setState({ displayMode: mode }, ctx);
					},
				},
				{
					in: ["displayMode", "columns", "gridWidth"],
					out: ["_columnsWidth"],
					exec: (ctx: TDataConfig) => {
						const { columns, displayMode, gridWidth } =
							this.getState();
						if (!columns?.length) {
							this.setState({ _columnsWidth: 0 }, ctx);
							return;
						}
						let width = 0;
						if (displayMode === "chart") {
							const addCol = columns?.find(
								c => c.id === "add-task"
							);
							width = addCol?.width || ADD_TASK_COLUMN_WIDTH;
						}
						if (displayMode === "all") {
							width = gridWidth;
						}
						if (width) this.setState({ _columnsWidth: width }, ctx);
					},
				},
				// restore config cellWidth on scale change
				{
					in: ["start", "end"],
					out: ["cellWidth"],
					exec: (ctx: TDataConfig) => {
						const { _cellWidth, cellWidth } = this.getState();
						if (_cellWidth !== cellWidth)
							this.setState({ cellWidth: _cellWidth }, ctx);
					},
				},
				{
					in: [
						"_start",
						"_end",
						"cellWidth",
						"scaleHeight",
						"scales",
						"lengthUnit",
						"_weekStart",
						"_headerLength",
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
							_headerLength,
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
							scales,
							_headerLength
						);
						this.setState({ _scales, _scaleMinUnit: minUnit }, ctx);
					},
				},
				// index assignments by task and resource
				{
					in: ["assignments"],
					out: ["_assignments"],
					exec: (ctx: TDataConfig) => {
						const { assignments } = this.getState();
						const _assignments: IDataAssignment = {
							byTask: {},
							byResource: {},
						};

						if (assignments) {
							assignments.forEach((a: IAssignment) => {
								const taskId = a.task;
								const resourceId = a.resource;

								if (!_assignments.byTask[taskId]) {
									_assignments.byTask[taskId] = [];
								}
								_assignments.byTask[taskId].push(a);

								if (!_assignments.byResource[resourceId]) {
									_assignments.byResource[resourceId] = [];
								}
								_assignments.byResource[resourceId].push(a);
							});
						}

						this.setState({ _assignments }, ctx);
					},
				},
				// horizontal visible window over the lowest scale row's cells
				{
					in: ["_scales", "scrollLeft", "_chartWidth"],
					out: ["xArea"],
					exec: (ctx: TDataConfig) => {
						const { _scales, scrollLeft, _chartWidth } =
							this.getState();
						if (!_scales || !_chartWidth) {
							this.setState(
								{ xArea: { from: 0, to: 0, start: 0, end: 0 } },
								ctx
							);
							return;
						}
						const cells =
							_scales.rows[_scales.rows.length - 1].cells;
						this.setState(
							{
								xArea: calculateArea(
									scrollLeft || 0,
									_chartWidth,
									cells
								),
							},
							ctx
						);
					},
				},
				{
					in: ["tasks", "_assignments", "groupBy", "_scales"],
					out: ["tree"],
					exec: (ctx: TDataConfig) => {
						const state = this.getState();
						const { tasks, _scales } = this.getState();
						const grouping = this.getGrouping();

						if (grouping) {
							if (!_scales) return;
							const groupedTree = grouping.buildTree();
							this.setState({ tree: groupedTree });
							return;
						}
						this.setState({ tree: tasks }, ctx);
					},
				},
				// prepare tasks positions
				{
					in: [
						"tree",
						"_scales",
						"_rollups",
						"cellHeight",
						"baselines",
						"unscheduledTasks",
					],
					out: ["_tasks"],
					exec: (ctx: TDataConfig) => {
						const {
							cellWidth,
							cellHeight,
							tree,
							_scales,
							baselines,
							splitTasks,
							unscheduledTasks,
							_rollups,
							groupBy,
							_tasksPatch,
						} = this.getState();
						const arr = tree.toArray();
						if (_tasksPatch) {
							// canPatch = false if text update is called after
							// add-task ( same batch)
							const canPatch = arr.every(
								t => t.$skip || typeof t.$x === "number"
							);
							if (canPatch) {
								this.setState(
									{
										_tasks: arr,
										_tasksPatch: null,
									},
									ctx
								);
								return;
							}
						}
						const _tasks = arr.map((task, i) =>
							updateTask(task as IGanttTask, i, {
								cellWidth,
								cellHeight,
								_scales,
								baselines,
								splitTasks,
								unscheduledTasks,
								_rollups,
								groupBy,
							})
						);
						this.setState({ _tasks, _tasksPatch: null }, ctx);
					},
				},
				// prepare link positions
				{
					in: ["_tasks", "links", "cellHeight"],
					out: ["_links"],
					exec: (ctx: TDataConfig) => {
						const {
							tree,
							links,
							cellHeight,
							criticalPath,
							_isFiltered,
						} = this.getState();

						const _links = links
							.map<IGanttLink>(link => {
								const startTask = tree.byId(link.source);
								const endTask = tree.byId(link.target);

								if (!startTask || !endTask) return null;

								return updateLink(
									link as IGanttLink,
									startTask as IGanttTask,
									endTask as IGanttTask,
									cellHeight
								);
							})
							.toSorted((a: IGanttLink, b: IGanttLink) => {
								if (!a || !b) return 0;
								if (criticalPath) {
									// sort by length (shortest first) when critical status is the same
									if (!!a.critical === !!b.critical) {
										return b.$pl - a.$pl;
									}
									// critical links first
									return a.critical ? 1 : -1;
								}
								return b.$pl - a.$pl;
							})
							.filter(a => {
								if (a && _isFiltered)
									return (
										tree.isFilteredId(a.source) &&
										tree.isFilteredId(a.target)
									);
								return a !== null;
							});
						this.setState({ _links }, ctx);
					},
				},
				// build link spatial index
				{
					in: ["_links"],
					out: ["_linksIndex"],
					exec: (ctx: TDataConfig) => {
						const { _links } = this.getState();
						const index = new Map<number, IGanttLink[]>();
						for (const link of _links) {
							if (!link.$p) continue;
							const cx1 = Math.floor(link.$x1 / 2048);
							const cx2 = Math.floor(link.$x2 / 2048);
							const cy1 = Math.floor(link.$y1 / 2048);
							const cy2 = Math.floor(link.$y2 / 2048);
							for (let cy = cy1; cy <= cy2; cy++) {
								for (let cx = cx1; cx <= cx2; cx++) {
									const key = cy * 65536 + cx;
									let bucket = index.get(key);
									if (!bucket) index.set(key, (bucket = []));
									bucket.push(link);
								}
							}
						}
						this.setState({ _linksIndex: index }, ctx);
					},
				},
				// cull links
				{
					in: ["_linksIndex", "area", "xArea", "cellHeight"],
					out: ["_visibleLinks"],
					exec: (ctx: TDataConfig) => {
						const { _linksIndex, area, xArea, cellHeight } =
							this.getState();
						const areaTo = area.to ?? area.end * cellHeight;
						const cx1 = Math.floor(xArea.from / 2048);
						const cx2 = Math.floor(xArea.to / 2048);
						const cy1 = Math.floor(area.from / 2048);
						const cy2 = Math.floor((areaTo as number) / 2048);
						// collect candidates from at most 4 grid cells
						let candidates: IGanttLink[];
						if (cx1 === cx2 && cy1 === cy2) {
							candidates =
								_linksIndex.get(cy1 * 65536 + cx1) ?? [];
						} else {
							const seen = new Set<IGanttLink>();
							for (let cy = cy1; cy <= cy2; cy++) {
								for (let cx = cx1; cx <= cx2; cx++) {
									const bucket = _linksIndex.get(
										cy * 65536 + cx
									);
									if (bucket)
										for (const link of bucket)
											seen.add(link);
								}
							}
							candidates = Array.from(seen);
						}
						const _visibleLinks = candidates.filter(
							link =>
								link.$y2 >= area.from &&
								link.$y1 <= areaTo &&
								link.$x2 >= xArea.from &&
								link.$x1 <= xArea.to
						);
						this.setState({ _visibleLinks }, ctx);
					},
				},
				// activeTask
				{
					in: ["tasks", "activeTask"],
					out: ["_activeTask"],
					exec: (ctx: TDataConfig) => {
						const { activeTask, tasks } = this.getState();
						const task = tasks.byId(activeTask as TID);
						this.setState({ _activeTask: task || null }, ctx);
					},
				},
				// selection
				{
					in: ["tree", "selected"],
					out: ["_selected"],
					exec: (ctx: TDataConfig) => {
						const { tree, selected, _isFiltered } = this.getState();
						const _selected = selected
							.map(id => tree.byId(id))
							.filter((task: ITask) => {
								if (!task) return false;
								return (
									!_isFiltered || tree.isFilteredId(task.id)
								);
							});

						this.setState({ _selected }, ctx);
					},
				},
			],
			// data initializers
			{
				tasks: (v: ITask[]) => new GanttDataTree(v),
				links: (v: ILink[]) => new DataArray(normalizeLinks(v)),
				columns: (v: IGanttColumn[]) => normalizeColumns(v),
			}
		);

		const inBus = (this.in = new EventBus());

		/* before data modifications */
		inBus.on("show-editor", (ev: TMethodsConfig["show-editor"]) => {
			this.setStateAsync({ activeTask: ev.id });
		});
		inBus.on(
			"select-task",
			({
				id,
				toggle,
				range,
				show = true,
				focus,
				eventSource,
			}: TMethodsConfig["select-task"]) => {
				const { selected, _tasks, activeTask } = this.getState();
				let unselect = false;
				let ids;
				if (selected.length && (toggle || range)) {
					const result = [...selected];

					// in case of Ctrl/Command+Shift, handle as Shift
					if (range) {
						const sourceId = result[result.length - 1];
						const sourceInd = _tasks.findIndex(
							tobj => tobj.id === sourceId
						);
						const targetInd = _tasks.findIndex(
							tobj => tobj.id === id
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
						const selIndex = result.findIndex(
							selId => selId === id
						);
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

				this.setStateAsync(update);
				if (ids.length) {
					if (focus) show = focus === "chart" ? "xy" : show || "y";
					if (show) {
						const showTask = () => {
							this.scrollToTask(ids[0], show);
							if (focus) {
								this.setStateAsync({
									focusTask: {
										id: ids[0],
										column: focus === "grid",
									},
								});
							}
						};
						if (eventSource === "add-task") setTimeout(showTask, 1);
						else showTask();
					}
				}

				if (!unselect && activeTask && activeTask !== id) {
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

			if (typeof inProgress === "undefined") ev.source = task.parent;
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
					if (oldSummary !== newSummary) {
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

				if (mode === "child") {
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
				if (oldSummary !== newSummary) {
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
			const { tree, _tasks, _selected, rollups, slack } = state;
			const task = tree.byId(ev.id);
			const { left, top, width, inProgress } = ev;

			const update: Partial<IData> = {
				_tasks,
				_selected,
			};

			if (typeof width !== "undefined") {
				task.$w = width;
				dragSummary(tree, task);
			}

			if (typeof left !== "undefined") {
				if (task.type === "summary") {
					const dx = left - task.$x;
					dragSummaryKids(task, dx, !!rollups);
				}
				task.$x = left;
				dragSummary(tree, task);
			}
			if (typeof top !== "undefined") {
				task.$y = top + 4;
				task.$reorder = inProgress;
			}

			// we need not calculate task position,
			// but we need to recalculate things which depends on task positions
			this.setState(update);
		});

		const DATE_FIELDS = new Set([
			"start",
			"end",
			"duration",
			"type",
			"unscheduled",
			"base_start",
			"base_end",
			"base_duration",
			"segments",
			"rollup",
		]);

		inBus.on("update-task", (ev: TMethodsConfig["update-task"]) => {
			const { id, segmentIndex, diff, eventSource } = ev;
			let { task } = ev;
			const state = this.getState();
			const { tasks, _scales, durationUnit, splitTasks, _calendars } =
				state;
			const update: Partial<IData> = { tasks, _tasksPatch: false };

			const t = tasks.byId(id);

			const calendar = this.getTaskCalendar({ ...t, ...task });
			const stateOptions: Partial<IData> = {
				_scales,
				durationUnit,
				splitTasks,
			};

			if (
				eventSource === "add-task" ||
				eventSource === "copy-task" ||
				eventSource === "move-task" ||
				eventSource === "update-task" ||
				eventSource === "delete-task" ||
				eventSource === "provide-data" ||
				eventSource === "schedule-tasks"
			) {
				if (eventSource === "schedule-tasks") {
					tasks.update(id, task);
					this.setState({ tasks });
				} else {
					normalizeDates(task, stateOptions, calendar);
					tasks.update(id, task);
				}
				return;
			}

			//identify updates that do not take part in dependency calculations
			const hasDateChange =
				!!diff ||
				segmentIndex >= 0 ||
				("type" in task && task.type !== t.type) ||
				Object.keys(task).some(k => {
					if (!DATE_FIELDS.has(k) || k === "type") return false;
					const nv = task[k];
					const ov = t[k];
					return !isSame(nv, ov);
				});

			if (!hasDateChange) {
				tasks.update(id, task);
				const updated = tasks.byId(id);
				const canPatch =
					!this.getGrouping() && typeof updated.$x === "number";
				this.setStateAsync({ tasks, _tasksPatch: canPatch });
				ev.task = updated;
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
							(date, kid) => {
								date = adder(date, shift);
								if (!calendar) return date;
								const snapCalendar = _calendars
									? this.getTaskCalendar(kid)
									: calendar;
								return adjustToWorkingDay(
									date,
									diff,
									snapCalendar
								);
							},
							"update-task"
						);
					}
				}
			}

			// for partial task objects - fill related field for calculation
			if (!task.start) task.start = t.start;
			if (!task.end && !task.duration) task.duration = t.duration;

			normalizeDates(task, stateOptions, calendar);
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

			this.setStateAsync(update);

			ev.task = tasks.byId(id);
		});

		inBus.on("add-task", (ev: TMethodsConfig["add-task"]) => {
			const {
				tasks,
				_scales,
				unscheduledTasks,
				durationUnit,
				splitTasks,
				tree,
			} = this.getState();

			const { target, mode, task, show, select = true } = ev;
			if (!ev.eventSource && unscheduledTasks) task.unscheduled = true;
			const calendar = this.getTaskCalendar(task);

			let ind = -1;
			let parent;
			let targetObj;

			if (target) {
				targetObj = tasks.byId(target);
				if (mode === "child") {
					parent = targetObj;
					task.parent = parent.id;
				} else {
					if (targetObj.parent !== null) {
						parent = tasks.byId(targetObj.parent);
						task.parent = parent.id;
					}
					ind = tasks.getIndexById(target);
					if (mode === "after") ind += 1;
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
				task.duration = task.duration || 1;
			}

			if (calendar)
				task.start = adjustToWorkingDay(task.start, 1, calendar);

			if (this.getState().baselines) {
				task.base_start = task.start;
				task.base_duration = task.duration;
			}

			normalizeDates(task, { durationUnit, splitTasks }, calendar);
			const newTask = tasks.add(task, ind);

			const update: Partial<IData> = {
				tasks,
			};

			if (show) {
				while (parent && parent.id) {
					inBus.exec("open-task", {
						id: parent.id,
						mode: true,
					});
					parent = tree.byId(parent.parent);
				}
			}

			ev.id = newTask.id;

			const summary = tasks.getSummaryId(newTask.id);
			if (summary) {
				this.resetSummaryDates(summary, "add-task");
			}

			this.setStateAsync(update);

			ev.id = newTask.id;
			ev.task = newTask;
			if (select) {
				inBus.exec("select-task", {
					id: newTask.id,
					show,
					eventSource: "add-task",
				});
			} else if (show) {
				this.scrollToTask(newTask.id, show);
			}
		});

		inBus.on("delete-task", (ev: TMethodsConfig["delete-task"]) => {
			const { id } = ev;
			const state = this.getState();
			const { tasks, links, selected } = state;
			const task = tasks.byId(id);
			ev.source = task.parent;

			const summary = tasks.getSummaryId(id);

			const toRemove: TID[] = [id];
			tasks.eachChild(t => toRemove.push(t.id), id);
			links.filter(a => {
				return !(
					toRemove.includes(a.source) || toRemove.includes(a.target)
				);
			});

			const update: Partial<IData> = { tasks, links };


			const checkGroup = state.groupBy?.field === "resource";
			if (selected.includes(id) || checkGroup) {
				update.selected = selected.filter(
					sel =>
						sel !== id &&
						(!checkGroup || state.tree.byId(sel)?.$id !== id)
				);
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
			if (mode === "before") ind -= 1;

			const origin = tasks.byId(id);
			const idPairs = tasks.copy(
				origin,
				tasks.byId(target).parent,
				ind + 1
			);

			ev.source = ev.id;
			ev.id = idPairs[0][1];
			if (origin.lazy) ev.lazy = true;

			if (oldSummary !== newSummary && newSummary)
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
			const { tree } = this.getState();
			const task = tree.byId(id);

			if (task.lazy) inBus.exec("request-data", { id: task.id });
			else {
				tree.toArray().forEach(t => (t.$y = 0));
				tree.update(id, { open: mode });
				this.setState({ tree });
			}
		});

		inBus.on(
			"scroll-chart",
			({ left, top, date }: TMethodsConfig["scroll-chart"]) => {
				const {
					_chartWidth,
					_chartHeight,
					_tasks,
					cellHeight,
					_scales,
					cellWidth,
					_start,
					_weekStart,
				} = this.getState();
				let update: Partial<IData> = {};
				if (date) {
					const num = _scales.diff(date, _start, "hour");
					left = Math.round(num * cellWidth);
				}
				if (!isNaN(left)) {
					if (
						typeof _chartWidth !== "undefined" &&
						!isNaN(_scales.width)
					) {
						const maxLeft = _scales.width - _chartWidth;
						left = Math.max(Math.min(left, maxLeft), 0);
					}
					update = {
						scrollLeft: left,
						_scaleDate: calcScaleDate(left, {
							_scales,
							_start,
							_weekStart,
						}),
						_zoomOffset: null,
					};
				}
				if (!isNaN(top)) {
					if (typeof _chartHeight !== "undefined") {
						const maxTop =
							_scales.height +
							_tasks.length * cellHeight -
							_chartHeight;
						top = Math.max(Math.min(top, maxTop), 0);
					}
					update.scrollTop = top;
				}
				this.setState(update);
			}
		);

		inBus.on("render-data", (ev: TMethodsConfig["render-data"]) => {
			this.setState({ area: ev });
		});

		inBus.on("provide-data", (ev: TMethodsConfig["provide-data"]) => {
			const { tasks, links, assignments, durationUnit, splitTasks } =
				this.getState();
			const parent = tasks.byId(ev.id);

			if (parent.lazy) {
				parent.lazy = false;
				parent.open = true;
			} else parent.data = [];

			parseTaskDates(
				ev.data.tasks,
				{
					durationUnit,
					splitTasks,
				},
				this.getTaskCalendar.bind(this)
			);
			tasks.parse(ev.data.tasks, ev.id);
			if (parent.type === "summary")
				this.resetSummaryDates(parent.id, "provide-data");
			// fixme: DataArray needs the parse() method
			const update: Partial<IData> = {
				tasks,
				links: new DataArray(
					links.map(l => l).concat(normalizeLinks(ev.data.links))
				),
			};
			if (ev.data.assignments && assignments) {
				update.assignments = new DataArray(
					assignments
						.map(a => a)
						.concat(normalizeAssignments(ev.data.assignments))
				);
			}
			this.setStateAsync(update);
		});

		inBus.on(
			"zoom-scale",
			({ dir, ratio, offset }: TMethodsConfig["zoom-scale"]) => {
				const state = this.getState();
				const { zoom, cellWidth, _cellWidth, scrollLeft } = state;
				const pointerX = (offset || 0) + scrollLeft;
				const date = calcScaleDate(pointerX, state);
				const w = (dir < 0 && _cellWidth) || cellWidth;
				let width = Math.round(w * (1 + dir * (ratio ?? 0.15)));
				const { maxCellWidth, minCellWidth } = zoom.levels[zoom.level];
				const isExpanded = dir < 0 && cellWidth > maxCellWidth;

				if (this.shouldExpandScale(width)) {
					if (this.changeScale(zoom, dir)) {
						this.setState({ cellWidth: width, _cellWidth: width });
					}
					return;
				}

				if (
					width < minCellWidth ||
					width > maxCellWidth ||
					isExpanded
				) {
					if (!this.changeScale(zoom, dir)) {
						width = Math.max(
							Math.min(width, maxCellWidth),
							minCellWidth
						);
						if (width !== cellWidth)
							this.setState({
								cellWidth: width,
								_cellWidth: width,
							});
						else return;
					}
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
			"sort-tasks",
			({ key, order, add }: TMethodsConfig["sort-tasks"]) => {
				const state = this.getState();
				const { tasks, tree, columns } = state;
				let sort = state._sort;
				const sortBy: TSort = { key, order };

				let index = sort?.length || 0;
				if (index && add) {
					sort.forEach((a, i) => {
						if (a.key === key) index = i;
					});
					sort[index] = sortBy;
				} else sort = [sortBy];

				tree.sort(sort, columns);
				this.setState({ _sort: sort, tree });
			}
		);

		inBus.on("filter-tasks", (ev: IDataMethodsConfig["filter-tasks"]) => {
			const { open, key, value } = ev;
			let filter = ev.filter;

			const state = this.getState();
			const { tasks, columns } = state;

			let filterValues = state.filterValues;
			if (key) {
				filterValues = {
					...filterValues,
					[key]: value,
				};
			} else if (!Object.keys(ev).length) filterValues = {};

			if (
				!filter &&
				Object.values(filterValues).some(v => v || v === 0)
			) {
				filter = createFilter(filterValues, columns as IFilterColumn[]);
			}
			tasks.filterTree(filter, open ?? true);
			this.setState({ tasks, _isFiltered: !!filter, filterValues });
		});

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
							const focus = eventSource;
							this.in.exec("select-task", { id, show, focus });
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
		inBus.on(
			"resize-chart",
			({ width, height, scrollSize }: TMethodsConfig["resize-chart"]) => {
				let update: Partial<IData> = {};
				const state = this.getState();
				if (width > state._scales?.width)
					update = expandScale(width, state);
				this.setState({
					...update,
					_chartWidth: width,
					_chartHeight: height,
					_scrollSize: scrollSize,
				});
			}
		);
		inBus.on("resize-grid", ({ width }: TMethodsConfig["resize-grid"]) => {
			this.setState({
				gridWidth: width,
			});
		});
		inBus.on(
			"set-columns",
			({ columns }: TMethodsConfig["set-columns"]) => {
				const next = this.getState().columns.map(col => {
					const u = columns.find(c => c.id === col.id);
					if (!u) return col;
					return {
						...col,
						width: u.width,
						hidden: u.hidden,
						flexgrow: u.flexgrow,
					};
				});
				ensureVisibleFlex(next);
				this.setState({ columns: next });
			}
		);
		inBus.on(
			"set-display-mode",
			({ mode }: TMethodsConfig["set-display-mode"]) => {
				const compactMode = this.getState()._compactMode;
				if (compactMode && mode === "all") return;
				this.setState({
					displayMode: mode,
				});
			}
		);
		inBus.on(
			"open-resource-row",
			({ id, mode }: TMethodsConfig["open-resource-row"]) => {
				const { resources } = this.getState();

				resources.update(id, { open: mode });
				this.setState({ resources });
			}
		);
		inBus.on(
			"sort-resources",
			({
				key,
				order,
				add,
				_columns,
			}: TMethodsConfig["sort-resources"]) => {
				const state = this.getState();
				const { resources } = state;
				let resourceSort = state._resourceSort;
				const sortBy: TSort = { key, order };

				let index = resourceSort?.length || 0;
				if (index && add) {
					resourceSort.forEach((a, i) => {
						if (a.key === key) index = i;
					});
					resourceSort[index] = sortBy;
				} else resourceSort = [sortBy];

				resources.sort(resourceSort, _columns);
				this.setState({ _resourceSort: resourceSort, resources });
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
					xArea: { from: 0, to: 0, start: 0, end: 0 },
					_isFiltered: false,
					filterValues: {},
					groupBy: { field: null },
					tree: [],
				};

		if (state.cellWidth) state._cellWidth = state.cellWidth;
		// normalize displayMode for compact mode when displayMode changed
		if (
			state._compactMode &&
			state.displayMode !== this.getState().displayMode
		) {
			state.displayMode =
				state.displayMode === "all" ? "grid" : state.displayMode;
		}
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
			state.rollups = false;
			state._rollups = {};
			state.slack = false;
			state.resources = null;
			state._resources = [];
			state.assignments = [];
			state.calendar = null;
			state.calendars = [];
			state._calendar = null;
			state._calendars = {};
			state.groupBy = null;
			state.wbs = null;
		}

		const prev = this.getState();

		if (Array.isArray(state.calendars) && state.calendars.length > 0) {
			if (prev.calendars === state.calendars) {
				state._calendars = prev._calendars;
			} else {
				state._calendars = {};
				state.calendars.forEach(({ id, ...config }) => {
					state._calendars[id] = new Calendar(config);
					state._calendars[id].css = config.css;
				});
			}
		} else if (!prev._calendars) {
			state._calendars = {};
		}

		// preserve the instance while the config prop ref is unchanged
		// so external mutations (e.g. cal.addRule) survive reinits
		if (prev.calendar === state.calendar && prev._calendar) {
			state._calendar = prev._calendar;
		} else if (typeof state.calendar === "string") {
			const fromRegistry = state._calendars?.[state.calendar];
			if (fromRegistry) state._calendar = fromRegistry;
		} else if (state.calendar && typeof state.calendar === "object") {
			state._calendar = new Calendar(state.calendar);
		} else if (state.calendar === true) {
			state._calendar = new Calendar();
		}

		if (state._calendar && state.tasks) {
			state.highlightTime = (day: Date, unit: TDurationUnit) => {
				const cal = this.getCalendar();
				if (!cal) return "";
				if (
					(unit === "day" || unit === "hour") &&
					!cal.isWorkingDay(day)
				)
					return "wx-weekend";
				return "";
			};
		}

		// track changed state properties
		const tasksChanged = this.changed(state, "tasks");
		const linksChanged = this.changed(state, "links");
		const resourcesChanged = this.changed(state, "resources");
		const projectStartChanged = this.changed(state, "projectStart");
		const criticalPathChanged =
			tasksChanged ||
			linksChanged ||
			this.changed(state, "criticalPath", "slack", "unscheduledTasks");
		const scheduleChanged =
			tasksChanged || linksChanged || projectStartChanged;

		for (const k in state)
			if (k[0] !== "_")
				(this._prevConfig as Record<string, unknown>)[k] =
					state[k as keyof IDataConfig];

		if (state.tasks) {
			if (tasksChanged) {
				const tasksCopy = state.tasks.map(task => {
					const copy = { ...task };
					if (task.segments)
						copy.segments = task.segments.map(s => ({ ...s }));
					return copy;
				});
				// read calendars from local state — not yet committed to the router
				parseTaskDates(
					tasksCopy,
					{
						durationUnit: state.durationUnit,
						splitTasks: state.splitTasks,
					},
					task => {
						const id = task?.calendar;
						if (id != null && state._calendars?.[id])
							return state._calendars[id];
						return state._calendar;
					}
				);
				state.tasks = tasksCopy;
			} else {
				// unchanged - omit so the router keeps the existing tree
				delete state.tasks;
			}
		}
		if (tasksChanged) {
			// reset filtering, sort and history on tasks update
			this.getHistory()?.resetHistory();
			const currentState = this.getState();
			if (currentState._isFiltered) {
				this.setState({ _isFiltered: false, filterValues: {} });
			}
			if (currentState._sort) this.setState({ _sort: null });
		}
		if (resourcesChanged && this.getState()._resourceSort) {
			this.setState({ _resourceSort: null });
		}

		this._router.init({
			selected: [],
			markers: [],
			autoScale: true,
			durationUnit: "day",
			highlightTime: null,
			focusTask: null,
			gridWidth: 440,
			_compactMode: false,
			_sort: null,
			_resourceSort: null,
			...update,
			...state,
		});

	}

	private changed(
		state: Partial<IDataConfig>,
		...keys: (keyof IDataConfig)[]
	): boolean {
		return keys.some(k => {
			if (!(k in state)) return false; // not part of this update
			const a = this._prevConfig[k];
			const b = state[k];
			return a !== b && !isSame(a, b);
		});
	}

	setState(state: Partial<IData>, ctx?: TDataConfig) {
		return this._router.setState(state, ctx);
	}

	setStateAsync(state: Partial<IData>) {
		this._router.setStateAsync(state);
	}

	getTask(id: TID) {
		const { tree } = this.getState();
		return tree.byId(id);
	}

	getResource(id: TID) {
		const { resources } = this.getState();
		return resources.byId(id);
	}

	getHistory() {
		if (!this.getState().undo) return null;
		return this._modules.get("historyManager") as
			| HistoryManager
			| undefined;
	}
	getCalendar(id?: TID): ICalendar | undefined {
		const { _calendar, _calendars } = this.getState();
		return _calendars?.[id] ?? _calendar ?? undefined;
	}

	getTaskCalendar(task: Partial<ITask>): ICalendar | undefined {
		return this.getCalendar(task?.calendar);
	}

	getResourceCalendar(resource: Partial<IResource>): ICalendar | undefined {
		return this.getCalendar(resource?.calendar);
	}

	private getLoadHours(
		day: Date,
		task: Partial<ITask>,
		resource: Partial<IResource>
	) {
		const taskCalendar = this.getTaskCalendar(task);
		const resourceCalendar = this.getResourceCalendar(resource);

		if (taskCalendar && resourceCalendar) {
			return Math.min(
				taskCalendar.getWorkingHours(day),
				resourceCalendar.getWorkingHours(day)
			);
		}

		return (
			resourceCalendar?.getWorkingHours(day) ??
			taskCalendar?.getWorkingHours(day)
		);
	}

	getGrouping() {
		if (!this.getState().groupBy?.field) return null;
		return this._modules.get("groupManager") as GroupManager | undefined;
	}

	serialize(config?: { data: TDataName }) {
		const name = config?.data || "tasks";
		if (name === "calendars") {
			const { _calendars } = this.getState();
			if (!_calendars) return null;
			return Object.entries(_calendars).map(
				([id, instance]: [string, ICalendar]) => ({
					...(instance?.serialize?.() || {}),
					...(instance?.css ? { css: instance.css } : {}),
					id,
				})
			);
		}

		const collection = this.getState()[name];
		if (collection) {
			if (collection instanceof GanttDataTree)
				return collection.serialize();
			if (collection instanceof DataArray)
				return collection.map(obj => obj);
			if (collection instanceof DataTree) return collection.toArray();
		}
		return null;
	}

	getTaskResources(id: TID): Array<TResourceAssignment> {
		const { _assignments, resources } = this.getState();
		if (!resources || !_assignments) return [];
		const arr = _assignments.byTask[id];
		if (!arr) return [];
		return arr
			.map(obj => {
				const res = resources.byId(obj.resource);
				const item = { ...obj };
				delete item.resource;
				delete item.task;
				return res ? { ...item, ...res, assignmentId: obj.id } : null;
			})
			.filter(Boolean);
	}

	getResourceTasks(id: TID) {
		const { _assignments, tasks } = this.getState();
		if (!_assignments) return [];
		const arr = _assignments.byResource[id];
		if (!arr) return [];
		return arr
			.map(obj => {
				return tasks.byId(obj.task) || null;
			})
			.filter(Boolean);
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

	private shouldExpandScale(width: number): boolean {
		const { start, end, _chartWidth, _scales, cellWidth } = this.getState();
		if (start && end && _chartWidth && _scales?.width && cellWidth) {
			const units = _scales.width / cellWidth;
			const scaleWidth = units * width;
			return scaleWidth < _chartWidth;
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
		const { tasks, durationUnit, splitTasks } = this.getState();
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
					normalizeDates(
						task,
						{
							durationUnit,
							splitTasks,
						},
						this.getTaskCalendar(task)
					);
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
		move: (date: Date, kid: IParsedTask) => Date,
		eventSource: string
	) {
		const { tasks } = this.getState();

		task.data.forEach((kid: IParsedTask) => {
			const task = {
				...tasks.byId(kid.id),
				start: move(kid.start, kid),
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

	getNextRow(id: TID): IParsedTask {
		const data = this.getState()._tasks;
		const index = data.findIndex((t: IParsedTask) => t.id === id);
		return data[index + 1];
	}

	getPrevRow(id: TID): IParsedTask {
		const data = this.getState()._tasks;
		const index = data.findIndex((t: IParsedTask) => t.id === id);
		return data[index - 1];
	}

	scrollToTask(id: TID, mode: TScrollMode) {
		const {
			_chartWidth,
			_chartHeight,
			scrollLeft,
			scrollTop,
			cellWidth,
			cellHeight,
			_tasks,
			_scrollSize,
		} = this.getState();

		const index = _tasks.findIndex(t => t.id === id || t.$id === id);
		if (index < 0) return;

		const task = this.getTask(_tasks[index].id);
		const ev: IDataMethodsConfig["scroll-chart"] = {};
		if (mode?.toString().indexOf("x") !== -1) {
			if (task.$x + task.$w / 2 < scrollLeft) {
				ev.left = Math.max(task.$x - (cellWidth || 0), 0);
			} else if (task.$x + task.$w / 2 >= _chartWidth + scrollLeft) {
				const width = _chartWidth < task.$w ? cellWidth : task.$w;
				ev.left = task.$x - _chartWidth + width;
			}
		}

		const scrollY = index * cellHeight;
		let top = null;
		if (scrollY < scrollTop) {
			top = scrollY;
		} else if (scrollY + cellHeight > scrollTop + _chartHeight) {
			top = scrollY - _chartHeight + cellHeight + _scrollSize;
		}
		if (top !== null) {
			ev.top = Math.max(top, 0);
		}
		this.in.exec("scroll-chart", ev);
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
			show?: TScrollMode;
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
			show?: TScrollMode;
			focus?: "grid" | "chart";
			eventSource?: string;
		};
		["drag-task"]: {
			id: TID;
			segmentIndex?: number;
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
		};
		["update-link"]: { id: TID; link: Partial<ILink> };
		["delete-link"]: { id: TID };

		["scroll-chart"]: {
			left?: number;
			top?: number;
			date?: Date;
		};
		["render-data"]: IVisibleArea;
		["request-data"]: {
			id: TID;
		};
		["provide-data"]: {
			id: TID;
			data: {
				tasks?: Array<ITask>;
				links?: Array<ILink>;
				assignments?: Array<IAssignment>;
			};
		};

		["zoom-scale"]: {
			dir: number;
			ratio?: number;
			offset?: number;
		};
		["sort-tasks"]: { key: string; order: "asc" | "desc"; add?: boolean };
		["filter-tasks"]: {
			filter?: TFilterHandler;
			key?: string;
			value?: any;
			open?: boolean;
		};
		["group-tasks"]: IGroupByConfig;
		["hotkey"]: {
			key: string;
			event: any;
			eventSource?: string;
		};
		["resize-chart"]: { width: number; height: number; scrollSize: number };
		["schedule-tasks"]: {
			id?: TID;
			task?: Partial<ITask>;
			link?: TID;
		};
		["undo"]: void;
		["redo"]: void;
		["split-task"]: { id: TID; segmentIndex?: number };
		["export-data"]: IExportConfig;
		["import-data"]: { data: string; format?: "mspx" };
		["add-assignment"]: {
			id?: TID;
			assignment: Partial<IAssignment>;
		};
		["delete-assignment"]: { id: TID };
		["update-assignment"]: { id: TID; assignment: Partial<IAssignment> };
		["resize-grid"]: { width: number };
		["set-columns"]: { columns: IGanttColumn[] };
		["set-display-mode"]: { mode: TDisplayMode };
		["open-resource-row"]: { id: TID; mode: boolean };
		["sort-resources"]: {
			key: string;
			order: "asc" | "desc";
			add?: boolean;
			_columns: IResourceColumn[];
		};
	},
	{
		skipProvider?: boolean;
		skipUndo?: boolean;
		[key: string]: any;
	}
>;
