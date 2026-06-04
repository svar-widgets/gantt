<script>
	import { getData, resources, assignments } from "../../demos/data";
	import { Gantt, ResourceLoad, getResourceColumns } from "../../src";
	import { Willow } from "@svar-ui/svelte-core";

	const data = getData();

	let api = $state();

	const baseResourceColumns = getResourceColumns();

	const resourceLoadColumns = [
		...baseResourceColumns.slice(0, 1),
		{
			id: "role",
			header: "Role",
			align: "center",
			flexgrow: 1,
			resize: true,
		},
		{
			id: "overloaded",
			header: "Overloaded",
			width: 100,
			align: "center",
			getter: row => row.$overloaded,
			template: v => (v ? "yes" : "no"),
			resize: true,
		},
		...baseResourceColumns.slice(-1),
	];
	resourceLoadColumns.forEach(c => (c.sort = true));
</script>

<Willow>
	<div class="gantt">
		<Gantt
			bind:this={api}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
			{resources}
			{assignments}
			start={new Date(2026, 3, 5)}
			end={new Date(2026, 4, 1)}
			autoScale={false}
		/>
	</div>
	<div class="resource">
		<ResourceLoad
			{api}
			columns={resourceLoadColumns}
			template={v => `${v.hours}h (${v.percent}%)`}
		/>
	</div>
</Willow>

<style>
	.gantt {
		height: 60%;
		border-bottom: 2px solid var(--wx-gantt-border-color);
	}
	.resource {
		height: 40%;
	}
</style>
