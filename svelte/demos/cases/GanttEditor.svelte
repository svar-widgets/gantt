<script>
	import { getData } from "../data";
	import { Gantt, Editor } from "../../src/";

	let { skinSettings } = $props();

	const data = getData();
	let api = $state();

	function init(ganttApi) {
		api = ganttApi;
		// show Editor on "add-task" action
		api.on("add-task", ({ id }) => {
			api.exec("show-editor", { id });
		});
	}
</script>

<Gantt
	{init}
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
/>
<Editor {api} />
