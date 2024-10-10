<script>
	// svelte core
	import { onDestroy, tick, getContext } from "svelte";

	// views
	import TimeScales from "./TimeScale.svelte";
	import Grid from "./grid/Grid.svelte";
	import Chart from "./chart/Chart.svelte";
	import Sidebar from "./sidebar/SideBar.svelte";
	import IconButton from "../widgets/IconButton.svelte";
	import Resizer from "./Resizer.svelte";

	// parameters
	export let taskTemplate;
	export let markers;
	export let readonly;
	export let cellBorders;
	export let editorShape;
	export let highlightTime;

	const api = getContext("gantt-store");
	const _ = getContext("wx-i18n").getGroup("gantt");

	const {
		_tasks: rTasks,
		_scales: rScales,
		_activeTask: rActiveTask,
		cellWidth: rCellWidth,
		cellHeight: rCellHeight,
		columns: rColumns,
	} = api.getReactiveState();

	let gridWidth, gridColumnWidth;
	let fullWidth, fullHeight, ganttWidth, layoutWidth;

	// resize
	let compactWidth = 650;
	let compactMode = false;

	const ro = new ResizeObserver(resize);

	ro.observe(document.body);

	function resize(data) {
		for (let obj of data) {
			if (obj.target === document.body) {
				compactMode = obj.contentRect.width <= compactWidth;
				expandScale();
			}
		}
	}

	onDestroy(() => {
		ro.disconnect();
	});

	let markersData;
	$: {
		const { start, diff } = $rScales;
		markersData = markers.map(marker => {
			marker.left = diff(marker.start, start) * $rCellWidth;
			return marker;
		});
	}

	$: {
		fullWidth = $rScales.width;
		fullHeight = $rTasks.length * $rCellHeight;
		ganttWidth = gridWidth + fullWidth;

		expandScale();
	}
	let initialCall = true;
	let scaleDate, scalePos;
	async function expandScale() {
		await tick();
		if (layoutWidth > ganttWidth) {
			const params = {
				minWidth: layoutWidth - gridWidth,
			};
			if (!initialCall) {
				if (scaleDate) params.date = scaleDate;
				if (typeof scalePos !== "undefined") params.offset = scalePos;
			}
			api.exec("expand-scale", params);
		}
		if (initialCall) {
			initialCall = false;
		}
	}

	function setParams(p) {
		scaleDate = p.detail.date;
		scalePos = p.detail.offset;
	}

	$: gridWidth = calcGridWidth(compactMode, $rColumns);

	function calcGridWidth(compactMode, columns) {
		let w;
		if (columns.every(c => c.width && !c.flexgrow)) {
			w = columns.reduce((acc, c) => {
				acc += parseInt(c.width);
				return acc;
			}, 0);
		} else w = 440;

		gridColumnWidth = w;

		if (compactMode) {
			w = parseInt(columns.find(c => c.id === "action")?.width) || 50;
		}
		return w;
	}

	function addTask() {
		api.exec("add-task", { task: { text: _("New Task") } });
	}

	function resizeGrid(ev) {
		const newWidth = ev.detail;
		gridWidth = newWidth;
	}
</script>

<div class="wx-gantt">
	<div tabindex="0" class="wx-layout" bind:offsetWidth={layoutWidth}>
		{#if $rColumns.length}
			<Grid
				{compactMode}
				columnWidth={gridColumnWidth}
				width={gridWidth}
				{readonly}
				{fullHeight}
			/>
			{#if !compactMode}
				<Resizer
					value={gridWidth}
					on:move={resizeGrid}
					minValue="50"
					maxValue="800"
				/>
			{/if}
		{/if}

		<div class="wx-content">
			<TimeScales {highlightTime} />

			<Chart
				on:scale-params={setParams}
				markers={markersData}
				{readonly}
				{fullWidth}
				{fullHeight}
				{taskTemplate}
				{cellBorders}
				{highlightTime}
			/>
		</div>

		{#if $rActiveTask && !readonly}
			<Sidebar {compactMode} {editorShape} />
		{/if}

		{#if compactMode && !$rActiveTask && !readonly}
			<div class="wx-icon">
				<IconButton icon="wxi-plus" on:click={addTask} />
			</div>
		{/if}
	</div>
</div>

<style>
	.wx-gantt {
		height: 100%;
		width: 100%;
	}
	.wx-layout {
		position: relative;
		display: flex;
		max-height: 100%;
		max-width: 100%;
		background-color: var(--wx-background);
		overflow: hidden;
		outline: none;
		height: 100%;
	}

	.wx-content {
		position: relative;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.wx-icon {
		position: absolute;
		right: 25px;
		bottom: 35px;
		z-index: 4;
	}
</style>
