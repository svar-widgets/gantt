<script>
	import { getGeneratedData, complexScales } from "../data";
	import { Gantt } from "../../src/";
	import { Button } from "wx-svelte-core";

	const { skinSettings } = $props();

	const count = 10000;
	const years = 3;
	const data = getGeneratedData("", count, years);

	let start = $state();
	let outArea = $state();

	$effect(() => {
		if (start && outArea) outArea.innerHTML = new Date() - start;
	});
</script>

<div class="rows">
	<div class="row">
		{#if start}
			10 000 tasks (
			{years}
			years ) rendered in
			<span bind:this={outArea}></span>
			ms
		{:else}
			<Button type="primary" onclick={() => (start = new Date())}>
				Press me to render Gantt chart with 10 000 tasks
			</Button>
		{/if}
	</div>

	{#if start}
		<div class="gtcell">
			<Gantt
				{...skinSettings}
				tasks={data.tasks}
				links={data.links}
				scales={complexScales}
			/>
		</div>
	{/if}
</div>

<style>
	.rows {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.row {
		padding: 13px;
		font-family: var(--wx-font-family);
		font-size: var(--wx-font-size);
	}

	.gtcell {
		position: relative;
		height: 100%;
		min-height: 0;
		border-top: var(--wx-gantt-border);
		margin-bottom: 10px;
	}

	.gtcell:last-of-type {
		margin-bottom: 0;
	}
</style>
