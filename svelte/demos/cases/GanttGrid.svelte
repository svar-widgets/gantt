<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";
	import AvatarCell from "../custom/AvatarCell.svelte";
	import NameAndDateCell from "../custom/NameAndDateCell.svelte";
	import AddTaskCell from "../custom/AddTaskCell.svelte";

	let { skinSettings } = $props();

	const columns = [
		{ id: "text", header: "Task", width: 220, cell: NameAndDateCell },
		{ id: "assigned", header: "Assigned", width: 160, cell: AvatarCell },
		{
			id: "add-task",
			header: { cell: AddTaskCell },
			align: "center",
			width: 80,
		},
	];

	const data = getData();
</script>

<Gantt
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
	{columns}
	cellHeight={40}
/>
