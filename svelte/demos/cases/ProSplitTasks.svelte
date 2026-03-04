<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu, Editor, Toolbar, Tooltip } from "../../src/";
	import MyTooltipContent from "../custom/MySegmentTooltip.svelte";

	let { skinSettings } = $props();
	let api = $state();
	const data = getData("day", { splitTasks: true });
</script>

<Toolbar {api} />
<div class="gtcell">
	<ContextMenu {api}>
		<Tooltip {api} content={MyTooltipContent}>
			<Gantt
				bind:this={api}
				{...skinSettings}
				tasks={data.tasks}
				links={data.links}
				scales={data.scales}
				splitTasks={true}
			/>
		</Tooltip>
	</ContextMenu>
	<Editor {api} />
</div>

<style>
	.gtcell {
		height: calc(100% - 50px);
		border-top: var(--wx-gantt-border);
	}
</style>
