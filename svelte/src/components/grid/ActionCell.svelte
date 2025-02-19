<script>
	let { column, cell } = $props();

	const action = $derived(cell?.action || column.action);
	const icon = $derived(action == "expand" ? "menu" : "plus");
</script>

{#if cell || column.action == "add-task"}
	<div style="text-align:{column.align}">
		<i class="wx-action-icon wxi-{icon}" data-action={action}></i>
	</div>
{/if}

<style>
	.wx-action-icon {
		cursor: pointer;
		font-size: var(--wx-icon-size);
		height: 16px;
		line-height: 16px;
		display: block;
		color: var(--wx-gantt-icon-color);
	}
	.wx-action-icon:hover {
		color: var(--wx-color-link);
	}
</style>
