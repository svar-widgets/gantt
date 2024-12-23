<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";

	let { skinSettings } = $props();

	const data = getData();

	const editorShape = [
		{
			key: "text",
			type: "text",
			label: "Name",
			config: {
				placeholder: "Add task name",
				focus: true,
			},
		},
		{
			key: "type",
			type: "select",
			label: "Type",
			options: [
				{ id: "task", label: "Task" },
				{ id: "summary", label: "Summary task" },
				{ id: "milestone", label: "Milestone" },
			],
		},
		{
			key: "start",
			type: "date",
			label: "Start date",
		},
		{
			key: "end",
			type: "date",
			label: "End date",
		},
		{
			key: "progress",
			type: "slider",
			label: "Progress",
		},
		{
			key: "links",
			type: "links",
		},
	];
</script>

<Gantt
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
	{editorShape}
/>
