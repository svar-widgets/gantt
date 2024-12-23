<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";

	let { skinSettings } = $props();

	const data = getData();

	const columns = [
		{ id: "text", header: "Task name", flexgrow: 2 },
		{
			id: "start",
			header: "Start date",
			flexgrow: 1,
			align: "center",
		},
		{
			id: "duration",
			header: "Duration",
			align: "center",
			flexgrow: 1,
		},
		{
			id: "action",
			header: "",
			width: 50,
			align: "center",
		},
	];
</script>

<Gantt
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
	{columns}
/>
