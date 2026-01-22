<script>
	import { getContext } from "svelte";

	import CellGrid from "./CellGrid.svelte";
	import Bars from "./Bars.svelte";
	import TimeScales from "./TimeScale.svelte";

	import { hotkeys } from "@svar-ui/grid-store";

	let {
		readonly,
		fullWidth,
		fullHeight,
		taskTemplate,
		cellBorders,
		highlightTime,
	} = $props();

	const api = getContext("gantt-store");

	const {
		_selected: selected,
		scrollTop: rScrollTop,
		cellWidth,
		cellHeight,
		_scales: scales,
		zoom,
		context,
		_markers,
		_scrollTask: rScrollTask,
	} = api.getReactiveState();

	let chartHeight = $state();
	let chart = $state();

	let extraRows = 1;

	const selectStyle = $derived.by(() => {
		const t = [];
		if ($selected.length && $cellHeight) {
			$selected.forEach(obj => {
				t.push([`height: ${$cellHeight}px;top: ${obj.$y - 3}px`]);
			});
		}

		return t;
	});

	$effect(() => {
		chartHeight;
		dataRequest();
	});

	const chartGridHeight = $derived(Math.max(chartHeight, fullHeight));

	$effect(() => {
		chart.scrollTop = $rScrollTop;
	});

	function onScroll() {
		const scroll = { left: true, top: true };
		setScroll(scroll);
		dataRequest();
	}

	function setScroll(scroll) {
		const pos = {};
		if (scroll.top) pos.top = chart.scrollTop;
		if (scroll.left) pos.left = chart.scrollLeft;
		api.exec("scroll-chart", pos);
	}

	function dataRequest() {
		const clientHeight = chartHeight || 0;
		const num = Math.ceil(clientHeight / $cellHeight) + 1;
		const pos = Math.floor((chart.scrollTop || 0) / $cellHeight);
		const start = Math.max(0, pos - extraRows);
		const end = pos + num + extraRows;
		const from = start * $cellHeight;
		api.exec("render-data", {
			start,
			end,
			from,
		});
	}

	function showTask(value) {
		if ($context || !value) return;

		const { id, mode } = value;

		if (mode.toString().indexOf("x") < 0) return;
		const { clientWidth } = chart;
		const task = api.getTask(id);
		if (task.$x + task.$w < chart.scrollLeft) {
			api.exec("scroll-chart", { left: task.$x - (cellWidth || 0) });
			chart.scrollLeft = task.$x - (cellWidth || 0);
		} else if (task.$x >= clientWidth + chart.scrollLeft) {
			const width = clientWidth < task.$w ? $cellWidth : task.$w;
			api.exec("scroll-chart", { left: task.$x - clientWidth + width });
			chart.scrollLeft = task.$x - clientWidth + width;
		}
	}
	rScrollTask.subscribe(value => showTask(value));

	function onWheel(e) {
		if ($zoom && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			const dir = -Math.sign(e.deltaY);
			const offset = e.clientX - chart.getBoundingClientRect().left;
			api.exec("zoom-scale", {
				dir,
				offset,
			});
		}
	}

	function getHoliday(cell) {
		const style = highlightTime(cell.date, cell.unit);
		if (style)
			return {
				css: style,
				width: cell.width,
			};
		return null;
	}

	const holidays = $derived.by(() => {
		return ($scales.minUnit === "hour" || $scales.minUnit === "day") &&
			highlightTime
			? $scales.rows[$scales.rows.length - 1].cells.map(getHoliday)
			: null;
	});

	function handleHotkey(ev) {
		ev.eventSource = "chart";
		api.exec("hotkey", ev);
	}
</script>

<div
	class="wx-chart"
	tabindex="-1"
	bind:this={chart}
	onscroll={onScroll}
	onwheel={onWheel}
	bind:clientHeight={chartHeight}
	use:hotkeys={{
		keys: {
			arrowup: true,
			arrowdown: true,
		},
		exec: v => handleHotkey(v),
	}}
>
	<TimeScales {highlightTime} />
	{#if $_markers.length}
		<div class="wx-markers" style="height:{chartGridHeight}px;">
			{#each $_markers as marker}
				<div
					class="wx-marker {marker.css || ''}"
					style="left:{marker.left}px"
				>
					<div class="wx-content">{marker.text}</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="wx-area" style="width:{fullWidth}px;height:{chartGridHeight}px">
		{#if holidays}
			<div class="wx-gantt-holidays" style="height:100%;">
				{#each holidays as holiday, i}
					{#if holiday}
						<div
							class={holiday.css}
							style="width: {holiday.width}px; left:{i *
								holiday.width}px"
						></div>
					{/if}
				{/each}
			</div>
		{/if}

		<CellGrid borders={cellBorders} />

		{#if $selected.length}
			{#each $selected as obj, index (obj.id)}
				{#if obj.$y}
					<div
						class="wx-selected"
						data-id={obj.id}
						style={selectStyle[index]}
					></div>
				{/if}
			{/each}
		{/if}

		<Bars {readonly} {taskTemplate} />
	</div>
</div>

<style>
	.wx-chart {
		position: relative;
		flex: 1 1 auto;
		overflow-x: auto;
		overflow-y: hidden;
		outline: none;
	}

	.wx-markers {
		position: absolute;
	}

	.wx-marker {
		position: absolute;
		z-index: 4;
		width: 2px;
		height: 100%;
		text-align: center;
		user-select: none;
		transform: scaleX(-1);
		background: var(--wx-gantt-marker-color);
	}

	.wx-content {
		position: absolute;
		min-width: 50px;
		padding: 4px 8px;
		border-top-left-radius: 4px;
		border-bottom-left-radius: 4px;
		font: var(--wx-gantt-marker-font);
		color: var(--wx-gantt-marker-font-color);
		background-color: inherit;
		white-space: nowrap;
		transform: scaleX(-1);
	}

	.wx-area {
		position: relative;
		overflow-y: hidden;
	}

	.wx-selected {
		position: absolute;
		box-sizing: border-box;
		left: 0;
		width: 100%;
		background: var(--wx-gantt-select-color);
	}

	.wx-cut {
		opacity: 50%;
	}

	.wx-gantt-holidays {
		height: 100%;
		width: 100%;
		position: absolute;
	}

	.wx-weekend {
		height: 100%;
		background: var(--wx-gantt-holiday-background);
		color: var(--wx-gantt-holiday-color);
		position: absolute;
	}
</style>
