<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";
	import AvatarCell from "../custom/AvatarCell.svelte";

	let { skinSettings } = $props();

	const columns = [
		{ id: "text", header: "Task name", width: 220 },
		{ id: "assigned", header: "Assigned", width: 160, cell: AvatarCell },
		{ id: "start", header: "Start Date", width: 100 },
	];

	const data = getData();
</script>

<Gantt
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
	{columns}
/>
