<script>
	import { Gantt } from "../../src/";
	import { getData } from "../../demos/data";
	import { Willow } from "@wx/svelte-core";

	let { skinSettings } = $props();

	const data = getData("critical");

	let pathMode = $state("flexible");
	let projectStart = $state(new Date(2026, 3, 2));
	let projectEnd = $state(new Date(2026, 3, 12));
</script>

<div class="demo">
	<Willow>
		<Gantt
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
			criticalPath={{ type: pathMode }}
			{projectStart}
			{projectEnd}
		/>
	</Willow>
</div>

<style>
	.demo {
		height: 100%;
		display: flex;
		flex-direction: column;
	}
</style>
