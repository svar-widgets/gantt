<script>
	import { Checkbox } from "@svar-ui/svelte-core";

	let { row, column, onaction } = $props();

	function handleChange({ value }) {
		onaction({
			action: "update-cell",
			data: { id: row.id, column: column.id, value },
		});
	}
</script>

<div class="wx-flag-cell">
	<Checkbox value={!!row[column.id]} onchange={handleChange} />
</div>

<style>
	.wx-flag-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}
</style>
