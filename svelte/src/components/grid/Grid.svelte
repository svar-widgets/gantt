<script>
	import { getContext, onDestroy } from "svelte";
	import { locateID } from "@svar-ui/lib-dom";
	import { reorder, followReorder } from "../../helpers/reorder";
	import {
		prepareEditTask,
		setTaskResources,
		getHeaderLength,
		isPlaceholder,
		getPlaceholderTask,
	} from "@svar-ui/gantt-store";

	import { Grid } from "@svar-ui/svelte-grid";
	import TextCell from "./TextCell.svelte";
	import ActionCell from "./ActionCell.svelte";
	import ResourcesCell from "./ResourcesCell.svelte";
	import EditorResourcesCell from "./EditorResourcesCell.svelte";

	import {
		getGridMinHeight,
		getGridStyle,
		getFlexBasis,
		getScrollX,
		getFitColumns,
		getFillColumn,
		getColumnsWidth,
		getSortMarks,
		getColumnStyle,
	} from "../../helpers/grid";

	let { readonly, section = "grid", tableAPI = $bindable() } = $props();

	const isSubGrid = $derived(section === "subGrid");

	const _ = getContext("wx-i18n").getGroup("gantt");
	const api = getContext("gantt-store");

	const {
		scrollTop,
		cellHeight,
		focusTask,
		_selected: selected,
		area,
		_tasks: rTasks,
		_scales: scales,
		_columns,
		_sort: sort,
		durationUnit,
		inclusiveEnd,
		splitTasks,
		unscheduledTasks,
		inactiveTasks,
		filterValues,
		groupBy,
		gridWidth,
		subGridWidth,
		_displayPanels,
		_compactMode,
		_columnsWidth,
	} = api.getReactiveState();

	const panelWidth = $derived(isSubGrid ? $subGridWidth : $gridWidth);
	const fillRemaining = $derived(
		isSubGrid && !$_displayPanels.includes("chart")
	);

	let dragTask = $state(null);

	let columnWidth = $state(0);

	function execAction(id, action) {
		// no task behind the placeholder to target
		if (isPlaceholder(id)) return;
		if (action === "add-task") {
			api.exec(action, {
				target: id,
				task: { text: _("New task") },
				mode: "child",
				show: true,
				focus: id ? "grid" : null,
			});
		} else if (action === "open-task") {
			const task = tasks.find(a => a.id === id);
			if (task.data || task.lazy)
				api.exec(action, { id, mode: !task.open });
		}
	}

	function createPlaceholder(task) {
		const ev = {
			task: getPlaceholderTask(task, _("New task")),
			show: true,
			eventSource: "placeholder",
		};
		api.exec("add-task", ev);
		return ev.id;
	}

	function onClick(e) {
		if (e.detail > 1) return;
		const id = locateID(e);
		const action = e.target.dataset.action;
		if (action) e.preventDefault();
		if (id) {
			if (action === "add-task" || action === "open-task") {
				execAction(id, action);
			} else {
				api.exec("select-task", {
					id,
					toggle: e.ctrlKey || e.metaKey,
					range: e.shiftKey,
					show: "xy",
					focus: isSubGrid ? "subGrid" : "grid",
				});
			}
		} else if (action === "add-task") {
			execAction(null, action);
		}
	}

	function onDblClick(e) {
		if (!readonly) {
			const id = locateID(e);
			if (isPlaceholder(id)) return;
			const column = locateID(e, "data-col-id");
			const columnObj = column && cols.find(c => c.id === column);
			if (!columnObj?.editor && id && !isSubGrid)
				api.exec("show-editor", { id });
		}
	}

	let lastDetail;
	function reorderTasks(detail) {
		const id = detail.id;
		const { before, after } = detail;
		const inProgress = detail.onMove;
		let target = before || after;
		let mode = before ? "before" : "after";
		if (inProgress) {
			if (mode === "after") {
				const index = allTasks.findIndex(t => t.id === id);
				const targetIndex = allTasks.findIndex(t => t.id === target);
				const task = allTasks[targetIndex];
				if (index - targetIndex === 1) {
					mode = "before";
				} else if (!$groupBy?.field && task.data && task.open) {
					mode = "before";
					target = task.data[0].id;
				}
			}
			lastDetail = { id, [mode]: target };
		} else lastDetail = null;

		api.exec("move-task", {
			id,
			mode,
			target,
			inProgress,
		});
	}

	function startReorder({ id }) {
		if (readonly || isSubGrid) return false;
		if ($groupBy?.field) {
			const task = api.getTask(id);
			if (task.$group || task.data) return false;
		}

		if (api.getTask(id).open) api.exec("open-task", { id, mode: false });

		dragTask = tasks.find(t => t.id === id);
		if (!dragTask) return false;
	}

	function endReorder({ id, top }) {
		//task was moved
		if (lastDetail) reorderTasks({ ...lastDetail, onMove: false });
		//restore previous position
		else {
			api.exec("drag-task", {
				id,
				top: top + scrollDelta,
				inProgress: false,
			});
		}
		dragTask = null;
	}

	function moveReorder({ id, top, detail }) {
		if (detail) {
			reorderTasks({ ...detail, onMove: true });
		}

		api.exec("drag-task", {
			id,
			top: top + scrollDelta,
			inProgress: true,
		});
	}

	let gridClientWidth = $state(0);
	let gridClientHeight = $state(0);

	let tableContainer = $state();

	function handleHotkey(ev) {
		const { key, isInput } = ev;
		if (!isInput && (key === "arrowup" || key === "arrowdown")) {
			ev.eventSource = isSubGrid ? "subGrid" : "grid";
			api.exec("hotkey", ev);
			return false;
		} else if (key === "enter") {
			const focusCell = tableAPI.getState().focusCell;
			if (focusCell) {
				const { row, column } = focusCell;
				if (column === "add-task") {
					execAction(row, "add-task");
				} else if (column === "text") {
					execAction(row, "open-task");
				}
			}
		}
	}

	function init(tapi) {
		tableAPI = tapi;
		tapi.intercept("hotkey", handleHotkey);
		tapi.intercept("select-row", () => false);
		tapi.intercept("scroll", () => false);
		tapi.intercept("sort-rows", ev => {
			const { key, add } = ev;
			let keySort = $sort ? $sort.find(s => s.key === key) : null;
			let order = "asc";
			if (keySort)
				order = !keySort || keySort.order === "asc" ? "desc" : "asc";

			api.exec("sort-tasks", {
				key,
				order,
				add,
			});
			return false;
		});
		tapi.intercept("filter-rows", ev => {
			const { key, value } = ev;

			api.exec("filter-tasks", {
				key,
				value,
				open: true,
			});
			return false;
		});

		tapi.intercept("resize-column", ev => {
			ev.flexgrowFallback = getFillColumn(cols, ev.id);
		});

		tapi.on("resize-column", ev => {
			const columns = tapi.getState().columns;
			columnWidth = getColumnsWidth(columns);
			if (ev.inProgress !== true) api.exec("set-columns", { columns });
		});

		tapi.on("hide-column", () => {
			const columns = tapi.getState().columns;
			columnWidth = getColumnsWidth(columns);
			api.exec("set-columns", { columns });
		});

		tapi.intercept("update-cell", e => {
			const { id, column, value } = e;
			const task = tasks.find(t => t.id === id);
			if (task) {
				if (column === "resources") {
					if (task.$placeholder) {
						const history = api.getHistory();
						if (history) history.startBatch();
						const newId = createPlaceholder(task);
						if (newId) setTaskResources(newId, value, api);
						if (history) history.endBatch();
					} else setTaskResources(id, value, api);
					return;
				}

				let v = value;
				if (
					typeof v !== "boolean" &&
					v &&
					!isNaN(v) &&
					!(v instanceof Date)
				)
					v *= 1;
				const update = { ...task };
				const col = $_columns.find(c => c.id === column);
				if (col?.setter) col.setter(update, v);
				else update[column] = v;
				prepareEditTask(
					update,
					{
						durationUnit: $durationUnit,
						splitTasks: $splitTasks,
						unscheduledTasks: $unscheduledTasks,
					},
					api.getTaskCalendar(update),
					column
				);

				if (task.$placeholder) {
					createPlaceholder(update);
				} else {
					api.exec("update-task", {
						id: id,
						task: update,
					});
				}
			}
			return false;
		});
	}
	// COLUMNS
	// --------

	const cols = $derived.by(() => {
		// end-like column getters read the mode: new columns redraw the cells
		$inclusiveEnd;
		let cols = $_columns.map(col => {
			col = { ...col };
			const header = [...col.header];
			header.forEach(line => {
				if (line.text) line.text = _(line.text);
			});
			col.header = header;
			// in readonly mode we must disable column inline editors entirely.
			// otherwise grid will open per-cell editors on dblclick.
			col.editor = readonly ? null : col.editor;
			return col;
		});

		const ti = cols.findIndex(c => c.id === "text");
		const ai = cols.findIndex(c => c.id === "add-task");
		const ri = cols.findIndex(c => c.id === "resources");

		if (ti !== -1) {
			if (cols[ti].cell) cols[ti]._cell = cols[ti].cell;
			cols[ti].cell = TextCell;
		}
		if (ri !== -1) {
			const resCol = cols[ri];
			if (!resCol.cell) resCol.cell = ResourcesCell;
			if (resCol.editor && typeof resCol.editor !== "function") {
				const editor = resCol.editor;
				const config = editor.config;
				if (!config.cell) config.cell = EditorResourcesCell;
				config.cell = EditorResourcesCell;
				if (!config.dropdown) config.dropdown = { width: "auto" };
				resCol.editor = row => {
					if (row.type !== "summary") return editor;
				};
			}
		}
		if (ai !== -1 && !isSubGrid) {
			cols[ai].cell = cols[ai].cell || ActionCell;
			const header = cols[ai].header[0];
			cols[ai].header[0].cell = header.cell || ActionCell;

			if (readonly) {
				cols.splice(ai, 1);
			} else {
				if ($_compactMode) {
					const [actionCol] = cols.splice(ai, 1);
					cols.unshift(actionCol);
				}
			}
		}

		cols = cols.filter(c => (c.section || "grid") === section);
		if (cols.length > 0) cols[cols.length - 1].resize = false;
		return cols;
	});

	$effect.pre(() => {
		columnWidth = getColumnsWidth(cols);
	});

	// SIZES
	// --------
	// --------
	const scrollDelta = $derived($area.from);
	const headerHeight = $derived($scales.height);
	const flexBasis = $derived(
		getFlexBasis(
			$_columns,
			$_displayPanels,
			panelWidth,
			section,
			fillRemaining
		)
	);
	const scrollX = $derived(
		getScrollX(
			$_compactMode,
			$_displayPanels,
			columnWidth,
			gridClientWidth,
			panelWidth,
			section,
			fillRemaining
		)
	);
	const tableHeight = $derived(
		getGridMinHeight(gridClientHeight, $cellHeight)
	);
	const tableStyle = $derived(
		tableHeight +
			getGridStyle($_displayPanels, columnWidth, scrollX, section)
	);

	// --------
	// SELECTION
	// --------
	const sel = $derived($selected.map(o => o.id));

	// --------
	// TASKS
	// --------

	const tasks = $derived($rTasks.slice($area.start, $area.end));
	const reorderTask = $derived(
		isSubGrid ? $rTasks.find(task => task.$reorder) : null
	);
	const allTasks = $derived.by(() => {
		const extra = dragTask || reorderTask;
		const rows =
			extra && !tasks.find(t => t.id === extra.id)
				? [...tasks, extra]
				: tasks;
		return rows.map(t => ({ ...t }));
	});

	let sortMarks = $derived(getSortMarks(allTasks, $sort));

	// preserve filters while sorting
	let filters = $derived.by(() => {
		return sortMarks ? { ...$filterValues } : $filterValues;
	});

	const fitColumns = $derived(
		getFitColumns(
			cols,
			$_displayPanels,
			section,
			"add-task",
			$_columnsWidth
		)
	);
	const visibleHeaderLength = $derived(getHeaderLength(fitColumns));

	const bodyOffset = $derived(scrollDelta - $scrollTop);

	let focusFrame;
	const unsubFocusTask = focusTask.subscribe(value => {
		if (!value) return;
		const { id, section } = value;
		if (section !== (isSubGrid ? "subGrid" : "grid")) return;
		if (focusFrame) return;
		focusFrame = requestAnimationFrame(() => {
			focusFrame = 0;
			const { focusCell, editor } = tableAPI.getState();
			if (!editor) {
				tableAPI.exec("focus-cell", {
					row: id,
					column: focusCell?.column || cols[0]?.id,
				});
			}
		});
	});
	onDestroy(() => {
		unsubFocusTask();
		if (focusFrame) cancelAnimationFrame(focusFrame);
		tableAPI = null;
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="wx-table-container"
	class:wx-table-container-subgrid={isSubGrid}
	data-gantt-section={section}
	style="flex: {fillRemaining ? '1 1' : '0 0'} {flexBasis}; min-width: 0;"
	bind:clientWidth={gridClientWidth}
	bind:clientHeight={gridClientHeight}
	bind:this={tableContainer}
>
	<div
		style="{tableStyle}--wx-body-offset:{bodyOffset}px;"
		class="wx-table"
		use:reorder={{
			start: startReorder,
			end: endReorder,
			move: moveReorder,
			getTask: api.getTask,
		}}
		use:followReorder={isSubGrid ? { api } : null}
		onclick={onClick}
		ondblclick={onDblClick}
	>
		<Grid
			{init}
			sizes={{
				rowHeight: $cellHeight,
				headerHeight: headerHeight / visibleHeaderLength,
			}}
			rowStyle={row => {
				let style = row.$placeholder
					? "wx-placeholder-row"
					: row.$reorder
						? "wx-reorder-task"
						: "";
				if ($inactiveTasks && row.inactive)
					style += (style ? " " : "") + "wx-inactive-row";
				return style;
			}}
			columnStyle={getColumnStyle}
			data={allTasks}
			columns={fitColumns}
			selectedRows={[...sel]}
			{sortMarks}
			filterValues={filters}
		/>
	</div>
</div>

<style>
	.wx-table-container {
		display: flex;
		flex-direction: column;
		border-right: var(--wx-gantt-border);
		overflow-x: auto;
		overflow-y: hidden;
		height: 100%;
		box-sizing: content-box;
	}

	.wx-table-container-subgrid {
		border-right: none;
		border-left: var(--wx-gantt-border);
	}

	/*table*/
	.wx-table {
		--wx-table-select-background: var(--wx-gantt-select-color);
		--wx-table-select-focus-background: var(--wx-gantt-select-color);
		--wx-table-select-border: none;
		--wx-table-cell-border: var(--wx-grid-body-row-border);
		--wx-table-header-background: var(--wx-background);
		--wx-table-header-border: var(--wx-gantt-border);
		--wx-table-header-cell-border: var(--wx-gantt-border);
		height: 100%;
	}
	.wx-table :global(.wx-grid .wx-table-box) {
		border: none;
	}
	.wx-table :global(.wx-grid .wx-scroll) {
		overflow: visible !important;
	}
	.wx-table :global(.wx-grid .wx-scroll .wx-body) {
		top: var(--wx-body-offset, 0);
	}
	.wx-table :global(.wx-grid .wx-scroll .wx-body),
	.wx-table :global(.wx-grid .wx-scroll .wx-header) {
		width: 100% !important;
	}
	/*body*/
	.wx-table :global(.wx-grid .wx-cell) {
		padding: 0 var(--wx-grid-cell-padding-x);
		height: 100%;
		display: flex;
		align-items: center;
	}
	.wx-table :global(.wx-body .wx-cell:not([tabindex="0"])) {
		outline: none;
	}
	.wx-table :global(.wx-grid .wx-row) {
		display: flex;
		align-items: center;
	}
	.wx-table :global(.wx-grid .wx-cell.wx-text-center) {
		justify-content: center;
	}
	.wx-table :global(.wx-grid .wx-cell.wx-text-right) {
		justify-content: end;
	}
	.wx-table :global(.wx-grid .wx-body .wx-cell) {
		border-right: var(--wx-grid-body-cell-border);
	}
	.wx-table :global(.wx-grid .wx-cell:has(input, .wx-value)) {
		height: 100%;
		padding: 0;
	}
	.wx-table :global(.wx-grid .wx-body .wx-cell.wx-col-text) {
		padding-left: var(--wx-grid-tree-column-padding-left);
	}
	/*header*/
	.wx-table :global(.wx-grid .wx-header .wx-cell) {
		font: var(--wx-grid-header-font);
		text-transform: var(--wx-grid-header-text-transform);
	}
	.wx-table :global(.wx-grid .wx-header .wx-h-row:not(:last-child) .wx-cell) {
		border-bottom-color: transparent;
	}
	.wx-table :global(.wx-grid .wx-header .wx-cell.wx-filter) {
		padding: 0 5px;
	}
	.wx-table :global(.wx-grid .wx-header .wx-cell:has(.wx-sort)) {
		padding-right: var(--wx-grid-header-sort-padding-right);
	}
	.wx-table :global(.wx-grid .wx-header .wx-cell .wx-text) {
		width: 100%;
	}
	.wx-table :global(.wx-grid .wx-header .wx-cell:has(.wx-sort) .wx-text) {
		width: calc(100% - 15px);
	}
	.wx-table :global(.wx-grid .wx-header .wx-cell.wx-text-right) {
		text-align: right;
	}
	.wx-table :global(.wx-grid .wx-header .wx-cell.wx-text-center) {
		text-align: center;
	}
	.wx-table :global(.wx-grid .wx-header .wx-cell.wx-text-center.wx-action) {
		justify-content: center;
	}
	.wx-table :global(.wx-grid .wx-header .wx-cell.wx-text-right.wx-action) {
		justify-content: right;
	}

	/*drag element*/
	.wx-table :global(.wx-grid .wx-reorder-task.wx-row) {
		width: 100%;
		background: var(--wx-background-alt);
		border-top: var(--wx-grid-body-row-border);
		z-index: 1;
	}
	.wx-table :global(.wx-grid .wx-reorder-task.wx-selected) {
		background: var(--wx-gantt-select-color);
		border-top: transparent;
		border-bottom: transparent;
	}
	.wx-table :global(.wx-grid .wx-inactive-row.wx-row) {
		color: var(--wx-gantt-inactive-color);
	}
	/*placeholder row*/
	.wx-table :global(.wx-grid .wx-placeholder-row) {
		color: var(--wx-color-font-disabled);
	}
</style>
