<script>
	import { getData } from "../data";
	import { Gantt, Toolbar, defaultToolbarButtons } from "../../src/";

	let { skinSettings } = $props();
	let api = $state();

	const data = getData();

	//remove indentation buttons
	const items = defaultToolbarButtons.filter(b => {
		return b.id?.indexOf("indent") === -1;
	});
</script>

<Toolbar {api} {items} />
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
