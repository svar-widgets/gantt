<script>
	import { Gantt, ContextMenu, Tooltip, Editor } from "@svar-ui/svelte-gantt";
	import { Calendar } from "@svar-ui/gantt-store";
	import { getData } from "../data/index";
	import TooltipContent from "./TooltipContent.svelte";

	const data = getData();
	let { api = $bindable() } = $props();

	const markers = [
		{
			start: new Date(2026, 3, 1),
			text: "Start",
		},
		{
			start: new Date(2026, 3, 9),
			text: "Getting approval",
			css: "myMiddleClass",
		},
		{
			start: new Date(2026, 4, 25),
			text: "End",
			css: "myEndClass",
		},
	];
</script>

<div class="box">
	<ContextMenu {api}>
		<Tooltip {api} content={TooltipContent}>
			<Gantt
				bind:this={api}
				calendar={new Calendar()}
				schedule={{ auto: true }}
				criticalPath={{ type: "flexible" }}
				summary={{ autoProgress: true }}
				{markers}
				splitTasks
				zoom
				cellWidth={80}
				scales={data.scales}
				tasks={data.tasks}
				links={data.links}
			/>
		</Tooltip>
	</ContextMenu>
	<Editor {api} />
</div>

<style>
	.box {
		width: 100%;
		height: 100%;
		border: var(--wx-gantt-border);
	}

	:global(.wx-willow-theme .myMiddleClass),
	:global(.wx-willow-dark-theme .myMiddleClass) {
		background-color: rgba(255, 84, 84, 0.77);
	}
	:global(.wx-willow-theme .myEndClass),
	:global(.wx-willow-dark-theme .myEndClass) {
		background-color: rgba(54, 206, 124, 0.77);
	}
</style>
