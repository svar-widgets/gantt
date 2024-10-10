<script>
	import { getData, simpleColumns } from "../data";
	import { Gantt } from "../../src/";

	export let skinSettings;

	const data = getData();
</script>

<Gantt
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
	columns={simpleColumns}
/>
