<script>
	import { getContext } from "svelte";
	import { getData } from "../data";
	import { Gantt } from "../../src/";

	const helpers = getContext("wx-helpers");
	let { skinSettings } = $props();

	const data = getData();
	let api = $state();

	function init(ganttApi) {
		api = ganttApi;
		
		// Listen for the save-taskeditor event
		api.on("save-taskeditor", (event) => {
			helpers.showNotice({ 
				text: `Task saved! ID: ${event.id}`,
				type: "success"
			});
			console.log("save-taskeditor event:", event);
		});
	}
</script>

<Gantt
	{...skinSettings}
	{init}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
/>