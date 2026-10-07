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
	getDefaultTaskStart,
	isManualSummary,
} from "./tasks";
import { normalizeLinks, updateLink } from "./links";
import {
	createPlaceholderRow,
	applyPlaceholderDates,
	isPlaceholder,
	PLACEHOLDER_ROW_ID,
} from "./placeholder";
import {
	ADD_TASK_COLUMN_WIDTH,
	getDefaultColumns,
	getDefaultGridWidth,
	getHeaderLength,
	normalizeColumns,
	ensureVisibleFlex,
} from "./columns";
import {
	hasSubGridColumns,
	normalizeDisplayMode,
	toCompactPanels,
} from "./layout/displayMode";
import {
	resolveLayout,
	resolvePanelChange,
	getPanelFitMeasure,
	getCollapseThreshold,
	resolveGridDrag,
	resolveSubGridDrag,
	previewGridDrag,
	previewSubGridDrag,
	samePanels,
} from "./layout/panels";
import {
	getAdder,
	getDiffer,
	isCorrectLengthUnit,
	getUnitStart,
	adjustToWorkingDay,
	adjustEndToWorkingDay,
	shiftByWorkingDays,
} from "./time";
import { toInclusiveTask } from "./inclusiveEnd";
import { isCommunity } from "./package";
import { handleAction } from "./helpers/actionHandlers";
import { calculateArea } from "./helpers/area";
import { clamp, dropUndefined } from "./helpers/data";
import { getProgressLinePoints } from "./helpers/progressLine";
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
	TDisplayModeConfig,
	IProgressLineData,
	ISCurveLineConfig,
	IConflict,
	InvalidLinkReason,
	TLinkValidator,
	IScheduleConfig,
	IHistoryManager,
	IGroupManager,
	TDisplayPanel,
	TColumnSection,
} from "./types";

import { addDays, isEqual } from "date-fns";
import { calcDates, normalizeDates, parseTreeDates } from "./normalizeDates";

const EMPTY: any[] = [];

// data actions that can arrive as remote events
const REMOTE_ACTIONS = [
	"add-task",
	"update-task",
	"move-task",
	"delete-task",
	"add-link",
	"update-link",
	"delete-link",
	"add-assignment",
	"update-assignment",
	"delete-assignment",
] as const;

type TConfigKey = keyof IDataConfig | `schedule.${keyof IScheduleConfig}`;

// config keys whose change re-runs a derived pass in init
const DATES_INPUT: TConfigKey[] = [
	"tasks",
	"links",
	"projectStart",
	"projectEnd",
	"inactiveTasks",
	"unscheduledTasks",
];
const TRIGGERS = {
	geometry: [
		"tasks",
		"cellHeight",
		"baselines",
		"unscheduledTasks",
		"rollups",
		"groupBy",
	],
	schedule: [...DATES_INPUT, "schedule.auto"],
	criticalPath: [
		...DATES_INPUT,
		"calendar",
		"calendars",
		"schedule",
		"criticalPath",
		"slack",
	],
	history: ["tasks", "links", "resources", "assignments"],
} satisfies Record<string, TConfigKey[]>;

