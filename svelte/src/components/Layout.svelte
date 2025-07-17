<script>
	// svelte core
	import { tick, getContext } from "svelte";
	import { hotkeys } from "wx-grid-store";

	// views
	import TimeScales from "./TimeScale.svelte";
	import Grid from "./grid/Grid.svelte";
	import Chart from "./chart/Chart.svelte";
	import Resizer from "./Resizer.svelte";

	//helpers
	import { useModeObserver } from "../helpers/modeResizeObserver";

	let {
		taskTemplate,
		readonly,
		cellBorders,
		highlightTime,
		tableAPI = $bindable(),
	} = $props();

	const api = getContext("gantt-store");

	const {
		_tasks: rTasks,
		_scales: rScales,
		cellHeight: rCellHeight,
		columns: rColumns,
		scrollTop,
		_scrollTask: rScrollTask,
	} = api.getReactiveState();

	// resize
	let compactMode = $state(false);
	let gridWidth = $state(0);
	let ganttWidth = $state();
	let ganttHeight = $state();
	let innerWidth = $state();
	let chart = $state();
	let display = $state("all"); // all, grid, chart

	$effect(() => {
		const ro = useModeObserver(handleResize);
		ro.observe();

		return () => {
			ro.disconnect();
		};
	});

	let lastDisplay = null;

	function handleResize(mode) {
		if (mode != compactMode) {
			compactMode = mode;
			if (compactMode) {
				lastDisplay = display;
				if (display == "all") display = "grid";
			} else if (!lastDisplay || lastDisplay == "all") display = "all";
		}
	}

	const gridColumnWidth = $derived.by(() => {
		let w;

		if ($rColumns.every(c => c.width && !c.flexgrow)) {
			w = $rColumns.reduce((acc, c) => acc + parseInt(c.width), 0);
		} else {
			if (compactMode && display === "chart") {
				w =
					parseInt($rColumns.find(c => c.id === "action")?.width) ||
					50;
			} else {
				w = 440;
			}
		}

		return w;
	});

	$effect(() => {
		gridWidth = gridColumnWidth;
	});

	const scrollSize = $derived(ganttWidth - innerWidth);
	const fullWidth = $derived($rScales.width);
	const fullHeight = $derived($rTasks.length * $rCellHeight);
	const scrollHeight = $derived($rScales.height + fullHeight + scrollSize);
	const totalWidth = $derived(gridWidth + fullWidth);

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

	// scroll
	let ganttDiv = $state();
	function syncScroll() {
		if (ganttDiv && $scrollTop !== ganttDiv.scrollTop)
			ganttDiv.scrollTop = $scrollTop;
	}

	$effect(() => {
		$scrollTop;
		syncScroll();
	});

	function onScroll() {
		api.exec("scroll-chart", {
			top: ganttDiv.scrollTop,
		});
	}

	// Scroll to task
	function scrollToTask(value) {
		if (!value || !ganttDiv) return;
		const { id } = value;
		const index = $rTasks.findIndex(t => t.id === id);
		if (index > -1) {
			const height = ganttHeight - $rScales.height;
			const scrollY = index * $rCellHeight;
			const now = ganttDiv.scrollTop;
			let top = null;
			if (scrollY < now) {
				top = scrollY;
			} else if (scrollY + $rCellHeight > now + height) {
				top = scrollY - height + $rCellHeight + scrollSize;
			}
			if (top !== null) {
				api.exec("scroll-chart", { top: Math.max(top, 0) });
			}
		}
	}
	rScrollTask.subscribe(scrollToTask);
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
		style="height:{scrollHeight}px;width:100%;"
		bind:offsetWidth={innerWidth}
	>
		<div
			class="wx-stuck"
			style="height:{ganttHeight}px;width:{innerWidth}px;"
		>
			<div
				tabindex="0"
				class="wx-layout"
				use:hotkeys={{
					keys: {
						"ctrl+c": true,
						"ctrl+v": true,
						"ctrl+x": true,
						"ctrl+d": true,
						backspace: true,
					},
					exec: ev => {
						if (!ev.isInput) api.exec("hotkey", ev);
					},
				}}
			>
				{#if $rColumns.length}
					<Grid
						bind:display
						{compactMode}
						columnWidth={gridColumnWidth}
						width={gridWidth}
						{readonly}
						{fullHeight}
						bind:tableAPI
					/>
					<Resizer
						bind:value={gridWidth}
						bind:display
						{compactMode}
						minValue="50"
						maxValue="800"
					/>
				{/if}

				<div class="wx-content" bind:this={chart}>
					<TimeScales {highlightTime} />

					<Chart
						{readonly}
						{fullWidth}
						{fullHeight}
						{taskTemplate}
						{cellBorders}
						{highlightTime}
					/>
				</div>
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
</style>
