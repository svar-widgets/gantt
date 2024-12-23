<script>
	import { getData, complexScales } from "../data";
	import { Gantt } from "../../src/";
	import { Slider } from "wx-svelte-core";

	let { skinSettings } = $props();

	const data = getData();

	let cellWidth = $state(100);
	let scaleHeight = $state(38);
	let cellHeight = $state(36);
</script>

<div class="rows">
	<div class="bar">
		<Slider label="Cell width" bind:value={cellWidth} min={20} max={200} />
		<Slider label="Cell height" bind:value={cellHeight} min={20} max={60} />
		<Slider
			label="Scale height"
			bind:value={scaleHeight}
			min={20}
			max={60}
		/>
	</div>

	<div class="gtcell">
		<Gantt
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={complexScales}
			{cellWidth}
			{cellHeight}
			{scaleHeight}
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
	}
	.gtcell {
		position: relative;
		height: 100%;
		border-top: var(--wx-gantt-border);
		overflow: hidden;
	}
</style>
