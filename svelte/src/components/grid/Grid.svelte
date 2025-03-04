<script>
	import { getContext } from "svelte";
	import { locateID } from "wx-lib-dom";
	import { reorder } from "../../helpers/reorder";

	import { Grid } from "wx-svelte-grid";
	import TextCell from "./TextCell.svelte";
	import ActionCell from "./ActionCell.svelte";

	let { readonly, compactMode, width = 0, columnWidth } = $props();

	const _ = getContext("wx-i18n").getGroup("gantt");
	const api = getContext("gantt-store");

	const {
		scrollTop,
		cellHeight,

		_selected: selected,
		area,
		_tasks: rTasks,
		_scales: scales,
		columns,
		_sort: sort,
	} = api.getReactiveState();

	let touchY = null;
	let scroll = true;
	let dragTask = $state(null);

	function onClick(e) {
		const id = locateID(e);
		const action = e.target.dataset.action;

		if (action) e.preventDefault();

		if (id) {
			if (action == "add-task") {
				api.exec(action, {
					target: id,
					task: { text: _("New Task") },
					mode: "child",
				});
			} else if (action == "open-task") {
				const task = tasks.find(a => a.id === id);
				api.exec(action, { id, mode: !task.open });
			} else {
				api.exec("select-task", {
					id,
					toggle: e.ctrlKey || e.metaKey,
					range: e.shiftKey,
					show: true,
				});
			}
		} else {
			if (action == "add-task") {
				api.exec(action, {
					task: { text: _("New Task") },
				});
			} else if (action == "expand" && compactMode) {
				showFull = !showFull;
			}
		}
	}

	function onDblClick(e) {
		if (!readonly) {
			const id = locateID(e);
			if (id) api.exec("show-editor", { id });
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
			dragTask = null;
		}
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

	let showFull = $state(false);
	$effect(() => {
		if (!compactMode) showFull = false;
	});

	let gridWidth = $state(0); // clientWidth

	let table = $state();
	let updateFlex = $state(false);

	function init(tapi) {
		tapi.intercept("scroll", () => false);
		tapi.intercept("select-row", () => false);

		tapi.intercept("sort-rows", e => {
			const key = e.key;
			const prevSort = $sort;

			let order = !prevSort ? "desc" : "asc";
			if (prevSort && prevSort.key === key)
				order = prevSort.order === "asc" ? "desc" : "asc";

			api.exec("sort-tasks", {
				key,
				order,
			});
			return false;
		});

		tapi.on("resize-column", () => {
			updateFlex = true;
			if (!hasFlexCol) setColumnWidth();
			updateFlex = false;
		});
	}

	// SIZES
	// --------
	// --------
	const scrollDelta = $derived($area.from);
	const headerHeight = $derived($scales.height);
	const scrollX = $derived(
		!compactMode ? columnWidth > width : showFull && columnWidth > gridWidth
	);

	const basis = $derived(showFull ? "100%" : `${width}px`);

	const tableStyle = $derived(
		!showFull || scrollX ? `width:${scrollX ? columnWidth : width}px;` : ""
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
	function setColumnWidth() {
		const newColumnWidth = fitColumns.reduce((acc, col) => {
			if (col.$width) col.$width = col.width;
			return acc + col.width;
		}, 0);
		const containerWidth = showFull ? gridWidth : width;
		if (newColumnWidth > containerWidth || columnWidth > containerWidth)
			columnWidth = newColumnWidth;
	}

	const hasFlexCol = $derived.by(() => {
		return updateFlex !== null && $columns.some(c => c.flexgrow);
	});

	const cols = $derived.by(() => {
		let cols = $columns.map(col => {
			col.header = _(col.header);
			return col;
		});

		const ti = cols.findIndex(c => c.id == "text");
		const ai = cols.findIndex(c => c.id === "action");

		cols[ti].cell = TextCell;
		cols[ai].cell = ActionCell;

		cols[ai].header = {
			css: "wx-action",
			action: compactMode ? "expand" : "add-task",
			cell: ActionCell,
		};

		if (compactMode) {
			if (readonly) cols[ai].action = "expand";
			cols.unshift(cols.splice(ai, 1)[0]);
			cols = showFull ? cols : cols.slice(0, 1);
		} else {
			if (readonly) cols.splice(ai, 1);
		}

		cols[cols.length - 1].resize = false;

		return cols;
	});

	const sortedColumns = $derived.by(() => {
		const { key, order } = $sort || {};
		// to mark sorted column with relevant icon
		return cols.map(col => {
			col.$sort = order && col.id === key ? { order } : null;
			return col;
		});
	});

	const fitColumns = $derived.by(() => {
		// if grid width is bigger than total width of all columns,
		// column widths are increased
		if (
			!hasFlexCol &&
			(columnWidth < width || (showFull && columnWidth < gridWidth))
		) {
			const k = (gridWidth - 50) / (columnWidth - 50);
			return sortedColumns.map(c => {
				if (c.id != "action") {
					c = { ...c };
					if (!c.$width) c.$width = c.width;
					c.width = c.$width * k;
				}
				return c;
			});
		}

		return sortedColumns;
	});

	// --------
	// SCROLLS AND TOP ROW OFFSET
	// --------

	$effect(() => {
		if (table) {
			$scrollTop;
			scrollDelta;
			allTasks;
			setScrollOffset();
		}
	});

	function setScrollOffset() {
		// hack to align scroll
		if (table && allTasks !== null)
			table.querySelector(".wx-body").style.top =
				-($scrollTop - scrollDelta) + "px";
	}

	// Observe grid inner container and set offset on size change
	const ro = new ResizeObserver(() => {
		setScrollOffset();
	});

	$effect(() => {
		if (table) {
			fitColumns;
			updateFlex;
			tableStyle;
			showFull;
			basis;
			ro.observe(table.querySelector(".wx-table-box"));
		}
		return () => {
			ro.disconnect();
		};
	});
</script>

<svelte:window ontouchend={endScroll} />
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="wx-table-container"
	style="flex: 0 0 {basis}"
	bind:clientWidth={gridWidth}
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
			sizes={{ rowHeight: $cellHeight, headerHeight: headerHeight - 1 }}
			rowStyle={row => (row.$reorder ? "wx-reorder-task" : "")}
			columnStyle={col => "wx-text-" + col.align}
			data={allTasks}
			columns={fitColumns}
			selectedRows={[...sel]}
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
	.wx-table > :global(.wx-grid .wx-table-box) {
		border: none;
	}
	.wx-table > :global(.wx-grid .wx-scroll) {
		overflow: visible;
	}
	.wx-table > :global(.wx-grid) {
		font: var(--wx-grid-body-font);
		color: var(--wx-grid-body-font-color);
	}
	/*body*/
	.wx-table > :global(.wx-grid .wx-cell) {
		padding: 0 5px;
	}
	/*switch off focus until keys navigation is added*/
	.wx-table > :global(.wx-grid .wx-cell[tabindex="0"]) {
		outline: none;
	}
	.wx-table > :global(.wx-grid .wx-row) {
		display: flex;
		align-items: center;
	}
	.wx-table > :global(.wx-grid .wx-cell.wx-text-center) {
		text-align: center;
	}
	.wx-table > :global(.wx-grid .wx-cell.wx-text-right) {
		text-align: right;
	}
	.wx-table > :global(.wx-grid .wx-body .wx-cell) {
		border-right: var(--wx-grid-body-cell-border);
	}
	/*header*/
	.wx-table > :global(.wx-grid .wx-header) {
		box-shadow: var(--wx-grid-header-shadow);
		z-index: 1;
	}
	.wx-table > :global(.wx-grid .wx-header .wx-cell) {
		font: var(--wx-grid-header-font);
		text-transform: var(--wx-grid-header-text-transform);
		color: var(--wx-grid-header-font-color);
		padding: 0 5px;
	}
	.wx-table > :global(.wx-grid .wx-header .wx-cell:first-child) {
		padding-left: 14px;
	}
	.wx-table > :global(.wx-grid .wx-header .wx-cell .wx-text) {
		width: 100%;
	}
	.wx-table > :global(.wx-grid .wx-header .wx-cell:has(.wx-sort) .wx-text) {
		width: calc(100% - 15px);
	}
	.wx-table > :global(.wx-grid .wx-header .wx-cell.wx-text-right) {
		text-align: right;
	}
	.wx-table > :global(.wx-grid .wx-header .wx-cell.wx-text-center) {
		text-align: center;
		padding-left: 5px;
	}
	.wx-table > :global(.wx-grid .wx-header .wx-cell.wx-text-center.wx-action) {
		justify-content: center;
	}
	.wx-table > :global(.wx-grid .wx-header .wx-cell.wx-text-right.wx-action) {
		justify-content: right;
	}
	.wx-table > :global(.wx-grid .wx-header .wx-action i) {
		font-size: var(--wx-icon-size);
		color: var(--wx-gantt-icon-color);
	}
	.wx-table > :global(.wx-grid .wx-header .wx-action .wx-text) {
		display: none;
	}
	.wx-table > :global(.wx-grid .wx-header .wx-action i:hover) {
		color: var(--wx-color-link);
	}
	/*drag element*/
	.wx-table > :global(.wx-grid .wx-reorder-task.wx-row) {
		width: 100%;
		background: var(--wx-background-alt);
		border-top: var(--wx-grid-body-row-border);
	}
	.wx-table > :global(.wx-grid .wx-reorder-task.wx-selected) {
		background: var(--wx-gantt-select-color);
		border-top: transparent;
		border-bottom: transparent;
	}
</style>
