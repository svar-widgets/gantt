<script>
	// svelte core
	import { tick, getContext } from "svelte";

	// views
	import TimeScales from "./TimeScale.svelte";
	import Grid from "./grid/Grid.svelte";
	import Chart from "./chart/Chart.svelte";
	import Sidebar from "./sidebar/SideBar.svelte";
	import IconButton from "../widgets/IconButton.svelte";
	import Resizer from "./Resizer.svelte";

	let {
		taskTemplate,
		markers,
		readonly,
		cellBorders,
		editorShape,
		highlightTime,
	} = $props();

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

	// resize
	let compactWidth = 650;
	let compactMode = $state(false);
	let gridWidth = $state(0);

	$effect(() => {
		const ro = new ResizeObserver(resize);
		ro.observe(document.body);

		return () => {
			ro.disconnect();
		};
	});

	function resize(data) {
		for (let obj of data) {
			if (obj.target === document.body) {
				compactMode = obj.contentRect.width <= compactWidth;
				expandScale();
			}
		}
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
		scaleDate = p.date;
		scalePos = p.offset;
	}

	function addTask() {
		api.exec("add-task", { task: { text: _("New Task") } });
	}

	const markersData = $derived.by(() => {
		const { start, diff } = $rScales;
		return markers.map(marker => {
			marker.left = diff(marker.start, start) * $rCellWidth;
			return marker;
		});
	});

	let layoutWidth = $state();

	const gridColumnWidth = $derived.by(() => {
		let w;
		if ($rColumns.every(c => c.width && !c.flexgrow)) {
			w = $rColumns.reduce((acc, c) => {
				acc += parseInt(c.width);
				return acc;
			}, 0);
		} else w = 440;

		return w;
	});

	$effect(() => {
		let w = gridColumnWidth;
		if (compactMode) {
			w = parseInt($rColumns.find(c => c.id === "action")?.width) || 50;
		}
		gridWidth = w;
	});

	const fullWidth = $derived($rScales.width);
	const fullHeight = $derived($rTasks.length * $rCellHeight);
	const ganttWidth = $derived(gridWidth + fullWidth);

	// expandScale();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
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
				<Resizer bind:value={gridWidth} minValue="50" maxValue="800" />
			{/if}
		{/if}

		<div class="wx-content">
			<TimeScales {highlightTime} />

			<Chart
				scaleUpdate={setParams}
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
				<IconButton icon="wxi-plus" onclick={addTask} />
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
