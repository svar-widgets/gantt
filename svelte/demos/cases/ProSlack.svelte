<script>
	import { getData } from "../data";
	import { Gantt, Editor } from "../../src";
	import { format } from "date-fns";

	let { skinSettings } = $props();

	const { tasks, links, scales } = getData("critical");

	let api = $state();

	const columns = [
		{
			id: "text",
			header: "Task name",
			width: 150,
		},
		{
			id: "earliestStart",
			header: "Earliest start",
			align: "center",
			width: 120,
			getter: t => t.slack.earliestStart,
			template: v => (v ? format(v, "dd-MM-yy") : "-"),
		},
		{
			id: "latestStart",
			header: "Latest start",
			align: "center",
			width: 120,
			getter: t => t.slack.latestStart,
			template: v => (v ? format(v, "dd-MM-yy") : "-"),
		},
		{
			id: "freeSlack",
			header: "Free slack",
			align: "center",
			width: 100,
			getter: t => t.slack.freeSlack,
			template: v => v ?? "-",
		},
		{
			id: "totalSlack",
			header: "Total slack",
			align: "center",
			width: 100,
			getter: t => t.slack.totalSlack,
		},
	];
</script>

<div class="demo">
	<Gantt
		{...skinSettings}
		bind:this={api}
		{tasks}
		{links}
		{scales}
		{columns}
		slack
	/>
</div>
<Editor {api} />

<style>
	.demo {
		height: 100%;
		display: flex;
		flex-direction: column;
	}
</style>
