<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu, Editor, getDefaultColumns } from "../../src";

	const data = getData();

	let { skinSettings } = $props();
	let api = $state();

	const columns = getDefaultColumns({ wbs: true });
</script>

<div class="gtcell">
	<ContextMenu {api}>
		<Gantt
			bind:this={api}
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
			{columns}
			gridWidth={550}
			zoom
			wbs
		/>
	</ContextMenu>
	<Editor {api} />
</div>

<style>
	.gtcell {
		position: relative;
		overflow: hidden;
		height: 100%;
	}
</style>
