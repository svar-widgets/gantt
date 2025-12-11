<script>
	import { getData } from "../data";
	import { Gantt, Editor } from "../../src";
	let { skinSettings } = $props();

	const data = getData("day", { unscheduledTasks: true });

	let api = $state();
</script>

<Gantt
	bind:this={api}
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
	unscheduledTasks={true}
/>
<Editor {api} />
