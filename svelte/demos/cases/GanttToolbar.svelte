<script>
	import { getData } from "../data";
	import { Gantt, Toolbar } from "../../src/";

	export let skinSettings;

	const data = getData();

	let api;
</script>

<Toolbar {api} />
<div class="gtcell">
	<Gantt
		{...skinSettings}
		bind:api
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
	/>
</div>

<style>
	.gtcell {
		height: calc(100% - 50px);
		border-top: var(--wx-gantt-border);
	}
</style>
