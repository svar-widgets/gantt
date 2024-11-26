<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";
	import MyTaskContent from "../custom/MyTaskContent.svelte";

	let { skinSettings } = $props();

	const data = getData();
	let api = $state();

	function doClick(ev) {
		const data = ev.detail;
		api.exec("update-task", {
			id: data.id,
			task: {
				clicked: data.clicked,
			},
		});
	}
</script>

<Gantt
	{...skinSettings}
	bind:this={api}
	on:custom-click={doClick}
	taskTemplate={MyTaskContent}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
/>
