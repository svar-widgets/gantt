<script>
	import { getData } from "../data";
	import { Gantt, Tooltip } from "../../src/";
	import MyTooltipContent from "../custom/MyTooltipContent.svelte";

	export let skinSettings;

	const data = getData();
	let api;
</script>

<Tooltip {api} content={MyTooltipContent}>
	<Gantt
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
		bind:api
	/>
</Tooltip>
