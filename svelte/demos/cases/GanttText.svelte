<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";
	import MyTaskContent from "../custom/MyTaskContent.svelte";

	let { skinSettings } = $props();

	const data = getData();
	let api = $state();

	function doClick(ev) {
		api.exec("update-task", {
			id: ev.id,
			task: {
				clicked: ev.clicked,
			},
		});
	}
</script>

<Gantt
	{...skinSettings}
	bind:this={api}
	oncustomclick={doClick}
	taskTemplate={MyTaskContent}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
/>
