<script>
	import { getData } from "../../demos/data";
	import { Gantt, getDefaultColumns } from "../../src";
	import { Willow } from "@svar-ui/svelte-core";

	const data = getData("calendars");

	// task 10 is assigned to r1 (weekends-only-resource); add a second
	// assignment to r2 (wednesday-off-resource) so its group spans two
	// resource calendars. Wednesday is a holiday for BOTH, which is where
	// the union of holidays must show both calendar css classes.
	const assignments = [
		...data.assignments.map(a => ({ ...a })),
		{ id: 7, task: 10, resource: "r2-wednesday-off-resource" },
	];

	const columns = getDefaultColumns({ resources: true });

	const groupBy = { field: "resource", multipleResources: true };
</script>

<Willow>
	<div class="demo">
		<Gantt
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
			resources={data.resources}
			calendars={data.calendars}
			{assignments}
			{columns}
			{groupBy}
		/>
	</div>
</Willow>

<style>
	.demo {
		height: 100%;
		width: 100%;
		position: relative;
		overflow: hidden;
	}

	.demo :global(.wednesday-off-resource) {
		background-color: lavender;
	}
	.demo :global(.weekends-only-resource) {
		background-color: #ffe7ea;
	}
	.demo :global(.part-time-resource) {
		background-color: lightyellow;
	}
</style>
