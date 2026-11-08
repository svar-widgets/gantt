<script lang="ts">
	import { getData } from "../data";
	import { Gantt } from "@svar-ui/svelte-gantt";
	import type { IDemoProps } from "../types";
	import type { IColumnConfig } from "@svar-ui/svelte-gantt";

	let { skinSettings }: IDemoProps = $props();

	const data = getData();

	const columns: IColumnConfig[] = [
		{
			id: "text",
			header: "Task name",
			width: 170,
			sort: true,
			editor: "text",
		},
		{
			id: "start",
			header: "Start date",
			width: 120,
			align: "center",
			sort: true,
			editor: "datepicker",
		},
		{
			id: "duration",
			header: "Duration",
			width: 100,
			sort: true,
			align: "center",
			editor: "text",
		},
		{ id: "add-task", header: "Add task", width: 37, align: "center" },
	];
</script>

<Gantt
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
	{columns}
/>
