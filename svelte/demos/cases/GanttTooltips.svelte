<script>
	import { getData } from "../data";
	import { Gantt, Tooltip } from "../../src/";
	import MyTooltipContent from "../custom/MyTooltipContent.svelte";

	let { skinSettings } = $props();

	const data = getData();
	let api = $state();
</script>

<Tooltip {api} content={MyTooltipContent}>
	<Gantt
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
		bind:this={api}
	/>
</Tooltip>
