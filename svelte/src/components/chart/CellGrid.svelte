<script>
	import { getContext } from "svelte";
	import { grid } from "wx-gantt-store";

	const { borders = "" } = $props();

	const api = getContext("gantt-store");
	const { cellWidth, cellHeight } = api.getReactiveState();

	let node;
	let color = $state("#e4e4e4");
	$effect(() => {
		if (typeof getComputedStyle !== "undefined") {
			const border =
				getComputedStyle(node).getPropertyValue("--wx-gantt-border");
			color = border
				? border.substring(border.indexOf("#"))
				: "#1d1e261a";
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
></div>
