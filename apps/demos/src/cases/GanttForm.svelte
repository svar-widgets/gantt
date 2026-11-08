<script lang="ts">
	import { getData } from "../data";
	import { Gantt, defaultTaskTypes } from "@svar-ui/svelte-gantt";
	import Form from "../custom/Form.svelte";
	import type { IDemoProps } from "../types";
	import type { IApi, ITask } from "@svar-ui/svelte-gantt";

	let { skinSettings }: IDemoProps = $props();

	const data = getData();
	const taskTypes = defaultTaskTypes;

	let task = $state<ITask | null>();
	let gApi = $state<IApi>();

	function formAction({
		action,
		data,
	}: {
		action: string;
		data?: { [key: string]: any };
	}) {
		switch (action) {
			case "close-form":
				task = null;
				break;
			default:
				gApi!.exec(action, data);
				break;
		}
	}

	function init(api: IApi) {
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
