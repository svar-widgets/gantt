<script>
	import { WillowDark } from "@svar-ui/svelte-core";
	import { WillowDark as GridWillowDark } from "@svar-ui/svelte-grid";
	let { fonts = true, children } = $props();
</script>

{#if children}
	<WillowDark {fonts}
		><GridWillowDark {fonts}>{@render children()}</GridWillowDark
		></WillowDark
	>
{:else}
	<GridWillowDark {fonts} />
	<WillowDark {fonts} />
{/if}

<style>
	:global(.wx-willow-dark-theme) {
		color-scheme: dark;

		--wx-gantt-border-color: #384047;
		--wx-gantt-border: var(--wx-border);
		--wx-gantt-form-header-border: none;
		--wx-gantt-icon-color: #9fa1ae;

		/* bars */
		--wx-gantt-bar-font: var(--wx-font-weight) var(--wx-font-size)
			var(--wx-font-family);
		--wx-gantt-bar-border-radius: 3px;
		--wx-gantt-milestone-border-radius: 3px;
		--wx-gantt-critical-color: #de3a3a;

		--wx-gantt-task-color: #37a9ef;
		--wx-gantt-task-font-color: #ffffffe5;
		--wx-gantt-task-fill-color: #098cdc;
		--wx-gantt-task-border-color: #098cdc;
		--wx-gantt-manual-border-color: #666666;
		--wx-gantt-task-border: 1px solid transparent;
		--wx-gantt-task-critical-color: var(--wx-gantt-critical-color);
		--wx-gantt-task-critical-fill-color: #c83434;
		--wx-gantt-task-slack-color: #2c3440;
		--wx-gantt-task-slack-border-color: #597194;
		--wx-gantt-inactive-color: #c5cace;
		--wx-gantt-inactive-fill-color: #adb5ba;

		--wx-gantt-summary-color: #00ba94;
		--wx-gantt-summary-font-color: #ffffffe5;
		--wx-gantt-summary-fill-color: #099f81;
		--wx-gantt-summary-border-color: #099f81;
		--wx-gantt-summary-border: 1px solid transparent;
		--wx-gantt-summary-critical-color: #d9306f;
		--wx-gantt-summary-critical-fill-color: #c32b64;

		--wx-gantt-progress-marker-height: 26px;
		--wx-gantt-progress-border-color: #4b5359;

		--wx-gantt-baseline-border-radius: 2px;

		/* temp*/
		--wx-gantt-bar-shadow: 0px 1px 2px rgba(44, 47, 60, 0.06),
			0px 3px 10px rgba(44, 47, 60, 0.12);

		--wx-gantt-milestone-color: #ad44ab;

		--wx-gantt-select-color: #384047;
		--wx-gantt-link-color: #9fa1ae;
		--wx-gantt-link-color-hovered: #c8c7cf;
		--wx-gantt-link-critical-color: var(--wx-gantt-critical-color);
		--wx-gantt-link-critical-color-hovered: #b22e2e;
		--wx-gantt-link-violation-color: var(
			--wx-gantt-constraint-violation-color
		);
		--wx-gantt-link-marker-background: #384047;
		--wx-gantt-link-marker-color: #9fa1ae;

		/* grid */
		--wx-grid-header-font: var(--wx-font-weight-md) var(--wx-font-size)
			var(--wx-font-family);
		--wx-grid-header-font-color: var(--wx-color-font);
		--wx-grid-header-text-transform: capitalize;
		--wx-grid-header-shadow: none;

		--wx-grid-body-font: var(--wx-font-weight) var(--wx-font-size)
			var(--wx-font-family);
		--wx-grid-body-font-color: var(--wx-color-font);
		--wx-grid-body-row-border: var(--wx-border);
		--wx-grid-body-cell-border: 1px solid transparent;
		--wx-grid-cell-padding-x: 12px;
		--wx-grid-header-sort-padding-right: 4px;
		--wx-grid-tree-column-padding-left: 3px;

		/* timescale */
		--wx-timescale-font: var(--wx-font-weight-md) var(--wx-font-size-sm)
			var(--wx-font-family);
		--wx-timescale-font-color: var(--wx-color-font);
		--wx-timescale-shadow: none;
		--wx-timescale-border: var(--wx-border);

		/* grid and timescale */
		--wx-gantt-holiday-background: #303539;
		--wx-gantt-holiday-color: #878994;

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
		--wx-gantt-scurve-baseline-color: #ffffffe5;
		--wx-gantt-scurve-baseline-width: 1;
		--wx-gantt-scurve-baseline-dasharray: 2 2;

		/* sidebar */
		--wx-sidebar-close-icon: #384047;

		/* resources */
		--wx-gantt-load-normal-color: #283433;
		--wx-gantt-load-normal-hover-color: #286163;
		--wx-gantt-load-danger-color: #3c2a2c;
		--wx-gantt-load-danger-hover-color: #733e4e;
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
		--wx-gantt-constraint-violation-color: #f0b258;
		--wx-gantt-constraint-violation-font-color: #2c2f3c;
		--wx-gantt-constraint-violated-badge-bg: #4a3d30;
	}
</style>
