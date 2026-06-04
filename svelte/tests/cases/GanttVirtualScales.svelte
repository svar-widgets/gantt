<script>
	import { getGeneratedData, zoomConfig } from "../../demos/data";
	import { Gantt } from "../../src/";
	import { Willow } from "@svar-ui/svelte-core";

	// 7-year range so the deepest zoom level (day + hour) produces ~61k cells
	// in the bottom scale row. Without virtualization, panning/zooming at that
	// level stutters; with it, only the visible slice is rendered.
	const start = new Date(2017, 0, 1);
	const end = new Date(2024, 0, 1);

	const data = getGeneratedData("", 200, 7);

	function highlightTime(d, u) {
		if (u === "day") {
			const day = d.getDay();
			if (day === 0 || day === 6) return "wx-weekend";
		}
		if (u === "hour") {
			const h = d.getHours();
			if (h < 8 || h > 17) return "wx-weekend";
		}
		return "";
	}

	let api = $state();
	let scalesStore, areaStore, cellWidthStore, zoomStore;

	const stats = $derived.by(() => {
		if (!api) return null;
		const reactive = api.getReactiveState();
		scalesStore = reactive._scales;
		areaStore = reactive.xArea;
		cellWidthStore = reactive.cellWidth;
		zoomStore = reactive.zoom;
		const scales = $scalesStore;
		const area = $areaStore;
		if (!scales || !area) return null;
		const cells = scales.rows[scales.rows.length - 1].cells;
		const minUnit = scales.minUnit;
		let totalHolidays = 0;
		let visibleHolidays = 0;
		if (minUnit === "day" || minUnit === "hour") {
			for (let i = 0; i < cells.length; i++) {
				if (highlightTime(cells[i].date, minUnit)) {
					totalHolidays++;
					if (i >= area.start && i < area.end) visibleHolidays++;
				}
			}
		}
		return {
			total: cells.length,
			visible: area.end - area.start,
			cellWidth: $cellWidthStore,
			level: $zoomStore?.level,
			totalHolidays,
			visibleHolidays,
		};
	});
</script>

<Willow>
	<div class="demo">
		<div class="bar">
			<div>
				<strong>Test:</strong> hold Ctrl + wheel to zoom in to hour level
				— scrolling and zooming should stay smooth at any depth.
			</div>
			{#if stats}
				<div class="counter">
					bottom row: <b>{stats.visible}</b> rendered /
					<b>{stats.total}</b> total &nbsp;|&nbsp; holidays:
					<b>{stats.visibleHolidays}</b> rendered /
					<b>{stats.totalHolidays}</b> total &nbsp;|&nbsp; cellWidth: {stats.cellWidth}px
					&nbsp;|&nbsp; zoom level: {stats.level}
				</div>
			{/if}
		</div>
		<div class="gtcell">
			<Gantt
				bind:this={api}
				tasks={data.tasks}
				links={data.generatedLinks}
				{start}
				{end}
				{highlightTime}
				zoom={zoomConfig}
			/>
		</div>
	</div>
</Willow>

<style>
	.demo {
		display: flex;
		flex-direction: column;
		gap: 8px;
		height: 100%;
		font-family: var(--wx-font-family);
		font-size: var(--wx-font-size);
	}

	.bar {
		padding: 10px 14px;
		background: var(--wx-background);
		border-bottom: var(--wx-gantt-border);
	}

	.counter {
		margin-top: 6px;
		color: var(--wx-color-font-secondary, inherit);
	}

	.gtcell {
		position: relative;
		flex: 1;
		min-height: 0;
	}
</style>
