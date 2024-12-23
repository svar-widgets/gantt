<script>
	import { getData } from "../data";
	import { Gantt, Toolbar } from "../../src/";

	let { skinSettings } = $props();

	const data = getData();

	let api = $state();
</script>

<Toolbar {api} />
<div class="gtcell">
	<Gantt
		{...skinSettings}
		bind:this={api}
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
