<script>
	import { getContext } from "svelte";

	let { highlightTime } = $props();

	const api = getContext("gantt-store");
	const { _scales: scales, scrollLeft } = api.getReactiveState();
</script>

<div class="wx-scale" style="width:{$scales.width}px;left:{-$scrollLeft}px">
	{#each $scales.rows as row}
		<div class="wx-row" style="height:{row.height}px">
			{#each row.cells as cell}
				<div
					class="wx-cell {cell.css} {highlightTime
						? highlightTime(cell.date, cell.unit)
						: ''}"
					style="width:{cell.width}px"
				>
					{cell.value}
				</div>
			{/each}
		</div>
	{/each}
</div>

<style>
	.wx-scale {
		position: relative;
		box-shadow: var(--wx-timescale-shadow);
		z-index: 1;
	}

	.wx-row,
	.wx-cell {
		display: flex;
		box-sizing: border-box;
	}

	.wx-row {
		border-bottom: var(--wx-gantt-border);
	}

	.wx-cell {
		justify-content: center;
		align-items: center;
		border-right: var(--wx-timescale-border);
		font: var(--wx-timescale-font);
		text-transform: var(--wx-timescale-text-transform);
		color: var(--wx-timescale-font-color);
	}

	.wx-cell.wx-weekend {
		background: var(--wx-gantt-holiday-background);
		color: var(--wx-gantt-holiday-color);
	}
</style>
