<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu } from "../../src/";

	let { skinSettings } = $props();
	let api = $state();
	const data = getData();

	// show menu for certain tasks
	function resolver(id) {
		return id > 2;
	}

	// filter menu options
	function filter(option, task) {
		const type = task.type;
		if (option.id) {
			const ids = option.id.toString().split(":");
			if (type == "milestone" && ids[0] == "add-task")
				return ids[1] != "child";
		}

		return true;
	}
</script>

<ContextMenu {api} {resolver} {filter}>
	<Gantt
		bind:this={api}
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
	/>
</ContextMenu>
