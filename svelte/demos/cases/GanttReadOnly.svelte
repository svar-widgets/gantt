<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";

	export let skinSettings;

	const data = getData();
</script>

<Gantt
	readonly={true}
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
/>
