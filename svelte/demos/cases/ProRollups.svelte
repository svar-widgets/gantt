<script>
	import { getRollupsData } from "../data";
	import { Gantt, Editor, Tooltip } from "../../src";
	import MyTooltipContent from "../custom/MyTooltipContent.svelte";
	import { Field, Switch, Select } from "@svar-ui/svelte-core";

	let { skinSettings } = $props();

	const data = getRollupsData();

	let api = $state();
	let rollupsMode = $state("closest");

	let showBaseline = $state(false);
	let options = [
		{ id: "all", label: "All" },
		{ id: "closest", label: "Closest" },
	];
</script>

<div class="rows">
	<div class="bar">
		<Field label="Show baselines" position={"left"}>
			{#snippet children({ id })}
				<Switch bind:value={showBaseline} {id} />
			{/snippet}
		</Field>
		<Field label="Rollups mode" position={"left"}>
			<Select {options} bind:value={rollupsMode} />
		</Field>
	</div>
	<div class="gtcell">
		<Tooltip {api} content={MyTooltipContent}>
			<Gantt
				bind:this={api}
				{...skinSettings}
				rollups={{ type: rollupsMode }}
				cellHeight={45}
				tasks={data.tasks}
				links={data.links}
				baselines={showBaseline}
			/>
		</Tooltip>
		<Editor {api} />
	</div>
</div>

<style>
	.rows {
		display: flex;
		flex-direction: column;
		position: relative;
		width: 100%;
		height: 100%;
	}

	.bar {
		display: flex;
		height: 60px;
		font-family: var(--wx-font-family);
		font-size: var(--wx-font-size);
		padding-top: 12px;
		--wx-label-width: 130px;
	}
	.bar:first-child {
		margin-left: 10px;
	}
	.gtcell {
		height: 100%;
		position: relative;
		border-top: var(--wx-gantt-border);
		overflow: hidden;
	}

	:global(.wx-sidearea) {
		overflow-y: auto !important;
		height: 100%;
		max-height: 100%;
	}
</style>
