<script lang="ts">
	import { getData } from "../data";
	import { Gantt } from "@svar-ui/svelte-gantt";
	import AvatarCell from "../custom/AvatarCell.svelte";
	import NameAndDateCell from "../custom/NameAndDateCell.svelte";
	import AddTaskCell from "../custom/AddTaskCell.svelte";
	import type { IDemoProps } from "../types";
	import type { IColumnConfig } from "@svar-ui/svelte-gantt";
	import type { IHeaderCellProps } from "@svar-ui/svelte-grid";
	import type { Component } from "svelte";

	let { skinSettings }: IDemoProps = $props();

	const columns: IColumnConfig[] = [
		{ id: "text", header: "Task", flexgrow: 1, cell: NameAndDateCell },
		{ id: "assigned", header: "Assigned", width: 160, cell: AvatarCell },
		{
			id: "add-task",
			header: { cell: AddTaskCell as Component<IHeaderCellProps> },
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
	gridWidth={460}
	cellHeight={40}
/>
