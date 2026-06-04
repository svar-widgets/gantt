<script>
	import { Grid } from "@svar-ui/svelte-grid";
	import { locateID } from "@svar-ui/lib-dom";

	let { columns, data, onaction, onedit, sizes, oninit } = $props();

	function onClick(e) {
		const id = locateID(e);
		const action = e.target.dataset.action;
		if (action) e.preventDefault();
		if (id && action && onaction) onaction(id, action);
	}

	function init(tApi) {
		if (oninit) oninit(tApi);
		tApi.on("update-cell", ev => {
			const { id, column, value } = ev;
			onedit(id, column, value);
		});
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="wx-table" onclick={onClick}>
	<Grid
		{init}
		{columns}
		{data}
		select={false}
		columnStyle={col =>
			`wx-editor-cell wx-text-${col.align} ${col.id === "delete" ? "wx-action" : ""}`}
		sizes={sizes || {}}
	/>
</div>

<style>
	.wx-table :global(.wx-editor-cell),
	.wx-table :global(.wx-editor > .wx-value) {
		display: flex;
		align-items: center;
		background: inherit;
	}
	.wx-table :global(.wx-text-center) {
		justify-content: center;
	}
	.wx-table :global(.wx-cell:not(:last-child)) {
		border-right-color: transparent;
	}
</style>
