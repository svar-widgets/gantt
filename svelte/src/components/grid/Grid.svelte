<script>
	import { getContext, tick } from "svelte";
	import { locateID } from "wx-lib-dom";
	import { reorder } from "../../helpers/reorder";

	import { Grid } from "wx-svelte-grid";
	import TextCell from "./TextCell.svelte";
	import ActionCell from "./ActionCell.svelte";

	export let readonly;
	export let compactMode;
	export let width = 0;
	export let columnWidth = 0;

	export let fullHeight = 0;

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

	let tasks, height;
	$: tasks = $rTasks.slice($area.start, $area.end);
	$: scrollDelta = $area.from;
	$: height = $scales.height;
	$: sel = $selected.map(o => o.id);

	let touchY = null;
	let scroll = true;
	let dragTask = null;
	let scrollX, scrollY;
	let tableStyle, tableOuterStyle, scrollYStyle;
	let scrollDiv;
	let scrollYPos;

	$: allTasks =
		dragTask && !tasks.find(t => t.id === dragTask.id)
			? [...tasks, dragTask]
			: tasks;

	function onClick(e) {
		const id = locateID(e);
		if (!id) return;
		let action = e.target.dataset.action;

		if (action) {
			e.preventDefault();
		}

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

	let cols;
	let basis;
	let showFull = false;
	let hasFlexCol = false;
	let w = 0; // clientWidth
	let h = 0; // clientHeight
	$: {
		cols = $columns.map(col => {
			col.header = _(col.header);
			return col;
		});
		setFlex(cols);

		const ti = cols.findIndex(c => c.id == "text");
		const ai = cols.findIndex(c => c.id === "action");

		cols[ti].cell = TextCell;
		cols[ai].cell = ActionCell;

		cols[ai].header = {
			css: "wx-action " + (compactMode ? "wx-expand" : "wx-add-task"),
			collapsible: true,
		};

		if (compactMode) {
			if (readonly) cols[ai].action = "expand";
			cols.unshift(cols.splice(ai, 1)[0]);
			cols = showFull ? cols : cols.slice(0, 1);
		} else {
			if (readonly) cols.splice(ai, 1);
			showFull = false;
		}

		cols[cols.length - 1].resize = false;

		// recalculate columnWidth on columns or compactMode change
		setColumnWidth();
	}

	$: {
		const { key, order } = $sort || {};
		// to mark sorted column with relevant icon
		cols = cols.map(col => {
			col.$sort = order && col.id === key ? { order } : null;
			return col;
		});
	}

	$: {
		scrollX = !compactMode
			? columnWidth > width
			: showFull && columnWidth > w;
		tableStyle = scrollYStyle =
			!showFull || scrollX
				? `width:${scrollX ? columnWidth : width}px;`
				: "";
		scrollY = h < height + fullHeight;
		tableOuterStyle = "";
		if (scrollY) {
			tableOuterStyle = tableStyle + `height:${fullHeight + height}px;`;
			tableStyle += `height:${h}px;`;
			if (showFull) scrollYStyle = tableOuterStyle;
		}
		basis = showFull ? "100%" : `${width}px`;
	}
	$: {
		// if grid width is bigger than total width of all columns,
		// column widths are increased
		if (columnWidth < width || (showFull && columnWidth < w)) {
			if (!hasFlexCol) {
				const k = (w - 50) / (columnWidth - 50);
				cols = cols.map(c => {
					if (c.id != "action") {
						c = { ...c };
						if (!c.$width) c.$width = c.width;
						c.width = c.$width * k;
					}
					return c;
				});
			}
		}
	}

	let table;
	$: if (table) {
		//hack to align scroll
		table.querySelector(".wx-body").style.top =
			-($scrollTop - scrollDelta) + "px";
	}

	function init(tapi) {
		tapi.intercept("scroll", () => false);
		tapi.intercept("select-row", () => false);
		//hask: use collapsible to inject add-task and expand icons
		tapi.intercept("collapse-column", () => {
			if (compactMode) showFull = !showFull;
			else
				api.exec("add-task", {
					task: {
						text: _("New Task"),
					},
				});
			return false;
		});

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
			if (hasFlexCol) setFlex(cols);
			setColumnWidth();
		});
	}

	function onScroll(ev) {
		scrollYPos = ev.target.scrollTop;
		api.exec("scroll-chart", {
			top: scrollYPos,
		});
	}

	function setFlex(arr) {
		hasFlexCol = arr.some(c => Object.hasOwn(c, "flexgrow"));
	}

	$: {
		if (compactMode && !showFull) scrollYPos = $scrollTop;
	}

	$: {
		if (scrollDiv && (showFull || !scrollY)) {
			const y = scrollY ? scrollYPos : 0;
			if (scrollDiv.scrollTop != y) restoreScroll(y);
		}
	}

	async function restoreScroll(y) {
		await tick();
		scrollDiv.scrollTop = y;
	}

	function setColumnWidth() {
		columnWidth = cols.reduce((acc, col) => {
			if (col.$width) col.$width = col.width;
			return acc + col.width;
		}, 0);
	}
</script>

<svelte:window on:touchend={endScroll} />
<div
	bind:this={scrollDiv}
	bind:clientWidth={w}
	bind:clientHeight={h}
	class="wx-table-wrapper"
	class:wx-wrapper-scroll={scrollX}
	class:wx-wrapper-scroll-y={scrollY && showFull}
	on:scroll={onScroll}
	style="flex: 0 0 {basis}"
>
	<div
		style={scrollYStyle}
		class:wx-scroll-y={scrollY && !showFull}
		on:scroll={onScroll}
	>
		<div style={tableOuterStyle}>
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
				on:touchstart={onTouchstart}
				on:touchmove={onTouchmove}
				on:click={onClick}
				on:dblclick={onDblClick}
			>
				<Grid
					{init}
					sizes={{ rowHeight: $cellHeight, headerHeight: height - 1 }}
					rowStyle={row => (row.$reorder ? "wx-reorder-task" : "")}
					columnStyle={col => "wx-text-" + col.align}
					data={allTasks}
					columns={cols}
					selectedRows={[...sel]}
				/>
			</div>
		</div>
	</div>
</div>

<style>
	.wx-table-wrapper {
		display: flex;
		flex-direction: column;
		border-right: var(--wx-gantt-border);
		overflow: hidden;
		position: sticky;
	}

	.wx-wrapper-scroll {
		overflow-x: scroll;
	}
	.wx-wrapper-scroll-y {
		overflow-y: scroll;
		display: block;
	}
	.wx-scroll-y {
		overflow-y: auto;
		scrollbar-width: none;
	}
	.wx-scroll-y::-webkit-scrollbar {
		display: none;
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
		position: sticky;
		top: 0;
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
	.wx-table > :global(.wx-grid .wx-header .wx-cell.wx-text-right) {
		justify-content: right;
	}
	.wx-table > :global(.wx-grid .wx-header .wx-cell.wx-text-center) {
		justify-content: center;
		padding-left: 5px;
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
	/*[fixme] find some permanent way to add correct icons - SVAR-1658 */
	.wx-table > :global(.wx-grid .wx-header .wx-add-task i:before) {
		content: "\f148";
	}
	.wx-table > :global(.wx-grid .wx-header .wx-expand i:before) {
		content: "\f140";
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
