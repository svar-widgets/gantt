<script>
	// svelte core
	import { getContext, tick } from "svelte";

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
	let ganttWidth = $state();
	let ganttHeight = $state();
	let innerWidth = $state();
	let chart = $state();

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
			}
		}
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

	const scrollSize = $derived(ganttWidth - innerWidth);
	const fullWidth = $derived($rScales.width);
	const fullHeight = $derived($rTasks.length * $rCellHeight);
	const scrollHeight = $derived($rScales.height + fullHeight + scrollSize);
	const totalWidth = $derived(gridWidth + fullWidth);

	let ganttDiv = $state();
	function onScroll() {
		api.exec("scroll-chart", {
			top: ganttDiv.scrollTop,
		});
	}

	// expand scale
	$effect(() => {
		let ro;
		if (chart) {
			ro = new ResizeObserver(expandScale);
			ro.observe(chart);
		}
		return () => {
			if (ro) ro.disconnect();
		};
	});
	function expandScale() {
		tick().then(() => {
			if (ganttWidth > totalWidth) {
				const minWidth = ganttWidth - gridWidth;
				api.exec("expand-scale", { minWidth });
			}
		});
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="wx-gantt"
	bind:this={ganttDiv}
	bind:offsetHeight={ganttHeight}
	bind:offsetWidth={ganttWidth}
	onscroll={onScroll}
>
	<div
		class="wx-pseudo-rows"
		style="height: {scrollHeight}px;width:100%;"
		bind:offsetWidth={innerWidth}
	>
		<div
			class="wx-stuck"
			style="height:{ganttHeight}px;width:{innerWidth}px;"
		>
			<div tabindex="0" class="wx-layout">
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
							bind:value={gridWidth}
							minValue="50"
							maxValue="800"
						/>
					{/if}
				{/if}

				<div class="wx-content" bind:this={chart}>
					<TimeScales {highlightTime} />

					<Chart
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
	</div>
</div>

<style>
	.wx-gantt {
		height: 100%;
		width: 100%;
		overflow-y: auto;
	}
	.wx-pseudo-rows {
		width: 100%;
		height: auto;
		min-height: 100%;
	}
	.wx-stuck {
		position: sticky;
		top: 0;
		height: 100%;
		width: 100%;
		max-height: 100%;
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
