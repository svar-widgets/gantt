<script>
	import { run } from "svelte/legacy";

	import { getData } from "../data";
	import { Gantt, ContextMenu } from "../../src/";

	let { skinSettings } = $props();

	const data = getData();
	let api = $state();

	run(() => {
		if (api) {
			api.intercept("drag-task", ({ id, top }) => {
				return !(
					typeof top === "undefined" &&
					api.getTask(id).type == "summary"
				);
			});
		}
	});
</script>

<div class="gt-cell">
	<ContextMenu {api}>
		<Gantt
			bind:this={api}
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
		/>
	</ContextMenu>
</div>
