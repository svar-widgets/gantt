<script>
	import { getData, resources, assignments } from "../data";
	import { Gantt, ResourceLoad, Tooltip, Editor } from "../../src";
	import MyTaskResourceTooltip from "../custom/MyTaskResourceTooltip.svelte";

	let { skinSettings } = $props();

	const data = getData();

	let api = $state();
</script>

<Tooltip {api} content={MyTaskResourceTooltip}>
	<div class="gantt">
		<Gantt
			bind:this={api}
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
			{resources}
			{assignments}
			zoom
		/>
	</div>
	<div class="resource">
		<ResourceLoad {api} />
	</div>
	<Editor {api} />
</Tooltip>

<style>
	.gantt {
		height: 60%;
		border-bottom: 2px solid var(--wx-gantt-border-color);
	}
	.resource {
		height: 40%;
	}
</style>
