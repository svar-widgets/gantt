<script>
	import { Willow } from "@svar-ui/svelte-core";
	import { Willow as GridWillow } from "@svar-ui/svelte-grid";
	let { fonts = true, children } = $props();
</script>

{#if children}
	<Willow {fonts}
		><GridWillow {fonts}>{@render children()}</GridWillow></Willow
	>
{:else}
	<GridWillow {fonts} />
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
		--wx-gantt-critical-color: #de3a3a;

		--wx-gantt-task-color: #3983eb;
		--wx-gantt-task-font-color: #fff;
		--wx-gantt-task-fill-color: #1f6bd9;
		--wx-gantt-task-border-color: #1f6bd9;
		--wx-gantt-manual-border-color: #666666;
		--wx-gantt-task-border: 1px solid transparent;
		--wx-gantt-task-critical-color: var(--wx-gantt-critical-color);
		--wx-gantt-task-critical-fill-color: #c83434;
		--wx-gantt-task-slack-color: #f5f9fe;
		--wx-gantt-task-slack-border-color: #b0cdf7;
		--wx-gantt-inactive-color: #c5cace;
		--wx-gantt-inactive-fill-color: #adb5ba;

		--wx-gantt-summary-color: #00ba94;
		--wx-gantt-summary-font-color: #ffffff;
		--wx-gantt-summary-fill-color: #099f81;
		--wx-gantt-summary-border-color: #099f81;
		--wx-gantt-summary-border: 1px solid transparent;
		--wx-gantt-summary-critical-color: #d9306f;
		--wx-gantt-summary-critical-fill-color: #c32b64;

		--wx-gantt-milestone-color: #ad44ab;

		--wx-gantt-select-color: #eaedf5;
		--wx-gantt-link-color: #9fa1ae;
		--wx-gantt-link-color-hovered: #6e777d;
		--wx-gantt-link-critical-color: var(--wx-gantt-critical-color);
		--wx-gantt-link-critical-color-hovered: #b22e2e;
		--wx-gantt-link-violation-color: var(
			--wx-gantt-constraint-violation-color
		);
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
		--wx-grid-cell-padding-x: 12px;
		--wx-grid-header-sort-padding-right: 4px;
		--wx-grid-tree-column-padding-left: 3px;

		/* timescale */
		--wx-timescale-font: var(--wx-font-weight-md) var(--wx-font-size-sm)
			var(--wx-font-family);
		--wx-timescale-font-color: var(--wx-color-font);
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

		/* progress line */
		--wx-gantt-progress-line-color: #f5953b;
		--wx-gantt-progress-line-width: 1;

		/* s-curve */
		--wx-gantt-scurve-scheduled-color: #ffc975;
		--wx-gantt-scurve-scheduled-width: 1;
		--wx-gantt-scurve-scheduled-dasharray: none;
		--wx-gantt-scurve-earned-color: #fe6158;
		--wx-gantt-scurve-earned-width: 1;
		--wx-gantt-scurve-earned-dasharray: 4 4;
		--wx-gantt-scurve-baseline-color: #2c2f3c;
		--wx-gantt-scurve-baseline-width: 1;
		--wx-gantt-scurve-baseline-dasharray: 2 2;

		/* sidebar */
		--wx-sidebar-close-icon: #c0c3ce;

		/* resources */
		--wx-gantt-load-normal-color: #d9f5ef;
		--wx-gantt-load-normal-hover-color: #bce9de;
		--wx-gantt-load-danger-color: #f9d7d7;
		--wx-gantt-load-danger-hover-color: #f2bcbc;
		--wx-gantt-resource-histogram-load-color: var(
			--wx-gantt-load-normal-color
		);
		--wx-gantt-resource-histogram-load-hover-color: var(
			--wx-gantt-load-normal-hover-color
		);
		--wx-gantt-resource-histogram-overload-color: var(
			--wx-gantt-load-danger-color
		);
		--wx-gantt-resource-histogram-overload-hover-color: var(
			--wx-gantt-load-danger-hover-color
		);
		--wx-gantt-resource-histogram-capacity-color: var(--wx-color-primary);

		/* deadlines */
		--wx-gantt-deadline-color: var(--wx-color-font-alt);
		--wx-gantt-deadline-overdue-color: var(--wx-color-danger);

		/* constraints */
		--wx-gantt-constraint-violation-color: #f5a345;
		--wx-gantt-constraint-violated-badge-bg: #fdeedd;
	}
</style>
