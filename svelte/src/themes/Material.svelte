<script>
	import { Material } from "wx-svelte-core";
	let { fonts = true, children } = $props();
</script>

{#if children}
	<Material {fonts}>{@render children()}</Material>
{:else}
	<Material {fonts} />
{/if}

<style>
	:global(.wx-material-theme) {
		--wx-gantt-border: var(--wx-border);
		--wx-gantt-form-header-border: var(--wx-border);
		--wx-gantt-icon-color: var(--wx-icon-color);

		/* bars */
		--wx-gantt-bar-font: var(--wx-font-weight) var(--wx-font-size)
			var(--wx-font-family);
		--wx-gantt-bar-border-radius: 50px;
		--wx-gantt-milestone-border-radius: 3px;

		--wx-gantt-task-color: #448aff;
		--wx-gantt-task-font-color: #fff;
		--wx-gantt-task-fill-color: #246cd9;
		--wx-gantt-task-border-color: #448aff;
		--wx-gantt-task-border: 1px solid #246cd9;

		--wx-gantt-summary-color: #1de9b6;
		--wx-gantt-summary-font-color: #5f5f5f;
		--wx-gantt-summary-fill-color: #00d19a;
		--wx-gantt-summary-border-color: #1de9b6;
		--wx-gantt-summary-border: 1px solid #00d19a;

		--wx-gantt-milestone-color: #d33daf;

		--wx-gantt-select-color: rgb(201, 244, 240);
		--wx-gantt-link-color: #87a4bc;
		--wx-gantt-link-marker-background: #f0f0f0;
		--wx-gantt-link-marker-color: #87a4bc;

		--wx-gantt-bar-shadow: 0px 1px 2px rgba(44, 47, 60, 0.06),
			0px 3px 10px rgba(44, 47, 60, 0.12);

		--wx-gantt-progress-marker-height: 22px;
		--wx-gantt-progress-border-color: #dfdfdf;

		--wx-gantt-baseline-border-radius: 4px;

		/* grid */
		--wx-grid-header-font: 500 14px Roboto;
		--wx-grid-header-font-color: #a6a6a6;
		--wx-grid-header-text-transform: uppercase;
		--wx-grid-header-shadow: 0px 3px 5px rgba(0, 0, 0, 0.1),
			0px 1px 2px rgba(0, 0, 0, 0.1);

		--wx-grid-body-font: 400 14px Roboto;
		--wx-grid-body-font-color: #5f5f5f;
		--wx-grid-body-row-border: 1px solid transparent;
		--wx-grid-body-cell-border: 1px solid transparent;

		/* timescale */
		--wx-timescale-font: 500 12px Roboto;
		--wx-timescale-font-color: #a6a6a6;
		--wx-timescale-text-transform: uppercase;
		--wx-timescale-shadow: 0px 3px 5px rgba(0, 0, 0, 0.1),
			0px 1px 2px rgba(0, 0, 0, 0.1);
		--wx-timescale-border: 1px solid transparent;

		/* grid and timescale */
		--wx-gantt-holiday-background: #f3f7fc;
		--wx-gantt-holiday-color: #9fa1ae;

		/* markers */
		--wx-gantt-marker-font: 500 12px Roboto;
		--wx-gantt-marker-font-color: #fff;
		--wx-gantt-marker-color: rgba(6, 189, 248, 0.77);

		/* tooltips */
		--wx-tooltip-font: var(--wx-font-weight) var(--wx-font-size)
			var(--wx-font-family);
		--wx-tooltip-font-color: #e6e6e6;
		--wx-tooltip-background: rgba(0, 0, 0, 0.7);

		/* sidebar */
		--wx-sidebar-close-icon: var(--wx-color-secondary-font);
	}
</style>
