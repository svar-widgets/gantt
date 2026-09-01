<script>
	import { getContext } from "svelte";
	import { locateID } from "@svar-ui/lib-dom";
	import { reorder } from "../../helpers/reorder";
	import { prepareEditTask } from "@svar-ui/gantt-store";

	import { Grid } from "@svar-ui/svelte-grid";
	import TextCell from "./TextCell.svelte";
	import ActionCell from "./ActionCell.svelte";
	import ResourcesCell from "./ResourcesCell.svelte";
	import EditorResourcesCell from "./EditorResourcesCell.svelte";
	import { setTaskResources } from "../../helpers/setTaskResources.js";

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

	let { readonly, tableAPI = $bindable() } = $props();

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
		_headerLength,
		columns,
		_sort: sort,
		durationUnit,
		splitTasks,
		filterValues,
		groupBy,
		gridWidth,
		displayMode,
		_compactMode,
	} = api.getReactiveState();

	let dragTask = $state(null);

	let columnWidth = $state(0);

	function execAction(id, action) {
		if (action === "add-task") {
			api.exec(action, {
				target: id,
				task: { text: _("New Task") },
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
					focus: "grid",
				});
			}
		} else if (action === "add-task") {
			execAction(null, action);
		}
	}

	function onDblClick(e) {
		if (!readonly) {
			const id = locateID(e);
			const column = locateID(e, "data-col-id");
			const columnObj = column && cols.find(c => c.id === column);
			if (!columnObj?.editor && id) api.exec("show-editor", { id });
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
				} else if (task.data && task.open) {
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
		if (readonly) return false;

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
			ev.eventSource = "grid";
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
					setTaskResources(id, value, api);
					return;
				}

				const update = { ...task };
				let v = value;
				if (v && !isNaN(v) && !(v instanceof Date)) v *= 1;
				update[column] = v;
				prepareEditTask(
					update,
					{
						durationUnit: $durationUnit,
						splitTasks: $splitTasks,
					},
					api.getTaskCalendar(update),
					column
				);

				api.exec("update-task", {
					id: id,
					task: update,
				});
			}
			return false;
		});
	}

	// COLUMNS
	// --------

	const cols = $derived.by(() => {
		let cols = $columns.map(col => {
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
		if (ai !== -1) {
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
		getFlexBasis($columns, $displayMode, $gridWidth)
	);
	const scrollX = $derived(
		getScrollX(
			$_compactMode,
			$displayMode,
			columnWidth,
			gridClientWidth,
			$gridWidth
		)
	);
	const tableHeight = $derived(
		getGridMinHeight(gridClientHeight, $cellHeight)
	);
	const tableStyle = $derived(
		tableHeight + getGridStyle($displayMode, columnWidth, scrollX)
	);

	// --------
	// SELECTION
	// --------
	const sel = $derived($selected.map(o => o.id));

	// --------
	// TASKS
	// --------

	const tasks = $derived($rTasks.slice($area.start, $area.end));
	const allTasks = $derived.by(() => {
		const rows =
			dragTask && !tasks.find(t => t.id === dragTask.id)
				? [...tasks, dragTask]
				: tasks;
		return rows.map(t => ({ ...t }));
	});

	let sortMarks = $derived(getSortMarks(allTasks, $sort));

	// preserve filters while sorting
	let filters = $derived.by(() => {
		return sortMarks ? { ...$filterValues } : $filterValues;
	});

	const fitColumns = $derived(getFitColumns(cols, $displayMode));

	const bodyOffset = $derived(scrollDelta - $scrollTop);

	let pending = false;
	focusTask.subscribe(value => {
		if (!value) return;
		const { id, column } = value;
		// focus a new cell
		if (column) {
			if (!pending) {
				pending = true;
				requestAnimationFrame(() => {
					const { focusCell, editor } = tableAPI.getState();
					if (!editor) {
						tableAPI.exec("focus-cell", {
							row: id,
							column: focusCell?.column || cols[0]?.id,
						});
						pending = false;
					}
				});
			}
		}
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="wx-table-container"
	style="flex: 0 0 {flexBasis};"
	bind:clientWidth={gridClientWidth}
	bind:clientHeight={gridClientHeight}
	bind:this={tableContainer}
>
	<div
		style="{tableStyle}--wx-body-offset:{bodyOffset}px;"
		class="wx-table"
		use:reorder={{
			isDisabled: () => !!$groupBy?.field,
			start: startReorder,
			end: endReorder,
			move: moveReorder,
			getTask: api.getTask,
		}}
		onclick={onClick}
		ondblclick={onDblClick}
	>
		<Grid
			{init}
			sizes={{
				rowHeight: $cellHeight,
				headerHeight: headerHeight / $_headerLength,
			}}
			rowStyle={row => (row.$reorder ? "wx-reorder-task" : "")}
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
	}
	.wx-table :global(.wx-grid .wx-reorder-task.wx-selected) {
		background: var(--wx-gantt-select-color);
		border-top: transparent;
		border-bottom: transparent;
	}
</style>
