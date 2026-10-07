<script>
	import { getHistogramBars } from "@svar-ui/gantt-store";

	let { row, column } = $props();

	const MIN_LABEL_WIDTH = 36;

	function getBarStyle(hours, ceiling) {
		const rawHeight =
			ceiling > 0 ? Math.min((hours / ceiling) * 100, 100) : 0;
		const height = Math.round(rawHeight * 100) / 100;
		if (hours > 0 && rawHeight > 0) {
			return `height:max(${height}%, 3px);`;
		}
		return `height:${height}%;`;
	}

	function getLabel(bar) {
		return `${bar.hours}/${bar.capacity}`;
	}

	function showLabel(bar) {
		return bar.hours > 0 && bar.width >= MIN_LABEL_WIDTH;
	}

	const bars = $derived(getHistogramBars(row, column));
</script>

<div class="wx-histogram">
	{#each bars as bar (bar.key)}
		<div class="wx-histogram-bar">
			<div class="wx-histogram-stack">
				<div
					class="wx-histogram-load"
					class:wx-histogram-overload={bar.overloaded}
					style={getBarStyle(bar.hours, bar.ceiling)}
				></div>
			</div>
			{#if showLabel(bar)}
				<div class="wx-histogram-label">
					<span class="wx-histogram-label-text">
						{getLabel(bar)}
					</span>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.wx-histogram {
		display: flex;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.wx-histogram-bar {
		position: relative;
		flex: 1 1 0;
		height: 100%;
		overflow: hidden;
	}

	.wx-histogram-stack {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column-reverse;
	}

	.wx-histogram-load {
		width: 100%;
		background: var(--wx-gantt-resource-histogram-load-color);
	}

	.wx-histogram-load:hover {
		background: var(--wx-gantt-resource-histogram-load-hover-color);
	}

	.wx-histogram-overload {
		background: var(--wx-gantt-resource-histogram-overload-color);
	}

	.wx-histogram-overload:hover {
		background: var(--wx-gantt-resource-histogram-overload-hover-color);
	}

	.wx-histogram-label {
		position: absolute;
		inset: 0 2px;
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: center;
		font: var(--wx-font-weight-md) var(--wx-font-size-sm)
			var(--wx-font-family);
		color: var(--wx-grid-body-font-color);
		pointer-events: none;
	}

	.wx-histogram-label-text {
		display: block;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
