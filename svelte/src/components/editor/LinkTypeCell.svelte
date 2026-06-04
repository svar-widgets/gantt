<script>
	let { row, column, data } = $props();

	const label = $derived.by(() => {
		if (data) return data.label;
		return column.options.find(op => op.id === row.type)?.label || "";
	});
</script>

<div class="wx-wrapper">
	<div class="wx-text">{label}</div>
	{#if row}
		<i class="wxi-angle-down"></i>
	{/if}
</div>

<style>
	.wx-wrapper {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		flex-wrap: nowrap;
	}
	.wx-text {
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}
</style>
