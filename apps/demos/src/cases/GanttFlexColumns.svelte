<script lang="ts">
	import { getData } from "../data";
	import { Gantt } from "@svar-ui/svelte-gantt";
	import type { IDemoProps } from "../types";
	import type { IColumnConfig } from "@svar-ui/svelte-gantt";

	let { skinSettings }: IDemoProps = $props();

	const data = getData();

	const columns: IColumnConfig[] = [
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
			id: "add-task",
			header: "Add task",
			width: 37,
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
