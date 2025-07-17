<script>
	import { getTypedData, taskTypes } from "../data";
	import { Gantt, Editor } from "../../src/";

	let { skinSettings } = $props();

	const data = getTypedData();

	let api = $state();
</script>

<div class="demo">
	<Gantt
		bind:this={api}
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
		{taskTypes}
	/>
	<Editor {api} />
</div>

<style>
	.demo {
		overflow: hidden;
		height: 100%;
	}
	.demo > :global(.wx-gantt .wx-bar.wx-task.narrow) {
		background-color: #676a81;
		color: transparent;
		height: 10px !important;
		margin-top: 10px;
		border: 1px solid #63667a;
	}
	.demo > :global(.wx-gantt .wx-bar.wx-task.narrow .wx-progress-percent) {
		background-color: #1a2630;
	}
	.demo > :global(.wx-gantt .wx-bar.wx-task.narrow .wx-link) {
		background-color: #384047;
		border-radius: 0px;
	}
	.demo > :global(.wx-gantt .wx-bar.wx-task.narrow .wx-link .wx-inner) {
		border-radius: 0px;
	}

	.demo > :global(.wx-gantt .wx-bar.wx-task.round) {
		background-color: #ffeb3b;
		border: 1px solid #ffeb3b;
		color: #384047;
		border-radius: 50px;
	}
	.demo > :global(.wx-gantt .wx-bar.wx-task.round .wx-progress-percent) {
		background-color: #ffc107;
	}
	.demo > :global(.wx-gantt .wx-bar.wx-task.round .wx-progress-wrapper) {
		border-radius: 50px;
	}

	.demo > :global(.wx-gantt .wx-bar.wx-task.progress) {
		background-color: transparent;
		color: var(--wx-color-font);
		border-radius: 50px;
		border: 1px solid #00bcd4;
	}
	.demo > :global(.wx-gantt .wx-bar.wx-task.progress .wx-progress-percent) {
		background-color: #00bcd4;
	}
	.demo > :global(.wx-gantt .wx-bar.wx-task.progress .wx-progress-wrapper) {
		border-radius: 50px;
	}

	.demo > :global(.wx-gantt .wx-bar.wx-task.urgent) {
		background-color: #f49a82;
		border: 1px solid #f45e36;
	}
	.demo > :global(.wx-gantt .wx-bar.wx-task.urgent .wx-progress-percent) {
		background-color: #f45e36;
	}
</style>
