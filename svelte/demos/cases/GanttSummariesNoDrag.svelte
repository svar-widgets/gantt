<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu } from "../../src/";

	export let skinSettings;

	const data = getData();
	let api;

	$: if (api) {
		api.intercept("drag-task", ({ id, top }) => {
			return !(
				typeof top === "undefined" && api.getTask(id).type == "summary"
			);
		});
	}
</script>

<div class="gt-cell">
	<ContextMenu {api}>
		<Gantt
			bind:api
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
		/>
	</ContextMenu>
</div>
