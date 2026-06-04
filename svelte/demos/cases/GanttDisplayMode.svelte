<script>
	import { getData } from "../data";
	import { Gantt } from "../../src";
	import { Slider, RadioButtonGroup, Field, Button } from "@svar-ui/svelte-core";

	let { skinSettings } = $props();

	const data = getData();

	let gridWidth = $state(400);
	let displayMode = $state("chart");
	const options = [
		{ id: "all", label: "All" },
		{ id: "grid", label: "Grid" },
		{ id: "chart", label: "Chart" },
	];

	let api = $state();
</script>

<div class="rows">
	<div class="bar">
		<Field label="Display mode:" position={"left"}>
			<RadioButtonGroup
				{options}
				bind:value={displayMode}
				type="inline"
			/>
		</Field>
		<Field label="Grid width: {gridWidth}" position={"left"}>
			<Slider bind:value={gridWidth} min={200} max={600} step={50} />
		</Field>
		<div>
			<Field label="For test only(action):" position={"left"}>
				{#each ["all", "grid", "chart"] as mode}
					<Button
						onclick={() => api.exec("set-display-mode", { mode })}
						>{mode}</Button
					>
				{/each}
			</Field>
		</div>
	</div>

	<div class="gtcell">
		<Gantt
			{...skinSettings}
			bind:this={api}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
			{displayMode}
			{gridWidth}
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
		flex-direction: column;
		gap: 16px;
	}
	.bar :global(.wx-field.wx-left) {
		align-items: center;
	}
	.bar :global(.wx-field.wx-left > .wx-label) {
		width: 120px;
	}
	.gtcell {
		position: relative;
		height: 100%;
		border-top: var(--wx-gantt-border);
		overflow: hidden;
	}
</style>
