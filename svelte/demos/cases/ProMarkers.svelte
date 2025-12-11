<script>
	import { getData } from "../data";
	import { Gantt } from "../../src";

	let { skinSettings } = $props();

	const data = getData();
	const markers = [
		{
			start: new Date(2026, 3, 2),
			text: "Start Project",
		},
		{
			start: new Date(2026, 3, 8),
			text: "Approval of strategy",
			css: "myMiddleClass",
		},
		{
			start: new Date(2026, 4, 3),
			text: "End Project",
			css: "myEndClass",
		},
	];
</script>

<div class="gt-cell">
	<Gantt
		{...skinSettings}
		{markers}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
	/>
</div>

<style>
	.gt-cell {
		width: 100%;
		height: 100%;
	}
	.gt-cell > :global(.wx-gantt .myMiddleClass) {
		background-color: rgba(255, 84, 84, 0.77);
	}
	.gt-cell > :global(.wx-gantt .myEndClass) {
		background-color: rgba(54, 206, 124, 0.77);
	}
</style>
