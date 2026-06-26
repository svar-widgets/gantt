<script>
	// svelte core
	import { getContext } from "svelte";
	import { hotkeys } from "@svar-ui/grid-store";

	// views
	import Grid from "./grid/Grid.svelte";
	import Chart from "./chart/Chart.svelte";
	import Resizer from "./Resizer.svelte";

	let {
		taskTemplate,
		readonly,
		tableAPI = $bindable(),
		ganttWidth = $bindable(),
	} = $props();

	const api = getContext("gantt-store");

	const {
		_tasks: rTasks,
		_scales: rScales,
		cellHeight: rCellHeight,
		columns: rColumns,
		scrollTop: rScrollTop,
		undo,
		_columnsWidth,
	} = api.getReactiveState();

	let ganttHeight = $state();
	let innerWidth = $state();
	let chart = $state();

	const scrollSize = $derived(ganttWidth - innerWidth);
	const fullWidth = $derived($rScales.width);
	const fullHeight = $derived($rTasks.length * $rCellHeight);
	const scrollHeight = $derived($rScales.height + fullHeight + scrollSize);

	// expand scale
	$effect(() => {
		let ro;
		if (chart) {
			ro = new ResizeObserver(chartResizeHandler);
			ro.observe(chart);
		}
		return () => {
			if (ro) ro.disconnect();
		};
	});

	function chartResizeHandler() {
		api.exec("resize-chart", {
			width: ganttWidth - $_columnsWidth - scrollSize - 4, // resizer width
			height: ganttHeight - $rScales.height,
			scrollSize,
		});
	}

	// scroll
	let ganttDiv = $state();

	function onScroll() {
		api.exec("scroll-chart", {
			top: ganttDiv.scrollTop,
		});
	}
	//[FIXME] don't use this effect it in react
	function syncScroll() {
		if (ganttDiv && $rScrollTop !== ganttDiv.scrollTop)
			ganttDiv.scrollTop = $rScrollTop;
	}

	$effect(() => {
		$rScrollTop;
		syncScroll();
	});
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
						"ctrl+z": $undo,
						"ctrl+y": $undo,
					},
					exec: ev => {
						if (!ev.isInput) api.exec("hotkey", ev);
					},
				}}
			>
				{#if $rColumns.length}
					<Grid {readonly} {fullHeight} bind:tableAPI />
					<Resizer containerWidth={ganttWidth} {api} />
				{/if}

				<div class="wx-content" bind:this={chart}>
					<Chart {readonly} {fullWidth} {fullHeight} {taskTemplate} />
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
