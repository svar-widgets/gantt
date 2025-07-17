<script>
	import { getContext } from "svelte";

	const api = getContext("gantt-store");
	const links = api.getReactiveState()._links;
</script>

<svg class="wx-links">
	{#each $links as link (link.id)}
		<polyline class="wx-line" points={link.$p} />
	{/each}
</svg>

<style>
	.wx-links {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
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
