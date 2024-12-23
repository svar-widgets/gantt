<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";
	import { RadioButtonGroup } from "wx-svelte-core";
	let { skinSettings } = $props();

	const data = getData();
	let cellBorders = $state("full");

	const options = [
		{ id: "full", label: "Full" },
		{ id: "column", label: "Column" },
	];
</script>

<div class="rows">
	<div class="bar">
		<div class="label">Chart cell borders</div>
		<RadioButtonGroup {options} bind:value={cellBorders} type="inline" />
	</div>

	<div class="gtcell">
		<Gantt
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
			{cellBorders}
		/>
	</div>
</div>

<style>
	.rows {
		position: relative;
		display: flex;
		flex-direction: column;
		background: var(--wx-background);
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.bar {
		padding: 10px;

		display: flex;
		align-items: center;
	}
	.gtcell {
		position: relative;
		height: 100%;
		border-top: var(--wx-gantt-border);
		overflow: hidden;
	}
	.label {
		padding-right: 20px;
		font-size: var(--wx-font-size);
		font-weight: var(--wx-label-font-weight);
	}
</style>
