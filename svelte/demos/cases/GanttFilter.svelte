<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu } from "../../src/";
	import { Switch, Field, Text, Button } from "@svar-ui/svelte-core";

	let { skinSettings } = $props();

	const data = getData();
	let api = $state();

	let open = $state(true);
	let text = $state("");
	let tasks = $state([...data.tasks]);

	function init(ganttApi) {
		api = ganttApi;
	}
	function filterTasks(ev) {
		let { value } = ev;
		value = value.toLowerCase();
		const filter = value
			? task => {
					return (task.text || "").toLowerCase().indexOf(value) > -1;
				}
			: null;

		api.exec("filter-tasks", { filter, open });
	}
	function reload() {
		tasks = [...data.tasks];
		text = "";
	}
</script>

<div class="demo">
	<div class="bar">
		<Field label="Filter by Task name" class="field">
			{#snippet children({ id })}
				<Text
					{id}
					clear
					icon={"wxi-search"}
					bind:value={text}
					onchange={filterTasks}
				/>
			{/snippet}
		</Field>
		<Field label="Open tasks while filtering" class="field">
			{#snippet children({ id })}
				<Switch {id} bind:value={open}></Switch>
			{/snippet}
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
