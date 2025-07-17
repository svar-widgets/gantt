<script>
	import { getData } from "../data";
	import { Gantt, defaultTaskTypes } from "../../src/";
	import Form from "../custom/Form.svelte";

	let { skinSettings } = $props();

	const data = getData();
	const taskTypes = defaultTaskTypes;

	let task = $state();
	let gApi = $state();

	function formAction({ action, data }) {
		switch (action) {
			case "close-form":
				task = null;
				break;
			default:
				gApi.exec(action, data);
				break;
		}
	}

	function init(api) {
		api.intercept("show-editor", ({ id }) => {
			if (id) task = api.getState().tasks.byId(id);
			return false;
		});
		gApi = api;
	}
</script>

<div class="wrapper">
	<Gantt
		{init}
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
	/>

	{#if task}
		<Form {task} {taskTypes} onaction={formAction} />
	{/if}
</div>

<style>
	.wrapper {
		height: 100%;
		overflow: hidden;
	}
</style>
