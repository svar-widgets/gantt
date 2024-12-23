<script>
	import { getData, complexScales } from "../data";
	import { Gantt } from "../../src/";

	let { skinSettings } = $props();

	const data = getData();
</script>

<Gantt
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={complexScales}
	start={new Date(2024, 3, 1)}
	end={new Date(2024, 4, 12)}
	cellWidth={60}
/>
