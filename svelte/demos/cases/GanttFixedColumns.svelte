<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";

	let { skinSettings } = $props();

	const data = getData();

	const columns = [
		{ id: "text", header: "Task name", width: 120 },
		{
			id: "start",
			header: "Start date",
			width: 120,
			align: "center",
		},
		{
			id: "duration",
			header: "Duration",
			width: 90,
			align: "center",
		},
		{ id: "action", header: "", width: 50, align: "center" },
	];
</script>

<Gantt
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
	{columns}
/>