export default class DataStore extends Store<IData> {
	public in: EventBus<TMethodsConfig, keyof TMethodsConfig>;
	private _router: DataRouter<IData, IDataConfig, TMethodsConfig>;
	private _modules = new Map<string, any>();
	private _prevConfig: Partial<IDataConfig> = {};
	private _pendingGeometry: "all" | "meta" | Set<TID> | null = null;
	// layout at the start of a grid/subGrid resizer drag
	private _resizeStart: {
		panels: TDisplayPanel[];
		gridWidth: number;
		subGridWidth: number;
	} | null = null;
	private _placeholderRow: IParsedTask;

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
						"progressLine",
						"deadlines",
						"criticalPath",
						"schedule",
						"unscheduledTasks",
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
							unscheduledTasks,
							progressLine,
							deadlines,
							criticalPath,
							schedule,
						} = this.getState();

						// date patches can change scale bounds; metadata-only patches cannot
						if (this._pendingGeometry === "meta") return;

						if (!start || !end || autoScale) {
							const minUnit = getMinUnit(scales).unit;
							const progressLineDate =
								progressLine instanceof Date
									? progressLine
									: undefined;

							let constraints = false;

							const bounds = calcScales(
								start,
								end,
								autoScale,
								minUnit,
								tasks,
								{
									markers,
									projectStart,
									projectEnd,
									baselines,
									unscheduledTasks,
									progressLine: progressLineDate,
									deadlines,
									constraints,
								}
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
					in: ["_columns"],
					out: ["_headerLength", "_gridCollapseThreshold"],
					exec: (ctx: TDataConfig) => {
						const { _columns } = this.getState();
						let threshold = ADD_TASK_COLUMN_WIDTH;
						const addCol = _columns.find(c => c.id === "add-task");
						if (addCol?.width) threshold = addCol.width;
						this.setState(
							{
								_headerLength: getHeaderLength(_columns),
								_gridCollapseThreshold: threshold,
							},
							ctx
						);
					},
				},
				{
					in: ["displayMode"],
					out: ["_displayPanels"],
					exec: (ctx: TDataConfig) => {
						const { displayMode, _compactMode, _displayPanels } =
							this.getState();
						this.setState(
							{
								_displayPanels: _compactMode
									? toCompactPanels(
											displayMode,
											_displayPanels
										)
									: displayMode,
							},
							ctx
						);
					},
				},
				{
					in: ["_displayPanels", "_columns", "gridWidth"],
					out: ["_columnsWidth"],
					exec: (ctx: TDataConfig) => {
						const { _columns, _displayPanels, gridWidth } =
							this.getState();
						if (!_columns?.length) {
							this.setState({ _columnsWidth: 0 }, ctx);
							return;
						}
						let width = 0;
						if (!_displayPanels.includes("grid")) {
							const addCol = _columns?.find(
								c => c.id === "add-task"
							);
							width = addCol?.width || ADD_TASK_COLUMN_WIDTH;
						} else {
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
						// scale changes invalidate every cached task position
						this.markGeometry("all");
						this.setState({ _scales }, ctx);
					},
				},
				// index assignments by task and resource
				{
					in: ["assignments"],
					out: ["_assignments"],
					exec: (ctx: TDataConfig) => {
						const { assignments } = this.getState();
						this.setState(
							{
								_assignments:
									this.indexAssignments(assignments),
							},
							ctx
						);
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
						"deadlines",
						"splitTasks",
						"placeholderRow",
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
							placeholderRow,
							_rollups,
							groupBy,
							_tasks: currentTasks,
							deadlines,
							tasks,
							durationUnit,
							schedule,
							criticalPath,
						} = this.getState();
						const arr = tree.toArray();
						if (placeholderRow) arr.push(this.getPlaceholderRow());
						const opts = {
							cellWidth,
							cellHeight,
							_scales,
							baselines,
							splitTasks,
							unscheduledTasks,
							_rollups,
							groupBy,
							deadlines,
							schedule,
							criticalPath,
						};
						// consume the accumulated mode in the route pass it describes
						const pending = this._pendingGeometry;
						this._pendingGeometry = null;
						if (pending === "meta" || pending instanceof Set) {
							// new or reordered rows force partial updates to fall back
							const canPatch =
								currentTasks?.length === arr.length &&
								arr.every(
									(t, i) =>
										currentTasks[i]?.id === t.id &&
										(t.$skip || typeof t.$x === "number")
								);
							if (canPatch) {
								// preserve cached geometry outside the dirty set
								if (pending instanceof Set) {
									for (let i = 0; i < arr.length; i++)
										if (pending.has(arr[i].id))
											updateTask(
												arr[i] as IGanttTask,
												i,
												opts
											);
								}
								this.setState({ _tasks: arr }, ctx);
								return;
							}
						}
						if (placeholderRow)
							applyPlaceholderDates(
								this.getPlaceholderRow(),
								{ tasks, durationUnit, _scales },
								this.getCalendar()
							);
						// full, absent, or unpatchable state rebuilds every task
						const _tasks = arr.map((task, i) =>
							updateTask(task as IGanttTask, i, opts)
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
					in: ["tree", "selected", "placeholderRow"],
					out: ["_selected"],
					exec: (ctx: TDataConfig) => {
						const { tree, selected, _isFiltered, placeholderRow } =
							this.getState();
						const _selected = selected
							.map(id =>
								placeholderRow && isPlaceholder(id)
									? this.getPlaceholderRow()
									: tree.byId(id)
							)
							.filter((task: ITask) => {
								if (!task) return false;
								if (isPlaceholder(task.id)) return true;
								return (
									!_isFiltered || tree.isFilteredId(task.id)
								);
							});

						this.setState({ _selected }, ctx);
					},
				},
				// columns keep the config, _columns add the store-driven parts;
				// built from columns on every run, so a resent config loses nothing
				{
					in: [
						"columns",
					],
					out: ["_columns"],
					exec: (ctx: TDataConfig) => {
						const { columns } = this.getState();
						let _columns = columns;


						this.setState({ _columns }, ctx);
					},
				},
			],
			// data initializers
			{
				links: (v: ILink[]) => new DataArray(normalizeLinks(v)),
				columns: (v: IGanttColumn[]) =>
					normalizeColumns(
						v,
						() => this.getState(),
						task => this.getTaskCalendar(task)
					),
			}
		);

		const inBus = (this.in = new EventBus());

		// a remote event is already saved; the flag stops it before the provider's queue
		REMOTE_ACTIONS.forEach(action =>
			inBus.intercept(action, (ev: TMethodsConfig[typeof action]) => {
				if (this.isRemote(ev.eventSource)) ev.skipProvider = true;
			})
		);

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

				this.setState(update);
				if (ids.length) {
					if (focus) show = focus === "chart" ? "xy" : show || "y";
					if (show) {
						const showTask = () => {
							const lastSelected = ids[ids.length - 1];
							this.scrollToTask(lastSelected, show);
							if (focus) {
								this.setStateAsync({
									focusTask: {
										id: lastSelected,
										...(focus !== "chart"
											? { section: focus }
											: {}),
									},
								});
							}
						};
						if (eventSource === "add-task") setTimeout(showTask, 1);
						else showTask();
					}
				}

				if (
					!unselect &&
					activeTask &&
					activeTask !== id &&
					!isPlaceholder(id)
				) {
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
			const payload = ev.link;
			let link = ev.link;

			links.update(id, link as ILink);
			link = links.byId(id);

			dropUndefined(link, payload);
			link.lag = Number(link.lag) || 0;

			this.setStateAsync({ links });

			ev.link = link;
		});
		inBus.on("add-link", (ev: TMethodsConfig["add-link"]) => {
			const { link } = ev;
			const { links } = this.getState();

			if (!link.source || !link.target) return;
			if (!link.type) link.type = "e2s";
			link.lag = Number(link.lag) || 0;

			link.id = link.id || tempID();

			links.add(link as ILink);
			this.setStateAsync({ links });

			ev.id = link.id;
			ev.link = links.byId(link.id);
		});

		let source: TID = null; //stable task parent until final call
		// original data of summaries changed while dragging;
		// at drop, only the ones that still differ are sent
		const dragged = new Map<TID, Partial<ITask>>();
		inBus.on("move-task", (ev: TMethodsConfig["move-task"]) => {
			const { tasks, tree } = this.getState();
			let { mode, target } = ev;
			const { id, inProgress } = ev;
			// a remote move changes the saved tree; grouping only changes the view
			if (this.isRemote(ev.eventSource)) {
				ev.source = tasks.byId(id).parent;
				tasks.move(id, mode, target);
				this.setStateAsync({ tasks });
				return;
			}

			const task = tree.byId(id);
			const grouping = this.getGrouping();

			if (typeof inProgress === "undefined") ev.source = task.parent;
			else ev.source = source = source ?? task.parent;

			if (inProgress === false) {
				// end of dnd move
				tree.update(task.id, { $reorder: false });
				dragged.forEach((was, sid) => {
					const t = tasks.byId(sid);
					if (
						t &&
						(!isEqual(t.start, was.start) ||
							!isEqual(t.end, was.end) ||
							!!t.inactive !== !!was.inactive)
					)
						inBus.exec("update-task", {
							id: sid,
							task: { ...t },
							eventSource: "move-task",
							joinUndo: true,
							skipUndo: true,
						});
				});
				dragged.clear();
				this.setState({ tasks });

				source = null;
				return;
			}
			if (
				target === id ||
				tree.contains(id, target) ||
				(grouping && mode !== "before" && mode !== "after")
			) {
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
				const targetTask = tree.byId(target);
				//prevent moving into itself, copy-paste
				let tobj = targetTask;
				let isDirectDescendant = false;
				while (tobj.$level > task.$level) {
					tobj = tree.byId(tobj.parent);
					if (tobj.id === id) isDirectDescendant = true;
				}
				if (isDirectDescendant) return;

				const oldSummary = !grouping && tree.getSummaryId(task.id);

				tree.move(id, mode, target);
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

				if (!grouping) {
					const newSummary = tasks.getSummaryId(id);
					if (oldSummary !== newSummary) {
						const drag = inProgress ? dragged : null;
						if (oldSummary)
							this.resetSummaryDates(
								oldSummary,
								"move-task",
								drag
							);
						if (newSummary)
							this.resetSummaryDates(
								newSummary,
								"move-task",
								drag
							);
					}
				}
			}

			if (inProgress) {
				//smooth dnd requires sync calculations
				this.setState({ tree });
			} else {
				this.setStateAsync({ tasks });
			}

			ev.target = target;
			ev.mode = mode;
		});

		inBus.on("drag-task", (ev: TMethodsConfig["drag-task"]) => {
			const state = this.getState();
			const { tree, _tasks, _selected, rollups, slack, inactiveTasks } =
				state;
			const autoSchedule = !!state.schedule?.auto;
			const task = tree.byId(ev.id);
			const { left, top, width, inProgress } = ev;

			const update: Partial<IData> = {
				_tasks,
				_selected,
			};

			if (typeof width !== "undefined") {
				task.$w = width;
				dragSummary(tree, task, inactiveTasks, autoSchedule);
			}

			if (typeof left !== "undefined") {
				if (task.type === "summary" && !isManualSummary(task, state)) {
					const dx = left - task.$x;
					dragSummaryKids(task, dx, !!rollups, autoSchedule);
				}
				task.$x = left;
				dragSummary(tree, task, inactiveTasks, autoSchedule);
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
			"inactive",
			"base_start",
			"base_end",
			"base_duration",
			"segments",
			"rollup",
			"calendar",
			"deadline",
			"constraint",
		]);

		inBus.on("update-task", (ev: TMethodsConfig["update-task"]) => {
			const { id, segmentIndex, diff, eventSource } = ev;
			// a replay restores the recorded task; recomputing it would read
			// calendars as they stand mid-batch, not as they were recorded
			const replay = this.isHistorySource(eventSource);
			const payload = ev.task;
			let { task } = ev;
			const state = this.getState();
			const {
				tasks,
				_scales,
				durationUnit,
				splitTasks,
				_calendars,
				unscheduledTasks,
				inactiveTasks,
			} = state;
			const update: Partial<IData> = { tasks };
			const t = tasks.byId(id);

			// a remote record is already calculated and saved: write it, and follow up with nothing
			if (this.isRemote(eventSource)) {
				tasks.update(id, task);
				dropUndefined(tasks.byId(id), payload);
				this.markGeometry(
					this.editedRows(
						id,
						task.type === "summary" || t.type === "summary"
					)
				);
				this.setStateAsync(update);
				ev.task = tasks.byId(id);
				return;
			}


			const calendar = this.getTaskCalendar({ ...t, ...task });
			const stateOptions: Partial<IData> = {
				durationUnit,
				splitTasks,
				unscheduledTasks,
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
					// publish only after the complete scheduling cascade has mutated the tree
					tasks.update(id, task);
				} else {
					normalizeDates(task, stateOptions, calendar, t);
					tasks.update(id, task);
				}
				dropUndefined(tasks.byId(id), payload);
				ev.task = tasks.byId(id);
				return;
			}


			const spanReleased =
				isManualSummary(t, state) &&
				"manual" in task &&
				!task.manual &&
				(task.type ?? t.type) === "summary";

			//identify updates that do not take part in dependency calculations
			const hasDateChange =
				spanReleased ||
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
				dropUndefined(tasks.byId(id), payload);
				const updated = tasks.byId(id);
				const canPatch =
					!this.getGrouping() && typeof updated.$x === "number";
				this.markGeometry(canPatch ? "meta" : "all");
				this.setStateAsync({ tasks });
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

			const isSummary = task.type === "summary";
			const manualSummary = isManualSummary(
				{
					type: task.type,
					manual: "manual" in task ? task.manual : t.manual,
				},
				state
			);
			const hasKids = !!t.data?.length;
			const inactiveChanged =
				inactiveTasks &&
				"inactive" in task &&
				!!task.inactive !== !!t.inactive;

			// adjust start date to nearest working day based on drag direction
			if (calendar && task.start && !replay)
				task.start = adjustToWorkingDay(task.start, diff, calendar);

			if (task.start && task.end) {
				if (
					!isEqual(task.start, t.start) ||
					!isEqual(task.end, t.end)
				) {
					if (isSummary && hasKids && !manualSummary) {
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
								const snapCalendar = _calendars
									? this.getTaskCalendar(kid)
									: calendar;
								if (!snapCalendar) return date;
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

			if (!replay) normalizeDates(task, stateOptions, calendar, t);


			tasks.update(id, task);
			dropUndefined(tasks.byId(id), payload);


			if (isSummary) this.deriveSummary(id);

			const summary = tasks.getSummaryId(id);
			if (summary) {
				this.resetSummaryDates(summary, "update-task");
			}

			this.markGeometry(
				this.editedRows(id, isSummary || t.type === "summary")
			);
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

			const { mode, task, show, select = true } = ev;
			// the placeholder resolves to no task - add at the top level
			const target = isPlaceholder(ev.target) ? undefined : ev.target;
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

			if (typeof ev.index === "number" && (!target || mode === "child")) {
				const kids = tasks.byId(task.parent || 0)?.data;
				const len = kids ? kids.length : 0;
				ind = ev.index >= 0 && ev.index < len ? ev.index : -1;
			}

			// a remote record is already calculated and saved: place it, and follow up with nothing
			if (this.isRemote(ev.eventSource)) {
				const newTask = tasks.add(task, ind);
				this.setStateAsync({ tasks });
				ev.id = newTask.id;
				ev.task = newTask;
				return;
			}

			const createUnscheduled =
				(!ev.eventSource || task.unscheduled) && unscheduledTasks;
			if (!createUnscheduled && !task.start) {
				if (parent?.start)
					task.start = new Date(parent.start.valueOf());
				else if (targetObj)
					task.start = new Date(targetObj.start.valueOf());
				else {
					task.start = getDefaultTaskStart(
						{ tasks, durationUnit, _scales },
						calendar
					);
				}
				task.duration = task.duration || 1;
			}

			if (calendar && task.start)
				task.start = adjustToWorkingDay(task.start, 1, calendar);

			if (this.getState().baselines && task.start) {
				task.base_start = task.start;
				task.base_duration = task.duration;
			}

			normalizeDates(
				task,
				{ durationUnit, splitTasks, unscheduledTasks },
				calendar
			);
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

			// scroll to the new placeholder
			if (show && ev.eventSource === "placeholder") {
				setTimeout(() => {
					if (this.getState().placeholderRow)
						this.scrollToTask(PLACEHOLDER_ROW_ID, "y");
				}, 1);
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

			const update: Partial<IData> = {
				tasks,
				links,
			};


			const checkGroup = state.groupBy?.field === "resource";
			if (selected.includes(id) || checkGroup) {
				update.selected = selected.filter(
					sel =>
						sel !== id &&
						(!checkGroup || state.tree.byId(sel)?.$id !== id)
				);
			}

			tasks.remove(id);

			if (summary && !this.isRemote(ev.eventSource)) {
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
				const siblings = tasks.byId(copy.parent)?.data;

				inBus.exec("copy-task", {
					source: id,
					id: newId,
					lazy: !!copy.lazy,
					eventSource: "copy-task",
					joinUndo: true,
					target: copy.parent,
					mode: "child",
					index: siblings?.findIndex(
						(s: IParsedTask) => s.id === newId
					),
					skipUndo: true,
				});
			}

			// relink copied branch links
			linkCopies.forEach(link => {
				inBus.exec("add-link", {
					link: { ...link, id: undefined },
					eventSource: "copy-task",
					joinUndo: true,
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
						left = clamp(left, 0, maxLeft);
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
					if (_chartHeight != null) {
						const maxTop =
							_scales.height +
							_tasks.length * cellHeight -
							_chartHeight;
						top = clamp(top, 0, maxTop);
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
			const {
				tasks,
				links,
				assignments,
				durationUnit,
				splitTasks,
				unscheduledTasks,
				inactiveTasks,
			} = this.getState();
			const parent = tasks.byId(ev.id);

			if (parent.lazy) {
				parent.lazy = false;
				parent.open = true;
			} else parent.data = [];

			tasks.parse(ev.data.tasks, ev.id);

			parseTreeDates(
				tasks,
				{
					durationUnit,
					splitTasks,
					unscheduledTasks,
					inactiveTasks,
				},
				task => this.getTaskCalendar(task),
				ev.id
			);
			// data loaded into a non-summary: find the summary above it
			const owner =
				parent.type === "summary"
					? parent.id
					: tasks.getSummaryId(parent.id);
			if (owner) this.resetSummaryDates(owner, "provide-data");
			const provided = (normalizeLinks(ev.data.links) || []).filter(
				l => tasks.byId(l.source) && tasks.byId(l.target)
			);
			// fixme: DataArray needs the parse() method
			const update: Partial<IData> = {
				tasks,
				links: new DataArray(links.map(l => l).concat(provided)),
			};
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
				const { tasks, tree, _columns } = state;
				let sort = state._sort;
				const sortBy: TSort = { key, order };

				let index = sort?.length || 0;
				if (index && add) {
					sort.forEach((a, i) => {
						if (a.key === key) index = i;
					});
					sort[index] = sortBy;
				} else sort = [sortBy];

				tree.sort(sort, _columns);
				this.setState({ _sort: sort, tree });
			}
		);

		inBus.on("filter-tasks", (ev: IDataMethodsConfig["filter-tasks"]) => {
			const { open, key, value } = ev;
			let filter = ev.filter;

			const state = this.getState();
			const { tree, _columns } = state;

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
				filter = createFilter(
					filterValues,
					_columns as IFilterColumn[]
				);
			}
			tree.filterTree(filter, open ?? true);
			this.setState({ tree, _isFiltered: !!filter, filterValues });
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
			({
				width,
				height,
				scrollSize,
				ganttWidth,
			}: TMethodsConfig["resize-chart"]) => {
				if (ganttWidth != null) {
					const prev = this.getState();
					if (
						ganttWidth !== prev._containerWidth ||
						(scrollSize != null && scrollSize !== prev._scrollSize)
					)
						this.syncLayout(ganttWidth, scrollSize);
				}

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
		inBus.on(
			"resize-grid",
			({
				width,
				section = "grid",
				inProgress,
			}: TMethodsConfig["resize-grid"]) => {
				const isSubGrid = section === "subGrid";
				const state = this.getState();
				if (isSubGrid && !hasSubGridColumns(state.columns)) return;
				const start = (this._resizeStart ??= {
					panels: state._displayPanels ?? state.displayMode,
					gridWidth: state.gridWidth,
					subGridWidth: state.subGridWidth,
				});
				if (!inProgress) this._resizeStart = null;

				const ganttWidth = state._containerWidth;
				if (ganttWidth == null) {
					this.setState(
						isSubGrid
							? { subGridWidth: width }
							: { gridWidth: width }
					);
					return;
				}

				const measure = {
					...getPanelFitMeasure(state, ganttWidth),
					...(isSubGrid
						? { subGridWidth: width }
						: { gridWidth: width }),
					preferredGridWidth: start.gridWidth,
					preferredSubGridWidth: start.subGridWidth,
				};

				const resize = isSubGrid
					? inProgress
						? previewSubGridDrag
						: resolveSubGridDrag
					: inProgress
						? previewGridDrag
						: resolveGridDrag;
				const { panels, ...widths } = resize(start.panels, measure);

				if (inProgress) {
					this.setState({ ...widths, _displayPanels: panels });
					return;
				}

				this.setState(widths);
				if (!samePanels(panels, start.panels))
					this.in.exec("set-display-mode", { mode: panels });
				else if (!samePanels(state._displayPanels, start.panels))
					this.setState({ _displayPanels: start.panels });
			}
		);
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
				const state = this.getState();
				const hasSubGrid = hasSubGridColumns(state.columns);
				let panels = normalizeDisplayMode(mode, hasSubGrid);

				if (state._compactMode) {
					this.setState({
						_displayPanels: toCompactPanels(
							panels,
							state._displayPanels
						),
					});
					return;
				}

				const width = state._containerWidth;
				if (width != null) {
					panels = resolvePanelChange(
						state._displayPanels ?? state.displayMode,
						panels,
						getPanelFitMeasure(state, width)
					);
				}

				const openingGrid =
					!(state._displayPanels ?? state.displayMode).includes(
						"grid"
					) && panels.includes("grid");
				this.setState({
					displayMode: panels,
					...(openingGrid &&
					state.gridWidth <= getCollapseThreshold(state)
						? { gridWidth: getDefaultGridWidth(state.columns) }
						: {}),
				});
				this.resyncLayout();
			}
		);
	}

	init(config: Partial<IDataConfig>) {
		// normalized in place, tasks into a tree - keep it off the caller's object
		const state = { ...config };
		const prev = this.getState();
		const preserveLayout = !!prev.area;

		const update: Partial<IDataConfig> = preserveLayout
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
					showConflicts: false,
					_compactMode: false,
					_containerWidth: null,
					_chartHeight: null,
				};

		if (state.cellWidth) state._cellWidth = state.cellWidth;
		// inclusiveEnd applies to the day unit only
		if (state.inclusiveEnd && (state.durationUnit ?? "day") !== "day")
			state.inclusiveEnd = false;
		const rawColumns = state.columns ?? prev.columns;
		const nextColumns = rawColumns === false ? undefined : rawColumns;
		this.prepareLayoutConfig(state, prev, nextColumns, preserveLayout);

		if (isCommunity()) {
			state.unscheduledTasks = false;
			state.inactiveTasks = false;
			state.placeholderRow = false;
			state.baselines = false;
			state.markers = EMPTY;
			state._markers = EMPTY;
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
			state._calendars = new Map();
			state._composites = null;
			state.groupBy = null;
			state.wbs = null;
			state.progressLine = null;
			state.deadlines = false;
			state.sCurve = null;
			state._sCurve = null;
			state._sCurvePoints = null;
			state.conflicts = EMPTY;
			state.showConflicts = false;
			state._conflicts = null;
		}

		const tasksChanged = this.changed(state, "tasks");
		const inclusiveEndChanged = this.changed(state, "inclusiveEnd");
		this.resolveCalendars(state, prev, tasksChanged);


		if (this.changed(state, ...TRIGGERS.geometry)) this.markGeometry("all");

		// must stay above the block below: tasks, resources and assignments are
		// still the raw config there, and changed() compares against it
		for (const k in state)
			if (k[0] !== "_")
				(this._prevConfig as Record<string, unknown>)[k] =
					state[k as keyof IDataConfig];

		// data collections are rebuilt only when changed; unchanged ones are
		// omitted so the router keeps the existing instances

		if (tasksChanged && state.tasks) {
			const tree = new GanttDataTree(state.tasks);
			const calendars: Partial<IData> = {
			};
			parseTreeDates(
				tree,
				{
					durationUnit: state.durationUnit,
					splitTasks: state.splitTasks,
					unscheduledTasks: state.unscheduledTasks,
					inactiveTasks: state.inactiveTasks,
				},
				task => this.resolveTaskCalendar(task, calendars)
			);
			state.tasks = tree as unknown as ITask[];
		} else if (state.tasks) delete state.tasks;

		this.resetDatasetState(
			tasksChanged,
		);


		this._router.init({
			selected: EMPTY,
			markers: EMPTY,
			progressLine: false,
			sCurve: false,
			autoScale: true,
			durationUnit: "day",
			inclusiveEnd: false,
			highlightTime: null,
			focusTask: null,
			_sort: null,
			_resourceSort: null,
			conflicts: EMPTY,
			...update,
			...state,
		});

		if (state.displayMode) this.resyncLayout();

		// the end-like column getters changed: the matched rows follow the new display
		if (inclusiveEndChanged && !tasksChanged && this.getState()._isFiltered)
			this.in.exec("filter-tasks", { open: true });

	}

	private isHistorySource(eventSource?: string): boolean {
		return eventSource === "undo" || eventSource === "redo";
	}

	private isRemote(eventSource?: string): boolean {
		return eventSource === "remote";
	}

	private resetDatasetState(
		tasks: boolean,
		resources?: boolean,
		history?: boolean
	) {
		const state = this.getState();
		if (tasks) {
			// filtering and sort belong to the task list, reset them with it
			if (state._isFiltered) {
				state.tree.filterTree();
				this.setState({ _isFiltered: false, filterValues: {} });
			}
			if (state._sort) this.setState({ _sort: null });
		}
	}

	private changed(state: Partial<IDataConfig>, ...keys: TConfigKey[]) {
		return keys.some(key => {
			const [k, sub] = key.split(".") as [keyof IDataConfig, string?];
			if (!(k in state)) return false; // not part of this update
			let a = this._prevConfig[k] as any;
			let b = state[k] as any;
			if (sub) {
				a = a?.[sub];
				b = b?.[sub];
			}
			return a !== b && !isSame(a, b);
		});
	}

	// Shape layout-related init fields: defaults on first paint, preserve on reinit.
	private prepareLayoutConfig(
		state: Partial<IDataConfig>,
		prev: IData,
		nextColumns: IGanttColumn[] | undefined,
		preserveLayout: boolean
	) {
		const columns =
			nextColumns ??
			getDefaultColumns({
				resources: state.resources,
				wbs: state.wbs,
			});
		const hasSubGrid = hasSubGridColumns(columns);

		if (!preserveLayout || this.changed(state, "displayMode")) {
			state.displayMode = normalizeDisplayMode(
				state.displayMode,
				hasSubGrid
			);
		} else if (!hasSubGrid && prev.displayMode?.includes("subGrid")) {
			// Columns lost subGrid — remove it from displayMode
			state.displayMode = normalizeDisplayMode(prev.displayMode, false);
		} else {
			delete state.displayMode;
		}

		if (!preserveLayout) {
			state.gridWidth ??= getDefaultGridWidth(columns);
			state.subGridWidth ??= hasSubGrid
				? getDefaultGridWidth(columns, "subGrid")
				: 0;
		}
	}

	// Re-run layout with the last container size
	private resyncLayout() {
		const { _containerWidth, _scrollSize } = this.getState();
		if (_containerWidth == null) return;
		this.syncLayout(_containerWidth, _scrollSize);
	}

	private syncLayout(width: number | null | undefined, scrollSize?: number) {
		const state = this.getState();
		const result = resolveLayout(state, { width, scrollSize });

		const updates: Partial<IData> = {
			_containerWidth: width,
		};
		if (scrollSize != null) updates._scrollSize = scrollSize;
		if (result.compactMode !== state._compactMode)
			updates._compactMode = result.compactMode;
		if (result.displayPanels) updates._displayPanels = result.displayPanels;
		if (result.gridWidth !== state.gridWidth)
			updates.gridWidth = result.gridWidth;
		if (result.subGridWidth !== state.subGridWidth)
			updates.subGridWidth = result.subGridWidth;

		this.setState(updates);
	}


	setState(state: Partial<IData>, ctx?: TDataConfig) {
		return this._router.setState(state, ctx);
	}

	setStateAsync(state: Partial<IData>) {
		this._router.setStateAsync(state);
	}

	// leaf edits affect only the task and summary chain; summary edits can move descendants
	private editedRows(id: TID, summary: boolean): Set<TID> | "all" {
		if (summary) return "all";
		const rows = new Set<TID>([id]);
		const anc = this.getState().tasks.getSummaryId(id, true);
		if (Array.isArray(anc)) anc.forEach(a => rows.add(a));
		else if (anc != null) rows.add(anc);
		return rows;
	}

	// accumulates over a tick, drained by the _tasks derivation
	// "meta" must travel with a write reaching _tasks, or it leaks into the
	// next pass and suppresses bounds and rollups
	private markGeometry(work: "all" | "meta" | Iterable<TID>) {
		if (work === "all") {
			this._pendingGeometry = "all";
			return;
		}
		if (work === "meta") {
			// meta cannot weaken pending work
			if (this._pendingGeometry === null) this._pendingGeometry = "meta";
			return;
		}
		if (this._pendingGeometry === "all") return;
		if (this._pendingGeometry instanceof Set)
			for (const id of work) this._pendingGeometry.add(id);
		else this._pendingGeometry = new Set(work);
	}

	getTask(id: TID) {
		const { tree } = this.getState();
		return tree.byId(id);
	}

	getLinkValidator(): TLinkValidator {
		return () => null;
	}

	getResource(id: TID) {
		const { resources } = this.getState();
		return resources?.byId(id);
	}

	getHistory() {
		if (!this.getState().undo) return null;
		return this._modules.get("historyManager") as
			| IHistoryManager
			| undefined;
	}

	getCalendar(id?: TID): ICalendar | undefined {
		const { _calendar, _calendars } = this.getState();
		return _calendars?.get(id) ?? _calendar ?? undefined;
	}

	private buildHighlightTime() {
		return (day: Date, unit: TDurationUnit) => {
			const cal = this.getCalendar();
			if (!cal) return "";
			if ((unit === "day" || unit === "hour") && !cal.isWorkingDay(day))
				return "wx-weekend";
			return "";
		};
	}

	getTaskCalendar(task: Partial<ITask>): ICalendar | undefined {
		const state = this.getState();
		if (!state._calendar && !state._calendars?.size) return undefined;
		return this.resolveTaskCalendar(task, state);
	}

	// state is the live one, or the context init builds before the router has it
	private resolveTaskCalendar(
		task: Partial<ITask>,
		state: Partial<IData>
	): ICalendar | undefined {
		const { _calendar, _calendars } = state;
		const getCalendar = (id?: TID) =>
			_calendars?.get(id) ?? _calendar ?? undefined;
		return getCalendar(task?.calendar);
	}

	private indexAssignments(
		assignments: Pick<IAssignment[], "forEach"> | undefined
	) {
		const index: IDataAssignment = { byTask: {}, byResource: {} };
		return index;
	}

	private resolveCalendars(
		state: Partial<IDataConfig>,
		prev: IData,
		tasksChanged: boolean
	): void {
	}

	getResourceCalendar(resource: Partial<IResource>): ICalendar | undefined {
		return this.getCalendar(resource?.calendar);
	}


	getGrouping() {
		if (!this.getState().groupBy?.field) return null;
		return this._modules.get("groupManager") as IGroupManager | undefined;
	}

	serialize(config?: { data: TDataName }) {
		const name = config?.data || "tasks";
		if (name === "calendars") {
			const { _calendars } = this.getState();
			return [..._calendars.entries()].map(
				([id, instance]: [TID, ICalendar]) => ({
					...(instance?.serialize?.() || {}),
					...(instance?.css ? { css: instance.css } : {}),
					id,
				})
			);
		}

		const collection = this.getState()[name];
		if (collection) {
			if (collection instanceof DataTree) return collection.serialize();
			if (collection instanceof DataArray)
				return collection.map(obj => obj);
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

	private resetSummaryDates(
		id: TID,
		eventSource: string,
		drag?: Map<TID, Partial<ITask>>
	) {
		if (this.deriveSummary(id, eventSource, drag)) {
			const summary = this.getState().tasks.getSummaryId(id);
			if (summary) this.resetSummaryDates(summary, eventSource, drag);
		}
	}

	// re-derives one summary, writing it back and returning true if it changed
	private deriveSummary(
		id: TID,
		eventSource?: string,
		drag?: Map<TID, Partial<ITask>>
	) {
		const {
			tasks,
			durationUnit,
			splitTasks,
			unscheduledTasks,
			inactiveTasks,
			schedule,
		} = this.getState();
		const obj = tasks.byId(id);
		const kids = obj.data;
		if (obj.type !== "summary" || !kids?.length) return false;
		const holdsSpan =
			isManualSummary(obj, { schedule }) && !!(obj.start && obj.end);

		const task = setSummaryDates(
			{
				...obj,
				start: undefined,
				end: undefined,
				duration: undefined,
			},
			unscheduledTasks,
			inactiveTasks
		);

		const spanChanged =
			!holdsSpan &&
			!!task.start &&
			this.isScheduled(kids) &&
			(!isEqual(obj.start, task.start) || !isEqual(obj.end, task.end));
		const inactiveChanged = !!task.inactive !== !!obj.inactive;

		if (!spanChanged && !inactiveChanged) return false;
		if (!spanChanged) {
			task.start = obj.start;
			task.end = obj.end;
			task.duration = obj.duration;
		}

		if (!eventSource) {
			normalizeDates(
				task,
				{
					durationUnit,
					splitTasks,
					unscheduledTasks,
				},
				this.getTaskCalendar(task)
			);
			tasks.update(id, task);
		} else {
			if (drag && !drag.has(id))
				drag.set(id, {
					start: obj.start,
					end: obj.end,
					inactive: obj.inactive,
				});
			this.in.exec("update-task", {
				id,
				task,
				eventSource,
				joinUndo: true,
				skipUndo: true,
				...(drag ? { inProgress: true, skipProvider: true } : {}),
			});
		}

		return true;
	}


	private moveSummaryKids(
		task: Partial<ITask>,
		move: (date: Date, kid: IParsedTask) => Date,
		eventSource: string
	) {
		const { unscheduledTasks, schedule } = this.getState();

		task.data.forEach((kid: IParsedTask) => {
			if (schedule?.auto && kid.manual) return;
			if (!(unscheduledTasks && kid.unscheduled)) {
				this.in.exec("update-task", {
					id: kid.id,
					task: { start: move(kid.start, kid) },
					eventSource,
					joinUndo: true,
					skipUndo: true,
				});
			}

			if (kid.data?.length) {
				this.moveSummaryKids(kid, move, eventSource);
				if (kid.type === "summary") {
					this.deriveSummary(kid.id, eventSource);
				}
			}
		});
	}

	// one reused instance for _tasks patching check
	getPlaceholderRow(): IParsedTask {
		if (!this._placeholderRow)
			this._placeholderRow = createPlaceholderRow();
		return this._placeholderRow;
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

		const row = _tasks[index];
		const task = row.$placeholder ? row : this.getTask(row.id);
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
		} else if (
			_chartHeight != null &&
			scrollY + cellHeight > scrollTop + _chartHeight
		) {
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
			index?: number;
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
			focus?: TDisplayPanel;
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
			index?: number;
			eventSource?: string;
			skipUndo?: boolean;
		};
		["move-task"]: {
			id: TID;
			target?: TID;
			mode: "before" | "after" | "up" | "down" | "child";
			inProgress?: boolean;
			source?: TID;
			eventSource?: string;
			skipUndo?: boolean;
		};
		["indent-task"]: { id: TID; mode: boolean };

		["show-editor"]: { id: TID };
		["show-conflicts"]: { mode?: boolean };
		["add-link"]: {
			id?: TID;
			link: Partial<ILink>;
			eventSource?: string;
		};
		["update-link"]: { id: TID; link: Partial<ILink> };
		["delete-link"]: { id: TID; reason?: InvalidLinkReason };

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
		["resize-chart"]: {
			width: number;
			height: number;
			scrollSize: number;
			ganttWidth?: number;
		};
		["schedule-tasks"]: {
			id?: TID;
			task?: Partial<ITask>;
			link?: TID;
			skipUndo?: boolean;
		};
		["undo"]: void;
		["redo"]: void;
		["split-task"]: { id: TID; segmentIndex?: number };
		["export-data"]: IExportConfig;
		["import-data"]: { data: string; format?: "mspx" };
		["add-assignment"]: {
			id?: TID;
			assignment: Partial<IAssignment>;
			eventSource?: string;
		};
		["delete-assignment"]: { id: TID; eventSource?: string };
		["update-assignment"]: {
			id: TID;
			assignment: Partial<IAssignment>;
			eventSource?: string;
		};
		["resize-grid"]: {
			width: number;
			section?: TColumnSection;
			inProgress?: boolean;
		};
		["set-columns"]: { columns: IGanttColumn[] };
		["set-display-mode"]: { mode: TDisplayModeConfig };
		["open-resource-row"]: { id: TID; mode: boolean };
		["sort-resources"]: {
			key: string;
			order: "asc" | "desc";
			add?: boolean;
			_columns: IResourceColumn[];
		};
		["set-conflicts"]: { conflicts: IConflict[] };
	},
	{
		skipProvider?: boolean;
		skipUndo?: boolean;
		joinUndo?: boolean;
		[key: string]: any;
	}
>;
