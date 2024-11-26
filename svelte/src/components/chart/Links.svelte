<script>
	import { getContext } from "svelte";
	let { width, height } = $props();

	const api = getContext("gantt-store");
	const links = api.getReactiveState()._links;
</script>

<svg class="wx-links" width="{width}px" height="{height}px">
	{#each $links as link (link.id)}
		<polyline class="wx-line" points={link.$p} />
	{/each}
</svg>

<style>
	.wx-links {
		position: absolute;
		top: 0;
		left: 0;
	}

	.wx-line {
		user-select: auto;
		pointer-events: stroke;
		position: relative;
		cursor: pointer;
		stroke: var(--wx-gantt-link-color);
		stroke-width: 2;
		z-index: 0;
		fill: transparent;
	}
</style>
