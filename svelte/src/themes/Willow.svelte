<script>
	import { Willow } from "wx-svelte-core";
	let { fonts = true, children } = $props();
</script>

{#if children}
	<Willow {fonts}>{@render children()}</Willow>
{:else}
	<Willow {fonts} />
{/if}

<style>
	:global(.wx-willow-theme) {
		--wx-gantt-border-color: #e6e6e6;
		--wx-gantt-border: 1px solid #1d1e261a;
		--wx-gantt-form-header-border: none;
		--wx-gantt-icon-color: #9fa1ae;

		/* bars */
		--wx-gantt-bar-font: var(--wx-font-weight) var(--wx-font-size)
			var(--wx-font-family);
		--wx-gantt-bar-border-radius: 3px;
		--wx-gantt-milestone-border-radius: 3px;

		--wx-gantt-task-color: #3983eb;
		--wx-gantt-task-font-color: #fff;
		--wx-gantt-task-fill-color: #1f6bd9;
		--wx-gantt-task-border-color: #1f6bd9;
		--wx-gantt-task-border: 1px solid transparent;

		--wx-gantt-summary-color: #00ba94;
		--wx-gantt-summary-font-color: #ffffff;
		--wx-gantt-summary-fill-color: #099f81;
		--wx-gantt-summary-border-color: #099f81;
		--wx-gantt-summary-border: 1px solid transparent;

		--wx-gantt-milestone-color: #ad44ab;

		--wx-gantt-select-color: #eaedf5;
		--wx-gantt-link-color: #9fa1ae;
		--wx-gantt-link-marker-background: #eaedf5;
		--wx-gantt-link-marker-color: #9fa1ae;

		--wx-gantt-bar-shadow: 0px 1px 2px rgba(44, 47, 60, 0.06),
			0px 3px 10px rgba(44, 47, 60, 0.12);

		--wx-gantt-progress-marker-height: 26px;
		--wx-gantt-progress-border-color: #c0c3ce;

		--wx-gantt-baseline-border-radius: 2px;

		/* grid */
		--wx-grid-header-font: var(--wx-font-weight-md) var(--wx-font-size)
			var(--wx-font-family);
		--wx-grid-header-font-color: var(--wx-color-font);
		--wx-grid-header-text-transform: capitalize;
		--wx-grid-header-shadow: none;

		--wx-grid-body-font: var(--wx-font-weight) var(--wx-font-size)
			var(--wx-font-family);
		--wx-grid-body-font-color: var(--wx-color-font);
		--wx-grid-body-row-border: var(--wx-gantt-border);
		--wx-grid-body-cell-border: 1px solid transparent;

		/* timescale */
		--wx-timescale-font: var(--wx-font-weight-md) var(--wx-font-size-sm)
			var(--wx-font-family);
		--wx-timescale-font-color: var(--wx-color-font);
		--wx-timescale-text-transform: uppercase;
		--wx-timescale-shadow: none;
		--wx-timescale-border: var(--wx-gantt-border);

		/* grid and timescale */
		--wx-gantt-holiday-background: #f0f6fa;
		--wx-gantt-holiday-color: #9fa1ae;

		/* markers */
		--wx-gantt-marker-font: var(--wx-font-weight-md) var(--wx-font-size-sm)
			var(--wx-font-family);
		--wx-gantt-marker-font-color: #fff;
		--wx-gantt-marker-color: rgba(6, 189, 248, 0.77);

		/* tooltips */
		--wx-tooltip-font: var(--wx-font-weight) var(--wx-font-size)
			var(--wx-font-family);
		--wx-tooltip-font-color: #e6e6e6;
		--wx-tooltip-background: #4f525a;

		/* sidebar */
		--wx-sidebar-close-icon: #c0c3ce;
	}
</style>
