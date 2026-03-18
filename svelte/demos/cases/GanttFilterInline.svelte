<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu } from "../../src/";
	import { Button } from "@svar-ui/svelte-core";

	let { skinSettings } = $props();

	const data = getData();
	let api = $state();
	let tasks = $state([...data.tasks]);

	function reload() {
		tasks = [...data.tasks];
		tasks.pop();
	}
	function clear() {
		api.exec("filter-tasks", {});
	}
	const textfilter = { filter: { type: "text", config: { clear: true } } };
	const datefilter = {
		filter: { type: "datepicker", config: { format: "%d-%m-%Y" } },
	};
	const numberfilter = {
		filter: {
			type: "text",
			config: {
				clear: true,
				handler: (a, b) => !b || a === b * 1,
			},
		},
	};

	const columns = [
		{ id: "text", header: ["Task name", textfilter], width: 200 },
		{
			id: "start",
			header: ["Start date", datefilter],
			align: "center",
			width: 130,
		},
		{
			id: "end",
			header: ["End date", datefilter],
			align: "center",
			width: 130,
		},
		{
			id: "duration",
			header: ["Duration", numberfilter],
			width: 100,
			align: "center",
		},
		{ id: "add-task", header: "Add task", align: "center" },
	];
</script>

<div class="demo">
	<div class="bar">
		<Button type="primary" onclick={reload}>Reload</Button>
		<Button type="primary" onclick={clear}>Clear filters</Button>
	</div>
	<div class="gtcell">
		<ContextMenu {api}>
			<Gantt
				bind:this={api}
				{...skinSettings}
				{tasks}
				{columns}
				links={data.links}
				scales={data.scales}
				zoom
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
		height: calc(100% - 56px);
		border-top: var(--wx-gantt-border);
	}
</style>
