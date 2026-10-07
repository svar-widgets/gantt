<script>
	import { getData } from "../../demos/data";
	import { Gantt, Editor } from "../../src";
	import { Willow } from "@svar-ui/svelte-core";

	const data = getData("day", { unscheduledTasks: true });

	let api = $state();

	const columns = [
		{
			id: "text",
			header: "Task name",
			width: 170,
			sort: true,
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
			width: 80,
			sort: true,
			align: "center",
			editor: "text",
		},
		{
			id: "unscheduled",
			header: "",
			width: 40,
			align: "center",
			template: v => (v ? "yes" : "no"),
		},
		{ id: "add-task", header: "Add task", width: 37, align: "center" },
	];
</script>

<Willow>
	<div class="demo">
		<Gantt
			bind:this={api}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
			unscheduledTasks
			{columns}
		/>
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
