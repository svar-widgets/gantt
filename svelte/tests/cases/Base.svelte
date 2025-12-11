<script>
	import { getData } from "../../demos/data";
	import { Gantt } from "../../src";
	import { Willow } from "@wx/svelte-core";

	let { skinSettings } = $props();

	const data = getData();
</script>

<Willow>
	<Gantt
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
	/>
</Willow>
