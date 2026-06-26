<script>
	let { api } = $props();

	const { _scales: scales, xArea, highlightTime } = api.getReactiveState();

	// Upper-row cells span multiple lowest-row cells. Walk widths so a span
	// whose left edge has scrolled off is still rendered while its body is visible.
	function mapRow(row, xFrom, xEnd) {
		const cells = row.cells;
		let from = 0;
		let start = cells.length;
		let acc = 0;
		for (let i = 0; i < cells.length; i++) {
			if (acc + cells[i].width > xFrom) {
				start = i;
				from = acc;
				break;
			}
			acc += cells[i].width;
		}
		let end = start;
		while (end < cells.length && acc < xEnd) {
			acc += cells[end].width;
			end++;
		}
		return { from, slice: cells.slice(start, end) };
	}

	const renderedRows = $derived.by(() => {
		const rows = $scales.rows;
		const lastIndex = rows.length - 1;

		return rows.map((row, ri) => {
			if (ri === lastIndex) {
				return {
					height: row.height,
					from: $xArea.from,
					slice: row.cells.slice($xArea.start, $xArea.end),
				};
			}
			return {
				height: row.height,
				...mapRow(row, $xArea.from, $xArea.to),
			};
		});
	});
</script>

<div class="wx-scale" style="width:{$scales.width}px;">
	{#each renderedRows as r}
		<div
			class="wx-row"
			style="height:{r.height}px; padding-left:{r.from}px"
		>
			{#each r.slice as cell}
				<div
					class="wx-cell {cell.css} {$highlightTime
						? $highlightTime(cell.date, cell.unit)
						: ''}"
					style="width:{cell.width}px"
				>
					<span class:wx-cell-value={cell.width > 100}>
						{cell.value}
					</span>
				</div>
			{/each}
		</div>
	{/each}
</div>

<style>
	.wx-scale {
		position: sticky;
		top: 0;
		background-color: var(--wx-background);
		box-shadow: var(--wx-timescale-shadow);
		z-index: 5;
		border-bottom: var(--wx-gantt-border);
	}

	.wx-row,
	.wx-cell {
		display: flex;
		box-sizing: border-box;
	}

	.wx-row:not(:last-child) {
		border-bottom: var(--wx-gantt-border);
	}
	.wx-cell-value {
		position: sticky;
		left: 0px;
		right: 0px;
		padding-left: 12px;
		padding-right: 12px;
	}

	.wx-cell {
		justify-content: center;
		align-items: center;
		border-right: var(--wx-timescale-border);
		font: var(--wx-timescale-font);
		color: var(--wx-timescale-font-color);
	}

	.wx-cell.wx-weekend {
		background: var(--wx-gantt-holiday-background);
		color: var(--wx-gantt-holiday-color);
	}
</style>
