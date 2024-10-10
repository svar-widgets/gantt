<script>
	import {
		afterUpdate,
		onMount,
		getContext,
		createEventDispatcher,
	} from "svelte";
	import { getAdder, getUnitStart } from "wx-gantt-store";

	import CellGrid from "./CellGrid.svelte";
	import Bars from "./Bars.svelte";
	import Links from "./Links.svelte";

	export let readonly;
	export let markers;
	export let fullWidth;
	export let fullHeight;
	export let taskTemplate;
	export let cellBorders;
	export let highlightTime;

	const dispatch = createEventDispatcher();
	const api = getContext("gantt-store");

	const {
		_selected: selected,
		scrollLeft: rScrollLeft,
		scrollTop: rScrollTop,
		cellWidth,
		cellHeight,
		_scales: scales,
		zoom,
		_start: start,
		context,
		_scrollSelected: scrollSelected,
	} = api.getReactiveState();

	let scrollLeft, scrollTop;
	$: lengthUnitWidth = $scales.lengthUnitWidth;
	$: scrollLeft = $rScrollLeft;
	$: scrollTop = $rScrollTop;

	let chart = {};
	let extraRows = 0;
	let markersHeight = 0;
	let selectStyle = [];
	let lastSelectedId;
	let timer;

	$: if ($selected.length && $cellHeight) {
		selectStyle = [];
		$selected.forEach(obj => {
			selectStyle.push([`height: ${$cellHeight}px;top: ${obj.$y - 3}px`]);
		});
		if ($scrollSelected) {
			const selectedTask = $selected[$selected.length - 1];
			if (lastSelectedId !== selectedTask.id) {
				lastSelectedId = selectedTask.id;
				scrollToTask(selectedTask);
			}
		}
	}

	$: if ($cellHeight) dataRequest();

	$: markersHeight =
		fullHeight > chart.clientHeight ? chart.clientHeight : fullHeight;

	onMount(() => {
		dataRequest();
	});

	afterUpdate(() => {
		chart.scrollTop = scrollTop;
		chart.scrollLeft = scrollLeft;
		if (scrollTop != chart.scrollTop) setScroll({ top: true });

		// when zoom code in DataStore resets left scroll, it's unaware of the new client width of the chart and if it's necessary to scroll, so the chart has to make it right
		if (scrollLeft != chart.scrollLeft) setScroll({ left: true });
	});

	function onScroll() {
		const scroll = { left: true, top: true };
		setScroll(scroll, true);
		dataRequest();
	}

	function dispatchScale(params) {
		dispatch(
			"scale-params",
			params || { date: calcDate(chart.scrollLeft) }
		);
	}
	function setScroll(scroll, timeout) {
		const pos = {};
		if (scroll.top) pos.top = chart.scrollTop;
		if (timer) clearTimeout(timer);
		if (scroll.left) {
			pos.left = chart.scrollLeft;
			if (timeout)
				timer = setTimeout(function () {
					dispatchScale();
				}, 100);
			else dispatchScale();
		}
		api.exec("scroll-chart", pos);
	}

	function dataRequest() {
		const clientHeight = chart.clientHeight || 0;
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

	function scrollToTask(task) {
		if ($context) return;
		const { clientHeight, clientWidth } = chart;

		if (task.$x < scrollLeft) {
			scrollLeft = task.$x - $cellWidth;
		} else if (task.$x + task.$w >= clientWidth + scrollLeft) {
			const width = clientWidth < task.$w ? $cellWidth : task.$w;
			scrollLeft = task.$x - clientWidth + width;
		}

		if (task.$y < scrollTop) {
			scrollTop = task.$y - $cellHeight;
		} else if (task.$y + task.$h >= clientHeight + scrollTop) {
			scrollTop = task.$y - clientHeight + $cellHeight;
		}
	}

	function calcDate(x) {
		const width =
			$scales.lengthUnit === "day"
				? lengthUnitWidth / 24
				: lengthUnitWidth;
		return getAdder("hour")(
			getUnitStart($scales.minUnit, $start),
			Math.floor(x / width)
		);
	}

	function onWheel(e) {
		if ($zoom && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			const dir = -Math.sign(e.deltaY);
			const offset = e.clientX - chart.getBoundingClientRect().left;
			const pointerX = offset + scrollLeft;
			const date = calcDate(pointerX);
			dispatchScale({ offset, date });
			api.exec("zoom-scale", {
				dir,
				date,
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

	$: holidays =
		($scales.minUnit === "hour" || $scales.minUnit === "day") &&
		highlightTime
			? $scales.rows[$scales.rows.length - 1].cells.map(getHoliday)
			: null;
</script>

<svelte:window on:resize={dataRequest} />

<div class="wx-chart" bind:this={chart} on:scroll={onScroll} on:wheel={onWheel}>
	{#if markers.length}
		<div
			class="wx-markers"
			style="height:{markersHeight}px;left:{-scrollLeft}px"
		>
			{#each markers as marker}
				<div
					class="wx-marker {marker.css || 'wx-default'}"
					style="left:{marker.left}px"
				>
					<div class="wx-content">{marker.text}</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="wx-area" style="width:{fullWidth}px;height:{fullHeight}px">
		{#if holidays}
			<div class="wx-gantt-holidays" style="height:100%;">
				{#each holidays as holiday, i}
					{#if holiday}
						<div
							class={holiday.css}
							style="width: {holiday.width}px; left:{i *
								holiday.width}px"
						/>
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
					/>
				{/if}
			{/each}
		{/if}

		<Links width={fullWidth} height={fullHeight} />
		<Bars {readonly} {taskTemplate} />
	</div>
</div>

<style>
	.wx-chart {
		flex: 1 1 auto;
		overflow: auto;
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
	}
	.wx-default {
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
