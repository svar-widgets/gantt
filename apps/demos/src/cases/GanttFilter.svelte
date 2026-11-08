<script lang="ts">
	import { getData } from "../data";
	import { Gantt, ContextMenu } from "@svar-ui/svelte-gantt";
	import { Switch, Field, Text, Button } from "@svar-ui/svelte-core";
	import type { IDemoProps } from "../types";
	import type { IApi, ITask } from "@svar-ui/svelte-gantt";

	let { skinSettings }: IDemoProps = $props();

	const data = getData();
	let api = $state<IApi>();

	let open = $state(true);
	let text = $state("");
	let tasks = $state([...data.tasks]);

	function init(ganttApi: IApi) {
		api = ganttApi;
	}
	function filterTasks(ev: { value: string | number }) {
		let { value } = ev;
		value = (value as string).toLowerCase();
		const filter = value
			? (task: ITask) => {
					return (task.text || "").toLowerCase().indexOf(value) > -1;
				}
			: null;

		api!.exec("filter-tasks", { filter, open });
	}
	function reload() {
		tasks = [...data.tasks];
		if (api!.serialize()!.length === data.tasks.length) tasks.pop();
		text = "";
	}
</script>

<div class="demo">
	<div class="bar">
		<Field label="Filter by Task name">
			<Text
				clear
				icon={"wxi-search"}
				bind:value={text}
				onchange={filterTasks}
			/>
		</Field>
		<Field label="Open tasks while filtering">
			<Switch bind:value={open}></Switch>
		</Field>
		<div class="reload-btn">
			<Button type="primary" onclick={reload}>Reload</Button>
		</div>
	</div>

	<div class="gtcell">
		<ContextMenu {api}>
			<Gantt
				{init}
				{...skinSettings}
				{tasks}
				links={data.links}
				scales={data.scales}
			/>
		</ContextMenu>
	</div>
</div>

<style>
	.demo {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.bar {
		padding: 12px;
		gap: 20px;
		display: flex;
	}
	.gtcell {
		position: relative;
		height: calc(100% - 96px);
		border-top: var(--wx-gantt-border);
	}
	.reload-btn :global(button) {
		height: 32px;
	}
	.reload-btn {
		align-content: center;
	}
</style>
