<script>
	let { column, row, cell } = $props();

	const action = $derived(column.id);

	const icon = $derived.by(() => {
		if (action.includes("edit")) return "wxi-edit";
		if (action.includes("add")) return "wxi-plus";
		if (action.includes("delete")) return "wxi-delete";
		return "";
	});

	const disabled = $derived.by(() => {
		if (!action.includes("add")) return false;
		const gValue = row.$groupValue;
		return (
			(!row.$group && typeof gValue !== "undefined") ||
			(row.$group && typeof gValue === "undefined")
		);
	});
</script>

{#if cell || icon}
	<div style="text-align:{column.align}">
		<i
			class="wx-action-icon {icon}"
			class:wx-disabled={disabled}
			data-action={!disabled && action}
		></i>
	</div>
{/if}

<style>
	.wx-action-icon.wx-disabled {
		color: var(--wx-color-font-disabled);
		cursor: default;
	}
	.wx-action-icon {
		cursor: pointer;
		font-size: var(--wx-icon-size);
		height: 16px;
		line-height: 16px;
		display: block;
		color: var(--wx-gantt-icon-color);
	}
	.wx-action-icon:not(.wx-disabled):hover {
		color: var(--wx-color-link);
	}
</style>
