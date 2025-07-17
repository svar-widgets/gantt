<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu, Editor } from "../../src/";

	let { skinSettings } = $props();
	let api = $state();
	const data = getData();
</script>

<ContextMenu {api}>
	<Gantt
		bind:this={api}
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
	/>
</ContextMenu>
<Editor {api} />
