<script>
	import { getRollupsData } from "../data";
	import { Gantt, Editor, ContextMenu } from "../../src";
	import { defaultColumns } from "@svar-ui/gantt-store";
	import SchedulingFlagCell from "../custom/SchedulingFlagCell.svelte";

	let { skinSettings } = $props();
	let api = $state();

	const data = getRollupsData();

	const schedulingColumns = [
		{
			id: "manual",
			header: "Manual",
			width: 90,
			align: "center",
			sort: true,
			cell: SchedulingFlagCell,
		},
		{
			id: "inactive",
			header: "Inactive",
			width: 90,
			align: "center",
			sort: true,
			cell: SchedulingFlagCell,
		},
	];

	const columns = [...defaultColumns];
	columns.splice(
		columns.findIndex(c => c.id === "add-task"),
		0,
		...schedulingColumns
	);
</script>

<div class="gantt">
	<Editor {api} />
	<ContextMenu {api}>
		<Gantt
			{...skinSettings}
			gridWidth={620}
			bind:this={api}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
			schedule={{ auto: true }}
			inactiveTasks
			{columns}
		/>
	</ContextMenu>
</div>

<style>
	.gantt {
		height: 100%;
		position: relative;
		overflow: hidden;
	}
</style>
