<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu, Editor } from "../../src";

	let { skinSettings } = $props();

	const data = getData();
	let gApi = $state();

	function init(api) {
		gApi = api;
	}
</script>

<ContextMenu api={gApi}>
	<Gantt
		{init}
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
		summary={{ autoConvert: true }}
	/>
</ContextMenu>
<Editor api={gApi} />
