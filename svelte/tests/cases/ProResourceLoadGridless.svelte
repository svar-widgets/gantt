<script>
	import { getData, resources, assignments } from "../../demos/data";
	import { Gantt, ResourceLoad, Editor } from "../../src";
	import { RadioButtonGroup, Field, Willow } from "@svar-ui/svelte-core";

	const data = getData();

	let api = $state();

	let selected = $state("none");
	let selectedR = $state("all");
	const options = [
		{ id: "all", label: "Columns" },
		{ id: "none", label: "None" },
	];
	let cellBorders = $state("full");
	const cOptions = [
		{ id: "full", label: "Full" },
		{ id: "column", label: "Column" },
	];
</script>

<Willow>
	<div class="bar">
		<Field label="Gantt:" position="left">
			<RadioButtonGroup {options} bind:value={selected} type="inline" />
		</Field>
		<Field label="Resources:" position="left">
			<RadioButtonGroup {options} bind:value={selectedR} type="inline" />
		</Field>
		<Field label="Chart cell borders:" position="left">
			<RadioButtonGroup
				options={cOptions}
				bind:value={cellBorders}
				type="inline"
			/>
		</Field>
	</div>
	<div class="main">
		<div class="gantt">
			<Gantt
				bind:this={api}
				tasks={data.tasks}
				links={data.links}
				scales={data.scales}
				{resources}
				{assignments}
				columns={selected === "all" ? undefined : false}
				{cellBorders}
			/>
		</div>
		<div class="resource">
			<ResourceLoad
				{api}
				columns={selectedR === "all" ? undefined : false}
			/>
		</div>
		<Editor {api} />
	</div>
</Willow>

<style>
	.bar {
		padding: 10px;
		display: flex;
	}
	.main {
		position: relative;
		height: calc(100% - 50px);
		border-top: var(--wx-gantt-border);
		overflow: hidden;
	}
	.gantt {
		height: 60%;
		border-bottom: 2px solid var(--wx-gantt-border-color);
	}
	.resource {
		height: 40%;
	}
</style>
