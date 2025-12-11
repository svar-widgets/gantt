<script>
	import { getData } from "../../demos/data";
	import { Gantt } from "../../src";
	import { Willow } from "@svar-ui/svelte-core";

	let { skinSettings } = $props();

	const data = getData();

	data.links.push(
		...[
			{
				id: 12,
				source: 1,
				target: 2,
				type: "s2s",
			},
			{
				id: 13,
				source: 1,
				target: 10,
				type: "s2s",
			},
		]
	);
</script>

<Willow>
	<Gantt
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
	/>
</Willow>
