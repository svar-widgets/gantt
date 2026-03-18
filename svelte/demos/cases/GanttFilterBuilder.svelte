<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu } from "../../src/";
	import { FilterBuilder, getOptions, createFilter } from "@svar-ui/svelte-filter";

	let { skinSettings } = $props();

	const data = getData();
	const tasks = data.tasks;
	let api = $state();

	function init(ganttApi) {
		api = ganttApi;
	}
	const value = {
		glue: "or",
		rules: [
			{
				field: "text",
				filter: "contains",
				value: "plan",
			},
			{
				field: "duration",
				filter: "greater",
				value: 5,
			},
		],
	};

	let options = {
		text: getOptions(tasks, "text"),
		start: getOptions(tasks, "start"),
		end: getOptions(tasks, "end"),
		duration: getOptions(tasks, "duration"),
	};

	let fields = [
		{ id: "text", label: "Task name", type: "text" },
		{ id: "start", label: "Start date", type: "date" },
		{ id: "end", label: "End date", type: "date" },
		{ id: "duration", label: "Duration", type: "number" },
	];

	function applyFilter({ value }) {
		const filter = createFilter(value);
		api.exec("filter-tasks", { filter });
	}

	$effect(() => {
		if (api) applyFilter({ value });
	});
</script>

<div class="demo">
	<div class="bar">
		<FilterBuilder
			{value}
			{fields}
			{options}
			type={"line"}
			onchange={applyFilter}
		/>
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
		height: calc(100% - 56px);
		border-top: var(--wx-gantt-border);
	}
</style>
