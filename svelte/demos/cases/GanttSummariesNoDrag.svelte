<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu } from "../../src/";

	let { skinSettings } = $props();

	const data = getData();
	let gApi = $state();

	function init(api) {
		api.intercept("drag-task", ({ id, top }) => {
			return !(
				typeof top === "undefined" && api.getTask(id).type == "summary"
			);
		});
		gApi = api;
	}
</script>

<div class="gt-cell">
	<ContextMenu api={gApi}>
		<Gantt
			{init}
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
		/>
	</ContextMenu>
</div>
