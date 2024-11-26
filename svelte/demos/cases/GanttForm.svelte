<script>
	import { run } from "svelte/legacy";

	import { getData } from "../data";
	import { Gantt } from "../../src/";
	import Form from "../custom/Form.svelte";

	let { skinSettings } = $props();

	const data = getData();
	const taskTypes = [
		{ id: "task", label: "Task" },
		{ id: "milestone", label: "Milestone" },
		{ id: "summary", label: "Summary task" },
	];

	let task = $state();
	let api = $state();
	let tasks = $state();

	run(() => {
		if (api) {
			tasks = api.getState().tasks;

			api.intercept("show-editor", data => {
				task = tasks.byId(data.id);
				return false;
			});
		}
	});

	function formAction(ev) {
		const { action, data } = ev.detail;

		switch (action) {
			case "close-form":
				task = null;
				break;

			default:
				api.exec(action, data);
				break;
		}
	}
</script>

<div class="wrapper">
	<Gantt
		bind:this={api}
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
	/>

	{#if task}
		<Form {task} {taskTypes} on:action={formAction} />
	{/if}
</div>

<style>
	.wrapper {
		height: 100%;
		overflow: hidden;
	}
</style>
