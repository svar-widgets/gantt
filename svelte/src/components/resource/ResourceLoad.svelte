<script>
	import { getContext, onMount, setContext } from "svelte";
	import { locateID } from "@svar-ui/lib-dom";
	import {
		getResourceColumns,
		normalizeResourceColumns,
	} from "@svar-ui/gantt-store";
	import { locale } from "@svar-ui/lib-dom";
	import { en } from "@svar-ui/gantt-locales";
	import { en as coreEn } from "@svar-ui/core-locales";
	import { getValue } from "@svar-ui/grid-store";

	import { Grid } from "@svar-ui/svelte-grid";
	import TimeScales from "../chart/TimeScale.svelte";
	import Resizer from "../Resizer.svelte";
	import NameCell from "./NameCell.svelte";
	import NameCellCompact from "./NameCellCompact.svelte";
	import LoadCell from "./LoadCell.svelte";

	import {
		getFlexBasis,
		getFitColumns,
		getFillColumn,
		getColumnsWidth,
		getSortMarks,
		getResourceLoadColumns,
		getScrollbarWidth,
		getColumnStyle,
	} from "../../helpers/grid";
	import { createZoomWheelHandler } from "../../helpers/zoom";

	let {
		api,
		columns = getResourceColumns(),
		mode = "grid", // "grid" | "chart"
		template,
	} = $props();

	// detect scrollbar width that may differ in browsers
	let scrollbarWidth = $state(17);
	onMount(() => {
		scrollbarWidth = getScrollbarWidth();
	});

	let state = $derived(api?.getReactiveState());

	const {
		_resources: rResources,
		_scales: rScales,
		_resourceSort: rResourceSort,
		cellHeight,
		columns: ganttColumns,
		scrollLeft,
		gridWidth,
		displayMode,
		_headerLength,
		highlightTime,
		_columnsWidth,
		_gridCollapseThreshold,
		cellBorders,
		zoom,
	} = $derived(state ?? {});

	let l = getContext("wx-i18n");
	if (!l) {
		l = locale({ ...en, ...coreEn });
		setContext("wx-i18n", l);
	}
	const _ = l.getGroup("gantt");

	let containerWidth = $state(0);
	let chartContainer = $state();
	let scalesDiv = $state();
	let rightContainerHeight = $state(0);
	let leftApi;
	let rightApi;

	const finalColumns = $derived.by(() => {
		if (!columns || !columns.length) return [];
		let cols = normalizeResourceColumns(columns).map(col => {
			col = { ...col };
			const header = col.header;
			if (typeof header === "object") {
				const text = header.text && _(header.text);
				col.header = { ...header, text };
			} else col.header = _(header);

			col.align = col.align || "left";
			col.editor = false;
			return col;
		});
		const ni = cols.findIndex(c => c.id === "name");

		if (ni !== -1) {
			if (cols[ni].cell) cols[ni]._cell = cols[ni].cell;
			cols[ni] = {
				...cols[ni],
				header: $displayMode === "chart" ? "" : cols[ni].header,
				cell: $displayMode === "chart" ? NameCellCompact : NameCell,
			};
		}

		if (cols.length > 0) cols[cols.length - 1].resize = false;
		return cols;
	});

	let sortMarks = $derived(getSortMarks($rResources, $rResourceSort));

	let gridClientWidth = $state(0);

	let columnWidth = $state(0);
	$effect.pre(() => {
		let width;
		if ($_columnsWidth) width = $_columnsWidth;
		else if ($displayMode === "chart") width = $_gridCollapseThreshold || 0;
		else width = $gridWidth;
		columnWidth = width;
	});

	const fitColumns = $derived(
		getFitColumns(finalColumns, $displayMode, "name")
	);

	const rightColumns = $derived(
		getResourceLoadColumns($rScales, LoadCell, template)
	);

	const flexBasis = $derived(
		getFlexBasis($ganttColumns, $displayMode, $gridWidth)
	);

	// right grid V-scroll eats one scrollbar width on the right; timescales
	// must match so the time axis aligns at horizontal-max.
	const rightHasHScroll = $derived(
		($rScales?.width ?? 0) > containerWidth - gridClientWidth
	);
	const rightHasVScroll = $derived.by(() => {
		const contentH = $rResources?.length * $cellHeight;
		const viewportH =
			rightContainerHeight - (rightHasHScroll ? scrollbarWidth : 0);
		return contentH > viewportH;
	});

	// left grid only overflows once its own X scrollbar appears. If the Y
	// scrollbar is clipped, that hidden strip also delays the X overflow.
	const leftHasHScroll = $derived(
		columnWidth > gridClientWidth + (rightHasVScroll ? scrollbarWidth : 0)
	);

	$effect(() => {
		const left = $scrollLeft;
		rightApi?.exec("scroll-to", { left });
		if (scalesDiv && Math.abs(scalesDiv.scrollLeft - left) > 1)
			scalesDiv.scrollLeft = left;
	});

	function onClick(ev) {
		const action = ev.target.dataset.action;
		if (action === "open-resource-row") {
			ev.preventDefault();
			const id = locateID(ev);
			const task = $rResources.find(a => a.id === id);
			if (task.data) api.exec(action, { id, mode: !task.open });
		}
	}

	let selectedRows = $state([]);

	function initLeft(lapi) {
		leftApi = lapi;
		leftApi.on("select-row", ev => {
			selectedRows = [ev.id];
		});
		leftApi.intercept("sort-rows", ev => {
			const { key, add } = ev;
			let keySort = $rResourceSort
				? $rResourceSort.find(s => s.key === key)
				: null;
			let order = "asc";
			if (keySort)
				order = !keySort || keySort.order === "asc" ? "desc" : "asc";

			api.exec("sort-resources", {
				key,
				order,
				add,
				_columns: finalColumns,
			});
			return false;
		});

		leftApi.intercept("resize-column", ev => {
			ev.flexgrowFallback = getFillColumn(finalColumns, ev.id);
		});

		leftApi.on("resize-column", () => {
			columnWidth = getColumnsWidth(leftApi.getState().columns);
		});

		leftApi.on("scroll-to", ev => {
			if (ev.top !== undefined && !ev.rSync)
				rightApi?.exec("scroll-to", {
					top: ev.top,
					rSync: true,
				});
		});
	}

	function initRight(rapi) {
		rightApi = rapi;
		rightApi.on("select-row", ev => {
			selectedRows = [ev.id];
		});

		rightApi.on("scroll-to", ev => {
			if (ev.left !== undefined && Math.abs(ev.left - $scrollLeft) > 1)
				api.exec("scroll-chart", { left: ev.left });
			if (ev.top !== undefined && !ev.rSync)
				leftApi?.exec("scroll-to", {
					top: ev.top,
					rSync: true,
				});
		});
	}

	function getCellStyle(row, col) {
		const value = getValue(row, col);
		if (value) {
			return value.percent > 100 ? " wx-overload" : " wx-normal";
		}

		if (col.unit !== "day" && col.unit !== "hour") return "";

		const resourceCalendar = api.getResourceCalendar(row);
		if (resourceCalendar) {
			const isWorkingDay = resourceCalendar.isWorkingDay(col.date);
			if (!isWorkingDay) return resourceCalendar.css ?? "wx-weekend";
		} else if ($highlightTime) return $highlightTime(col.date, col.unit);

		return "";
	}

	const onWheel = $derived(
		api &&
			createZoomWheelHandler(
				api,
				() => $zoom,
				() => chartContainer
			)
	);
