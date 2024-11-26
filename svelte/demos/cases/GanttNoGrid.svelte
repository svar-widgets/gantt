<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";

	let { skinSettings } = $props();

	const data = getData();
</script>

<Gantt
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
	columns={false}
	cellWidth={60}
/>
