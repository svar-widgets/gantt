<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";
	import MyTaskContent from "../custom/MyTaskContent.svelte";

	export let skinSettings;

	const data = getData();
	let api;

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
	bind:api
	on:custom-click={doClick}
	taskTemplate={MyTaskContent}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
/>