</script>

{#if api}
	<div
		class="wx-resource-load"
		style="--wx-scrollbar-width: {scrollbarWidth}px;"
		bind:offsetWidth={containerWidth}
		data-menu-ignore="true"
	>
		<div class="wx-layout">
			{#if columns && columns.length}
				<div
					class="wx-grid-container"
					class:wx-y-scroll={rightHasVScroll}
					class:wx-h-scroll-reserve={rightHasHScroll &&
						!leftHasHScroll}
					style="flex: 0 0 {flexBasis};"
					bind:clientWidth={gridClientWidth}
				>
					<!-- extended past container's right edge so Grid's Y scrollbar gets clipped by overflow:hidden -->
					<div class="wx-y-bar-clip">
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="wx-resource-grid" onclick={onClick}>
							<Grid
								init={initLeft}
								sizes={{
									rowHeight: $cellHeight,
									headerHeight:
										$rScales.height / $_headerLength,
								}}
								columnStyle={getColumnStyle}
								data={$rResources}
								columns={fitColumns}
								{sortMarks}
								{selectedRows}
							/>
						</div>
					</div>
				</div>

				<Resizer {containerWidth} {api} />
			{/if}

			<div class="wx-chart" bind:this={chartContainer} onwheel={onWheel}>
				<div
					class="wx-timescale-viewport"
					class:wx-v-scroll-reserve={rightHasVScroll}
					bind:this={scalesDiv}
				>
					<TimeScales {api} />
				</div>
				{#if mode === "grid"}
					<div
						class="wx-grid-scale-container"
						bind:clientHeight={rightContainerHeight}
					>
						<Grid
							init={initRight}
							columns={rightColumns}
							data={$rResources}
							sizes={{
								rowHeight: $cellHeight,
								headerHeight: 0,
							}}
							{selectedRows}
							rowStyle={() =>
								$cellBorders === "column"
									? "wx-column-border"
									: ""}
							cellStyle={getCellStyle}
						/>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.wx-resource-load {
		height: 100%;
		width: 100%;
		background-color: var(--wx-background);
	}

	.wx-layout {
		position: relative;
		display: flex;
		background-color: var(--wx-background);
		overflow: hidden;
		outline: none;
		height: 100%;
	}

	.wx-chart {
		position: relative;
		flex: 1 1 auto;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		outline: none;
	}

	.wx-timescale-viewport {
		flex: 0 0 auto;
		overflow: hidden;
	}
	/* match right grid body width when it has a V scrollbar — else timescales
	   shows cells past the right grid's last visible column at horizontal-max */
	.wx-timescale-viewport.wx-v-scroll-reserve {
		box-sizing: border-box;
		padding-right: var(--wx-scrollbar-width);
	}

	.wx-grid-container {
		display: flex;
		flex-direction: column;
		border-right: var(--wx-gantt-border);
		height: 100%;
		box-sizing: content-box;
		overflow: hidden;
	}
	.wx-y-bar-clip {
		width: 100%;
		height: 100%;
	}
	/* extend by one scrollbar width so Grid's Y scrollbar gets clipped by
	   wx-grid-container; --wx-scrollbar-width is set inline from JS */
	.wx-grid-container.wx-y-scroll .wx-y-bar-clip {
		width: calc(100% + var(--wx-scrollbar-width));
	}
	/* shrink left body so rows align with right grid's when only right H-scrolls;
	   gate (rightHasHScroll && !leftHasHScroll) skips this when left has its own */
	.wx-grid-container.wx-h-scroll-reserve .wx-y-bar-clip {
		height: calc(100% - var(--wx-scrollbar-width));
	}

	.wx-grid-scale-container {
		position: relative;
		flex: 1 1 auto;
		overflow: hidden;
	}

	/*table*/
	.wx-grid-scale-container,
	.wx-resource-grid {
		box-sizing: content-box;
		height: 100%;
		--wx-table-select-background: var(--wx-gantt-select-color);
		--wx-table-select-focus-background: var(--wx-gantt-select-color);
		--wx-table-select-border: none;
		--wx-table-cell-border: var(--wx-grid-body-row-border);
		--wx-table-header-background: var(--wx-background);
		--wx-table-header-border: var(--wx-gantt-border);
		--wx-table-header-cell-border: var(--wx-gantt-border);
	}
	.wx-grid-scale-container :global(.wx-grid .wx-header) {
		display: none;
	}
	.wx-resource-grid :global(.wx-grid .wx-table-box),
	.wx-grid-scale-container :global(.wx-grid .wx-table-box) {
		border: none;
	}
	.wx-resource-grid :global(.wx-grid),
	.wx-grid-scale-container :global(.wx-grid) {
		font: var(--wx-grid-body-font);
		color: var(--wx-grid-body-font-color);
	}
	/*body*/
	.wx-resource-grid :global(.wx-grid .wx-cell) {
		padding: 0 var(--wx-grid-cell-padding-x);
		height: 100%;
		display: flex;
		align-items: center;
	}
	.wx-resource-grid :global(.wx-grid .wx-row) {
		display: flex;
		align-items: center;
	}
	.wx-resource-grid :global(.wx-grid .wx-cell.wx-text-center) {
		justify-content: center;
	}
	.wx-resource-grid :global(.wx-grid .wx-cell.wx-text-right) {
		justify-content: end;
	}
	.wx-resource-grid :global(.wx-grid .wx-body .wx-cell) {
		border-right: var(--wx-grid-body-cell-border);
	}
	.wx-resource-grid :global(.wx-grid .wx-body .wx-cell.wx-col-name) {
		padding-left: var(--wx-grid-tree-column-padding-left);
	}
	.wx-resource-grid :global(.wx-grid .wx-cell:has(input, .wx-value)) {
		height: 100%;
		padding: 0;
	}
	.wx-grid-scale-container :global(.wx-row.wx-column-border:not(:last-child)),
	.wx-grid-scale-container :global(.wx-row.wx-column-border:last-child) {
		border-bottom: none;
	}
	/*header*/
	.wx-resource-grid :global(.wx-grid .wx-header) {
		box-shadow: var(--wx-grid-header-shadow);
		z-index: 1;
	}
	.wx-resource-grid :global(.wx-grid .wx-header .wx-cell) {
		font: var(--wx-grid-header-font);
		text-transform: var(--wx-grid-header-text-transform);
		color: var(--wx-grid-header-font-color);
	}
	.wx-resource-grid :global(.wx-grid .wx-header .wx-cell.wx-filter) {
		padding: 0 5px;
	}
	.wx-resource-grid :global(.wx-grid .wx-header .wx-cell:has(.wx-sort)) {
		padding-right: var(--wx-grid-header-sort-padding-right);
	}
	.wx-resource-grid :global(.wx-grid .wx-header .wx-cell .wx-text) {
		width: 100%;
	}
	.wx-resource-grid
		:global(.wx-grid .wx-header .wx-cell:has(.wx-sort) .wx-text) {
		width: calc(100% - 15px);
	}
	.wx-resource-grid :global(.wx-grid .wx-header .wx-cell.wx-text-right) {
		text-align: right;
	}
	.wx-resource-grid :global(.wx-grid .wx-header .wx-cell.wx-text-center) {
		text-align: center;
	}
	.wx-resource-grid
		:global(.wx-grid .wx-header .wx-cell.wx-text-right.wx-action) {
		justify-content: right;
	}
	.wx-resource-grid :global(.wx-grid .wx-header .wx-action i) {
		font-size: var(--wx-icon-size);
		color: var(--wx-gantt-icon-color);
	}
	.wx-resource-grid :global(.wx-grid .wx-header .wx-action .wx-text) {
		display: none;
	}
	.wx-resource-grid :global(.wx-grid .wx-header .wx-action i:hover) {
		color: var(--wx-color-link);
	}

	/*cell*/
	.wx-grid-scale-container :global(.wx-grid .wx-cell.wx-weekend) {
		background: var(--wx-gantt-holiday-background);
		color: var(--wx-gantt-holiday-color);
	}
	.wx-grid-scale-container :global(.wx-grid .wx-cell.wx-normal) {
		background: var(--wx-gantt-load-normal-color);
	}
	.wx-grid-scale-container :global(.wx-grid .wx-cell.wx-overload) {
		background: var(--wx-gantt-load-danger-color);
	}
	/* override load cell background for selected rows */
	.wx-grid-scale-container :global(.wx-grid .wx-row.wx-selected .wx-cell) {
		background: var(--wx-table-select-background);
	}
</style>
