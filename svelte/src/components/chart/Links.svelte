<script>
	import { getContext } from "svelte";
	import { clickOutside } from "@wx/lib-dom";
	let { onSelectLink, selectedLink, readonly } = $props();

	const api = getContext("gantt-store");

	const { _links: links, criticalPath } = api.getReactiveState();

	function onClickOutside(event) {
		const css = event?.target?.classList;
		if (!css?.contains("wx-line") && !css?.contains("wx-delete-button")) {
			onSelectLink(null);
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg class="wx-links">
	{#each $links as link (link.id)}
		<polyline
			class="wx-line"
			class:wx-critical={$criticalPath && link.$critical}
			points={link.$p}
			onclick={() => !readonly && onSelectLink(link.id)}
			class:wx-line-selectable={!readonly}
			data-link-id={link.id}
		/>
	{/each}
	{#if !readonly && selectedLink}
		<polyline
			class="wx-line wx-line-selected wx-line-selectable wx-delete-link"
			points={selectedLink.$p}
			use:clickOutside={onClickOutside}
		/>
	{/if}
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
		stroke: var(--wx-gantt-link-color);
		stroke-width: 2;
		z-index: 0;
		fill: transparent;
	}
	.wx-line-selectable:hover {
		stroke: var(--wx-gantt-link-color-hovered);
	}
	.wx-line-selectable.wx-critical:hover {
		stroke: var(--wx-gantt-link-critical-color-hovered);
	}
	.wx-line-selectable {
		cursor: pointer;
	}
	.wx-line.wx-line-selected {
		stroke: var(--wx-color-danger);
	}
	.wx-critical {
		stroke: var(--wx-gantt-link-critical-color);
	}
</style>
