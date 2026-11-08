<script lang="ts">
	import { getData } from "../data";
	import { Gantt, ContextMenu } from "@svar-ui/svelte-gantt";
	import { Button } from "@svar-ui/svelte-core";
	import type { IDemoProps } from "../types";
	import type { IApi, IColumnConfig } from "@svar-ui/svelte-gantt";
	import type { IHeaderCellConfig } from "@svar-ui/svelte-grid";

	let { skinSettings }: IDemoProps = $props();

	const data = getData();
	let api = $state<IApi>();
	let tasks = $state([...data.tasks]);

	function reload() {
		tasks = [...data.tasks];
		if (api!.serialize()!.length === data.tasks.length) tasks.pop();
	}
	function clear() {
		api!.exec("filter-tasks", {});
	}
	const textfilter: IHeaderCellConfig = {
		filter: { type: "text", config: { clear: true } },
	};
	const datefilter: IHeaderCellConfig = {
		filter: { type: "datepicker", config: { format: "%d-%m-%Y" } },
	};
	const numberfilter: IHeaderCellConfig = {
		filter: {
			type: "text",
			config: {
				clear: true,
				handler: (a: any, b: any) => !b || a === b * 1,
			},
		},
	};

	const columns: IColumnConfig[] = [
		{ id: "text", header: ["Task name", textfilter], flexgrow: 1 },
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
				gridWidth={600}
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
