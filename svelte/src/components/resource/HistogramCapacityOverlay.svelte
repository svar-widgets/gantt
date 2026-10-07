<script>
	import { getHistogramCapacityPath } from "@svar-ui/gantt-store";

	let {
		rows = [],
		columns = [],
		cellHeight = 1,
		viewportHeight = 0,
		viewportWidth = 0,
		rightInset = 0,
		bottomInset = 0,
		scrollLeft = 0,
		scrollTop = 0,
	} = $props();

	const width = $derived(
		columns.reduce((total, column) => total + column.width, 0)
	);
	const columnPositions = $derived.by(() => {
		let left = 0;
		return columns.map(column => {
			const position = { column, left, right: left + column.width };
			left = position.right;
			return position;
		});
	});
	const visibleColumns = $derived.by(() => {
		const start = columnPositions.findIndex(
			position => position.right > scrollLeft
		);
		if (start === -1) return [];

		const end = scrollLeft + viewportWidth;
		let index = start;
		while (
			index < columnPositions.length &&
			columnPositions[index].left < end
		)
			index++;

		return columnPositions.slice(Math.max(0, start - 1), index);
	});
	const visibleStart = $derived(
		Math.max(0, Math.floor(scrollTop / cellHeight) - 1)
	);
	const visibleEnd = $derived(
		Math.min(
			rows.length,
			Math.ceil((scrollTop + viewportHeight) / cellHeight) + 1
		)
	);
	const visibleRows = $derived(rows.slice(visibleStart, visibleEnd));
</script>

<div
	class="wx-histogram-capacity-overlay"
	style="right:{rightInset}px;bottom:{bottomInset}px;"
	aria-hidden="true"
>
	<svg
		{width}
		height={rows.length * cellHeight}
		style="transform:translate({-scrollLeft}px, {-scrollTop}px);"
	>
		{#if visibleColumns.length}
			{#each visibleRows as row, index (row.id)}
				<path
					class="wx-histogram-capacity-path"
					d={getHistogramCapacityPath(
						row,
						visibleColumns,
						cellHeight
					)}
					transform="translate(0, {(visibleStart + index) *
						cellHeight})"
				/>
			{/each}
		{/if}
	</svg>
</div>

<style>
	.wx-histogram-capacity-overlay {
		position: absolute;
		inset: 0;
		z-index: 2;
		overflow: hidden;
		pointer-events: none;
	}

	.wx-histogram-capacity-path {
		fill: none;
		stroke: var(--wx-gantt-resource-histogram-capacity-color);
		stroke-width: 1;
	}
</style>
