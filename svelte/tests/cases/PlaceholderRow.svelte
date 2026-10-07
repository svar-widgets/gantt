<script>
	import { Gantt, Editor, ContextMenu } from "../../src";
	import { resources } from "../../demos/data";
	import { Willow } from "@svar-ui/svelte-core";

	let api = $state();

	const scales = [
		{ unit: "month", step: 1, format: "%F %Y" },
		{ unit: "day", step: 1, format: "%j" },
	];

	const tasks = [
		{
			id: 1,
			text: "First",
			start: new Date(2024, 3, 2),
			duration: 2,
			type: "task",
			parent: 0,
		},
		{
			id: 2,
			text: "Second",
			start: new Date(2024, 3, 4),
			duration: 3,
			type: "task",
			parent: 0,
		},
	];

	const columns = [
		{
			id: "text",
			header: "Task name",
			width: 170,
			editor: "text",
		},
		{
			id: "start",
			header: "Start date",
			width: 120,
			align: "center",
			editor: "datepicker",
		},
		{
			id: "end",
			header: "End date",
			width: 120,
			align: "center",
			editor: "datepicker",
		},
		{
			id: "duration",
			header: "Duration",
			width: 80,
			align: "center",
			editor: "text",
		},
		{
			id: "resources",
			header: "Resources",
			width: 140,
			editor: "multiselect",
		},
		{ id: "add-task", header: "", width: 37, align: "center" },
	];
</script>

<Willow>
	<div class="demo">
		<ContextMenu {api}>
			<Gantt
				bind:this={api}
				{tasks}
				links={[]}
				{scales}
				start={new Date(2024, 3, 1)}
				end={new Date(2024, 3, 12)}
				{resources}
				assignments={[]}
				gridWidth={720}
				placeholderRow
				unscheduledTasks
				{columns}
			/>
		</ContextMenu>
		<Editor {api} />
	</div>
</Willow>

<style>
	.demo {
		height: 100%;
		width: 100%;
		position: relative;
		overflow: hidden;
	}
</style>
