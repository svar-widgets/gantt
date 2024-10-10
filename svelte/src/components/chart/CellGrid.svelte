<script>
	import { afterUpdate, getContext } from "svelte";
	import { grid } from "wx-gantt-store";

	export let borders = "";

	const api = getContext("gantt-store");
	const { cellWidth, cellHeight } = api.getReactiveState();

	let node;
	let color = "#e4e4e4";
	afterUpdate(() => {
		if (typeof getComputedStyle !== "undefined") {
			const border =
				getComputedStyle(node).getPropertyValue("--wx-gantt-border");
			color = border.substring(border.indexOf("#"));
		}
	});
</script>

<div
	bind:this={node}
	style="width:100%; height:100%; background:url({grid(
		$cellWidth,
		$cellHeight,
		color,
		borders
	)}); position: absolute;"
/>
