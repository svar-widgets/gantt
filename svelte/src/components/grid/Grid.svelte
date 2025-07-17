<script>
	import { getContext } from "svelte";
	import { locateID, locateAttr } from "wx-lib-dom";
	import { reorder } from "../../helpers/reorder";
	import { normalizeDates } from "wx-gantt-store";

	import { Grid } from "wx-svelte-grid";
	import TextCell from "./TextCell.svelte";
	import ActionCell from "./ActionCell.svelte";

	let {
		readonly,
		compactMode,
		width = 0,
		columnWidth,
		display = $bindable("all"),
		tableAPI = $bindable(),
	} = $props();

	const _ = getContext("wx-i18n").getGroup("gantt");
	const api = getContext("gantt-store");

	const {
		scrollTop,
		cellHeight,
		_scrollTask: scrollTask,
		_selected: selected,
		area,
		_tasks: rTasks,
		_scales: scales,
		columns,
		_sort: sort,
		durationUnit,
	} = api.getReactiveState();

	let touchY = null;
	let scroll = true;
	let dragTask = $state(null);

	function execAction(id, action) {
		if (action == "add-task") {
			api.exec(action, {
				target: id,
				task: { text: _("New Task") },
				mode: "child",
				show: true,
			});
		} else if (action == "open-task") {
			const task = tasks.find(a => a.id === id);
			if (task.data || task.lazy)
				api.exec(action, { id, mode: !task.open });
		}
	}

	function onClick(e) {
		const id = locateID(e);
		const action = e.target.dataset.action;
		if (action) e.preventDefault();
		if (id) {
			if (action == "add-task" || action == "open-task") {
				execAction(id, action);
			} else {
				api.exec("select-task", {
					id,
					toggle: e.ctrlKey || e.metaKey,
					range: e.shiftKey,
					show: true,
				});
			}
		} else if (action == "add-task") {
			execAction(null, action);
		}
	}

	function onDblClick(e) {
		if (!readonly) {
			const id = locateID(e);
			const column = locateAttr(e, "data-col-id");
			const columnObj = column && cols.find(c => c.id == column);
			if (!columnObj?.editor && id) api.exec("show-editor", { id });
		}
	}

	function endScroll() {
		scroll = false;
	}

	function onTouchstart(e) {
		scroll = true;
		touchY = e.touches[0].clientY + $scrollTop;
	}

	function onTouchmove(e) {
		if (scroll) {
			const delta = touchY - e.touches[0].clientY;
			api.exec("scroll-chart", { top: delta });
			e.preventDefault();
			return false;
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
			if (mode == "after") {
				const task = api.getTask(target);
				if (task.data?.length && task.open) {
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

	let gridWidth = $state(0); // clientWidth

	let table = $state();
	let tableContainer = $state();
	let updateFlex = $state(false);

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
		tapi.intercept("scroll", () => false);
		tapi.intercept("select-row", () => false);
		tapi.intercept("sort-rows", e => {
			const { key, add } = e;
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

		tapi.on("resize-column", () => {
			setColumnWidth(true);
		});

		tapi.on("hide-column", ev => {
			if (!ev.mode) adjustColumns();
			setColumnWidth();
		});

		tapi.intercept("update-cell", e => {
			const { id, column, value } = e;
			const task = tasks.find(t => t.id === id);

			if (task) {
				const update = { ...task };
				let v = value;
				if (v && !isNaN(v) && !(v instanceof Date)) v *= 1;
				update[column] = v;

				normalizeDates(update, $durationUnit, true, column);

				api.exec("update-task", {
					id: id,
					task: update,
				});
			}
			return false;
		});
	}

	// SIZES
	// --------
	// --------
	const scrollDelta = $derived($area.from);
	const headerHeight = $derived($scales.height);
	const scrollX = $derived(
		!compactMode && display !== "grid"
			? columnWidth > width
			: columnWidth > gridWidth
	);
	const basis = $derived(
		display === "all"
			? `${width}px`
			: display === "grid"
				? "calc(100% - 4px)"
				: cols.find(c => c.id === "add-task")
					? "50px"
					: "0"
	);

	const tableStyle = $derived(
		scrollX && display === "all"
			? `width:${columnWidth}px;`
			: display === "grid"
				? scrollX
					? `width:${columnWidth}px;`
					: `width:100%;`
				: ``
	);

	// --------
	// SELECTION
	// --------
	const sel = $derived($selected.map(o => o.id));

	// --------
	// TASKS
	// --------

	const tasks = $derived($rTasks.slice($area.start, $area.end));
	const allTasks = $derived(
		dragTask && !tasks.find(t => t.id === dragTask.id)
			? [...tasks, dragTask]
			: tasks
	);

	// COLUMNS
	// --------

	function checkFlex() {
		return cols.some(c => c.flexgrow && !c.hidden);
	}

	const hasFlexCol = $derived.by(() => {
		updateFlex;
		return checkFlex();
	});

	function setColumnWidth(resized) {
		if (!checkFlex()) {
			const newColumnWidth = fitColumns.reduce((acc, col) => {
				if (resized && col.$width) col.$width = col.width;
				return acc + (col.hidden ? 0 : col.width);
			}, 0);
			if (newColumnWidth !== columnWidth) columnWidth = newColumnWidth;
		}
		// hasFlexCol update
		updateFlex = true;
		updateFlex = false;
	}

	// reset widths of columns
	// after a column has been shown
	function adjustColumns() {
		const flexCols = cols.filter(c => c.flexgrow && !c.hidden);
		if (flexCols.length === 1)
			cols.forEach(c => {
				if (c.$width && !c.flexgrow && !c.hidden) c.width = c.$width;
			});
	}

	const cols = $derived.by(() => {
		let cols = $columns.map(col => {
			col = { ...col };
			col.header = _(col.header);
			return col;
		});
		const ti = cols.findIndex(c => c.id === "text");
		const ai = cols.findIndex(c => c.id === "add-task");

		if (ti !== -1) cols[ti].cell = TextCell;
		if (ai !== -1) {
			cols[ai].cell = ActionCell;
			cols[ai].header = { text: cols[ai].header, cell: ActionCell };

			if (readonly) {
				cols.splice(ai, 1);
			} else {
				if (compactMode) {
					const [actionCol] = cols.splice(ai, 1);
					cols.unshift(actionCol);
				}
			}
		}

		if (cols.length > 0) cols[cols.length - 1].resize = false;
		return cols;
	});

	let sortMarks = $derived.by(() => {
		if (allTasks && $sort?.length) {
			const marks = {};
			$sort.forEach(({ key, order }, index) => {
				marks[key] = {
					order,
					...($sort.length > 1 && { index }),
				};
			});
			return marks;
		}
		return {};
	});

	const fitColumns = $derived.by(() => {
		let filteredColumns =
			display === "chart" ? cols.filter(c => c.id === "add-task") : cols;

		// Adjust widths if needed
		const containerWidth = display === "all" ? width : gridWidth;
		if (!hasFlexCol) {
			let baseColumnWidth = columnWidth;
			let forceReset = false;
			if (cols.some(c => c.$width)) {
				let actualWidth = 0;
				baseColumnWidth = cols.reduce((acc, col) => {
					if (!col.hidden) {
						actualWidth += col.width;
						acc += col.$width || col.width;
					}
					return acc;
				}, 0);

				// Force widths reset when "display" "grid" changed to "all"
				if (
					actualWidth > baseColumnWidth &&
					baseColumnWidth > containerWidth
				)
					forceReset = true;
			}

			if (forceReset || baseColumnWidth < containerWidth) {
				let k = 1;
				if (!forceReset)
					k = (containerWidth - 50) / (baseColumnWidth - 50 || 1);
				return filteredColumns.map(c => {
					if (c.id !== "add-task" && !c.hidden) {
						if (!c.$width) c.$width = c.width;
						c.width = c.$width * k;
					}
					return c;
				});
			}
		}
		return filteredColumns;
	});

	// --------
	// SCROLLS AND TOP ROW OFFSET
	// --------

	$effect(() => {
		if (table) {
			$scrollTop;
			scrollDelta;
			setScrollOffset();
		}
	});

	function setScrollOffset() {
		// hack to align scroll
		if (table && allTasks !== null)
			table.querySelector(".wx-body").style.top =
				-($scrollTop - scrollDelta) + "px";
		tableContainer.scrollTop = 0;
	}

	// Observe grid inner container and set offset on size change
	const ro = new ResizeObserver(() => {
		setScrollOffset();
	});

	$effect(() => {
		if (table) {
			fitColumns;
			tableStyle;
			display;
			basis;
			allTasks;
			ro.observe(table.querySelector(".wx-table-box .wx-body"));
		}
		return () => {
			ro.disconnect();
		};
	});

	scrollTask.subscribe(value => {
		if (!value) return;
		const { id } = value;
		// focus a new cell
		const focusCell = tableAPI.getState().focusCell;
		if (
			focusCell &&
			focusCell.row !== id &&
			table &&
			table.contains(document.activeElement)
		) {
			tableAPI.exec("focus-cell", {
				row: id,
				column: focusCell.column,
			});
		}
	});
</script>

<svelte:window ontouchend={endScroll} />
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="wx-table-container"
	style="flex: 0 0 {basis};"
	bind:clientWidth={gridWidth}
	bind:this={tableContainer}
>
	<div
		bind:this={table}
		style={tableStyle}
		class="wx-table"
		use:reorder={{
			start: startReorder,
			touchStart: endScroll,
			end: endReorder,
			move: moveReorder,
			getTask: api.getTask,
		}}
		ontouchstart={onTouchstart}
		ontouchmove={onTouchmove}
		onclick={onClick}
		ondblclick={onDblClick}
	>
		<Grid
			{init}
			sizes={{
				rowHeight: $cellHeight,
				headerHeight: headerHeight - 1,
			}}
			rowStyle={row => (row.$reorder ? "wx-reorder-task" : "")}
			columnStyle={col =>
				`wx-text-${col.align} ${col.id === "add-task" ? "wx-action" : ""}`}
			data={allTasks}
			columns={fitColumns}
			selectedRows={[...sel]}
			{sortMarks}
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
	}
	.wx-table :global(.wx-grid .wx-table-box) {
		border: none;
	}
	.wx-table :global(.wx-grid .wx-scroll) {
		overflow: visible !important;
	}
	.wx-table :global(.wx-grid .wx-scroll .wx-body),
	.wx-table :global(.wx-grid .wx-scroll .wx-header) {
		width: 100% !important;
	}
	.wx-table :global(.wx-grid) {
		font: var(--wx-grid-body-font);
		color: var(--wx-grid-body-font-color);
	}
	/*body*/
	.wx-table :global(.wx-grid .wx-cell) {
		padding: 0 5px;
		height: 100%;
		display: flex;
		align-items: center;
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
	/*header*/
	.wx-table :global(.wx-grid .wx-header) {
		box-shadow: var(--wx-grid-header-shadow);
		z-index: 1;
	}
	.wx-table :global(.wx-grid .wx-header .wx-cell) {
		font: var(--wx-grid-header-font);
		text-transform: var(--wx-grid-header-text-transform);
		color: var(--wx-grid-header-font-color);
		padding: 0 5px;
	}
	.wx-table :global(.wx-grid .wx-header .wx-cell:first-child) {
		padding-left: 14px;
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
		padding-left: 5px;
	}
	.wx-table :global(.wx-grid .wx-header .wx-cell.wx-text-center.wx-action) {
		justify-content: center;
	}
	.wx-table :global(.wx-grid .wx-header .wx-cell.wx-text-right.wx-action) {
		justify-content: right;
	}
	.wx-table :global(.wx-grid .wx-header .wx-action i) {
		font-size: var(--wx-icon-size);
		color: var(--wx-gantt-icon-color);
	}
	.wx-table :global(.wx-grid .wx-header .wx-action .wx-text) {
		display: none;
	}
	.wx-table :global(.wx-grid .wx-header .wx-action i:hover) {
		color: var(--wx-color-link);
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
