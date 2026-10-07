<script>
	import { getData } from "../data";
	import { Gantt, Editor } from "../../src";
	import Toolbar from "../../src/components/Toolbar.svelte";
	import { Button } from "@svar-ui/svelte-core";

	let { skinSettings } = $props();

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

<div class="topbar">
	<Toolbar {api} />
	<Button
		type="primary"
		onclick={() =>
			api.exec("update-task", { id: 10, task: { start: null } })}
	>
		Unschedule task: 10
	</Button>
</div>
<div class="gtcell">
	<Gantt
		bind:this={api}
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
		unscheduledTasks
		{columns}
		undo
	/>
	<Editor {api} />
</div>

<style>
	.topbar {
		margin-bottom: 8px;
	}
	.gtcell {
		height: calc(100% - 90px);
		border-top: var(--wx-gantt-border);
	}
</style>
