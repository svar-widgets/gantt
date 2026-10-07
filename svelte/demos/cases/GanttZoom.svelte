<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";

	let { skinSettings } = $props();

	const data = getData();

	function init(api) {
		api.on("zoom-scale", () => {
			console.log("The current zoom level is", api.getState().zoom);
		});
	}
</script>

<div class="demo">
	<div class="hint">
		Point over Gantt chart, then hold Ctrl and use mouse wheel to zoom
	</div>
	<div class="gtcell">
		<Gantt
			{init}
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			cellWidth={100}
			zoom
		/>
	</div>
</div>

<style>
	.demo {
		display: flex;
		flex-direction: column;
		height: 100%;
	}
	.hint {
		flex-shrink: 0;
		padding: 8px 12px;
		color: var(--wx-color-font-alt);
		border-bottom: var(--wx-gantt-border);
	}
	.gtcell {
		flex: 1;
		min-height: 0;
	}
</style>
