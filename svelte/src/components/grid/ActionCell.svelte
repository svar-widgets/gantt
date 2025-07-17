<script>
	let { column, cell } = $props();

	const action = $derived(column.id);
</script>

{#if cell || column.id == "add-task"}
	<div style="text-align:{column.align}">
		<i class="wx-action-icon wxi-plus" data-action={action}></i>
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
