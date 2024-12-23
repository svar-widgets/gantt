<script>
	import { Gantt, ContextMenu, Tooltip } from "wx-svelte-gantt";
	import { getData } from "../data/index";
	import TooltipContent from "./TooltipContent.svelte";

	const data = getData();
	let { api = $bindable() } = $props();

	const markers = [
		/*{
			start: new Date(2024, 3, 2),
			text: "Start",
		},
		{
			start: new Date(2024, 3, 14),
			text: "Today",
			css: "myMiddleClass",
		},
		{
			start: new Date(2024, 4, 25),
			text: "End",
			css: "myEndClass",
		},*/
	];

	function isDayOff(date) {
		const d = date.getDay();
		return d == 0 || d == 6;
	}
	function isHourOff(date) {
		const h = date.getHours();
		return h < 8 || h == 12 || h > 17;
	}
	function highlightTime(d, u) {
		if (u == "day" && isDayOff(d)) return "wx-weekend";
		if (u == "hour" && (isDayOff(d) || isHourOff(d))) return "wx-weekend";
		return "";
	}
</script>

<div class="box">
	<ContextMenu {api}>
		<Tooltip {api} content={TooltipContent}>
			<Gantt
				bind:this={api}
				{markers}
				{highlightTime}
				zoom
				scales={data.scales}
				tasks={data.tasks}
				links={data.links}
			/>
		</Tooltip>
	</ContextMenu>
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
