<script>
	import { getData, simpleColumns } from "../data";
	import { Gantt } from "../../src/";

	let { skinSettings } = $props();

	const data = getData();
</script>

<Gantt
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
	columns={simpleColumns}
/>
