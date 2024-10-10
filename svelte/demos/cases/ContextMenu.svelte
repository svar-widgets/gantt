<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu } from "../../src/";

	export let skinSettings;
	let api;
	const data = getData();
</script>

<ContextMenu {api}>
	<Gantt
		bind:api
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
	/>
</ContextMenu>
