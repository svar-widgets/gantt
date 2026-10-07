<script>
	import { getData } from "../data";
	import { Gantt, ResourceLoad, Tooltip, Editor } from "../../src";
	import MyResourceHistogramTooltip from "../custom/MyResourceHistogramTooltip.svelte";

	let { skinSettings } = $props();

	const data = getData("resource-histogram");
	let api = $state();
</script>

<Tooltip {api} content={MyResourceHistogramTooltip}>
	<div class="gantt">
		<Gantt
			bind:this={api}
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
			resources={data.resources}
			assignments={data.assignments}
			calendars={data.calendars}
			calendar="standard"
			zoom
		/>
	</div>
	<div class="resource">
		<ResourceLoad {api} mode="histogram" />
	</div>
</Tooltip>
<Editor {api} />

<style>
	.gantt {
		height: 60%;
		border-bottom: 2px solid var(--wx-gantt-border-color);
	}
	.resource {
		height: 40%;
	}
</style>
