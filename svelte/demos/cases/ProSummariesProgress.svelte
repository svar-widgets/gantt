<script>
	import { getData } from "../data";
	import { Gantt, Editor, ContextMenu } from "../../src";

	let { skinSettings } = $props();

	const data = getData();

	let tasks = data.tasks;
	let gApi = $state();

	function init(api) {
		gApi = api;
	}
</script>

<div class="wrapper">
	<ContextMenu api={gApi}>
		<Gantt
			{...skinSettings}
			{init}
			{tasks}
			links={data.links}
			scales={data.scales}
			cellWidth={30}
			summary={{ autoProgress: true }}
		/>
	</ContextMenu>
	<Editor api={gApi} />
</div>
