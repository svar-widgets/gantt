<script>
	import { Cell } from "wx-svelte-grid";

	let { row, col, columnStyle, cellStyle } = $props();
</script>

<Cell {row} {col} {columnStyle} {cellStyle}>
	{#if col.action == "add-task"}
		<div style="text-align:{col.align}">
			<i class="wx-add-icon wxi-plus" data-action={col.action}></i>
		</div>
	{/if}
</Cell>

<style>
	.wx-add-icon {
		cursor: pointer;
		font-size: var(--wx-icon-size);
		height: 16px;
		line-height: 16px;
		display: block;
		color: var(--wx-gantt-icon-color);
	}
	.wx-add-icon:hover {
		color: var(--wx-color-link);
	}
</style>
