<script>
	import { getContext } from "svelte";

	import CellGrid from "./CellGrid.svelte";
	import Bars from "./Bars.svelte";
	import TimeScales from "./TimeScale.svelte";

	import { hotkeys } from "@svar-ui/grid-store";
	import { setID } from "@svar-ui/lib-dom";
	import { createZoomWheelHandler } from "../../helpers/zoom";

	let { readonly, fullWidth, fullHeight, taskTemplate } = $props();

	const api = getContext("gantt-store");

	const {
		_selected: selected,
		scrollTop: rScrollTop,
		scrollLeft: rScrollLeft,
		cellHeight,
		_tasks: rTasks,
		resources,
		_scales: scales,
		area,
		groupBy,
		xArea,
		zoom,
		_calendars,
		_markers,
		highlightTime,
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
		$rScrollTop;
		chartHeight;
		$cellHeight;
		dataRequest();
	});

	const chartGridHeight = $derived(Math.max(chartHeight, fullHeight));

	$effect(() => {
		chartGridHeight;
		chartHeight;
		chart.scrollTop = $rScrollTop;
		chart.scrollLeft = $rScrollLeft;
	});

	function onScroll() {
		if (chart.scrollLeft !== $rScrollLeft)
			api.exec("scroll-chart", { left: chart.scrollLeft });
	}

	function dataRequest() {
		const clientHeight = chartHeight || 0;
		const num = Math.ceil(clientHeight / $cellHeight) + 1;
		const pos = Math.floor(($rScrollTop || 0) / $cellHeight);
		const start = Math.max(0, pos - extraRows);
		const end = pos + num + extraRows;
		const from = start * $cellHeight;
		api.exec("render-data", {
			start,
			end,
			from,
		});
	}

	const onWheel = createZoomWheelHandler(
		api,
		() => $zoom,
		() => chart
	);

	function getHoliday(cell) {
		const style = $highlightTime?.(cell.date, cell.unit);
		if (style)
			return {
				css: style,
				width: cell.width,
			};
		return null;
	}

	const holidays = $derived.by(() => {
		if (!$highlightTime) return null;
		const cells = $scales.rows[$scales.rows.length - 1].cells;
		return cells.slice($xArea.start, $xArea.end).map(getHoliday);
	});

	const timelineCells = $derived.by(() => {
		const row = $scales.rows[$scales.rows.length - 1];
		const cells = row?.cells;
		return ($scales.minUnit === "hour" || $scales.minUnit === "day") &&
			cells
			? cells.slice($xArea.start, $xArea.end)
			: [];
	});

	const visibleTasks = $derived($rTasks.slice($area.start, $area.end));

	function getRowCalendars(task) {
		if ($groupBy?.field === "resource") {
			if (task.$resource) {
				const calendar = api.getResourceCalendar(task);
				return calendar ? [calendar] : [];
			}

			const groupValue = task.$groupValue;
			if (groupValue === undefined || groupValue === "$ungrouped")
				return [];

			const resourceIds = Array.isArray(groupValue)
				? groupValue
				: [groupValue];

			return resourceIds.flatMap(id => {
				const resource = $resources?.byId(id);
				if (!resource) return [];
				const calendar = api.getResourceCalendar(resource);
				return calendar ? [calendar] : [];
			});
		}

		const calendar = task.calendar ? api.getTaskCalendar(task) : undefined;
		return calendar ? [calendar] : [];
	}

	const rowHighlights = $derived.by(() => {
		const result = [];
		if (!$_calendars) return result;
		const globalCalendar = api.getCalendar();
		visibleTasks.forEach((task, index) => {
			const rowCalendars = getRowCalendars(task);
			if (!rowCalendars.length) return;
			timelineCells.forEach((cell, cellIndex) => {
				const nonWorkingCalendars = rowCalendars.filter(
					cal => !cal.isWorkingDay(cell.date)
				);
				const isRowWorkingDay = nonWorkingCalendars.length === 0;
				const isGlobalHoliday =
					globalCalendar && !globalCalendar.isWorkingDay(cell.date);

				const cellConfig = {
					width: cell.width,
					height: $cellHeight,
					left: (cellIndex + $xArea.start) * cell.width,
					top: $area.from + index * $cellHeight,
				};

				let css = "";
				if (!isRowWorkingDay) {
					const extra = nonWorkingCalendars
						.map(cal => cal.css)
						.filter(Boolean);
					css = ["wx-weekend", ...extra].join(" ");
				}
				if (isRowWorkingDay && isGlobalHoliday)
					css = "wx-weekend-override";

				if (css) result.push({ ...cellConfig, css });
			});
		});
		return result;
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
	<TimeScales {api} />
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
				{#each holidays as holiday, i (i)}
					{#if holiday}
						<div
							class={holiday.css}
							style="width: {holiday.width}px; left:{$xArea.from +
								i * holiday.width}px"
						></div>
					{/if}
				{/each}
			</div>
		{/if}

		{#each rowHighlights as row, index (index)}
			<div
				class={row.css}
				style="position: absolute; pointer-events: none; width:{row.width}px; height:{row.height}px; left:{row.left}px; top:{row.top}px"
			></div>
		{/each}

		{#if $selected.length}
			{#each $selected as obj, index (obj.id)}
				{#if obj.$y}
					<div
						class="wx-selected"
						data-id={setID(obj.id)}
						style={selectStyle[index]}
					></div>
				{/if}
			{/each}
		{/if}

		<CellGrid />

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

	.wx-weekend-override {
		background: var(--wx-background);
	}
</style>
