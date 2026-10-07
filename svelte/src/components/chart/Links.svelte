<script>
	import { getContext } from "svelte";
	import { clickOutside, setID } from "@svar-ui/lib-dom";
	let { onSelectLink, selectedLink, readonly } = $props();

	const api = getContext("gantt-store");

	const {
		_visibleLinks: links,
		criticalPath,
		_conflicts,
	} = api.getReactiveState();

	let violated = $derived($_conflicts?.links);

	function onClickOutside(event) {
		const css = event?.target?.classList;
		if (
			!css?.contains("wx-line-hitbox") &&
			!css?.contains("wx-delete-button")
		) {
			onSelectLink(null);
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg class="wx-links">
	{#each $links as link (link.id)}
		<g
			class="wx-line"
			class:wx-critical={$criticalPath && link.critical}
			class:wx-violated={violated?.has(link.id)}
			class:wx-line-selectable={!readonly}
			onclick={() => !readonly && onSelectLink(link.id)}
			data-link-id={setID(link.id)}
		>
			<polyline class="wx-line-draw" points={link.$p} />
			<polyline class="wx-line-hitbox" points={link.$p} />
		</g>
	{/each}
	{#if !readonly && selectedLink}
		<g
			use:clickOutside={onClickOutside}
			class="wx-line wx-line-selected wx-line-selectable wx-delete-link"
			class:wx-violated={violated?.has(selectedLink.id)}
			data-link-id={setID(selectedLink.id)}
		>
			<polyline class="wx-line-draw" points={selectedLink.$p} />
			<polyline class="wx-line-hitbox" points={selectedLink.$p} />
		</g>
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
		pointer-events: none;
	}

	.wx-line > .wx-line-draw {
		pointer-events: none;
		stroke: var(--wx-gantt-link-color);
		stroke-width: 2;
		fill: transparent;
	}

	.wx-line > .wx-line-hitbox {
		pointer-events: stroke;
		stroke: transparent;
		stroke-width: 20;
		fill: transparent;
	}

	.wx-line-selectable:hover > .wx-line-draw {
		stroke: var(--wx-gantt-link-color-hovered);
	}

	.wx-line-selectable.wx-critical:hover > .wx-line-draw {
		stroke: var(--wx-gantt-link-critical-color-hovered);
	}

	.wx-line-selectable.wx-violated:hover > .wx-line-draw {
		stroke: var(--wx-gantt-link-violation-color);
		opacity: 0.85;
	}

	.wx-line-selectable {
		cursor: pointer;
	}

	.wx-line.wx-line-selected > .wx-line-draw {
		stroke: var(--wx-color-danger);
	}

	.wx-critical > .wx-line-draw {
		stroke: var(--wx-gantt-link-critical-color);
	}

	.wx-violated > .wx-line-draw {
		stroke: var(--wx-gantt-link-violation-color);
		stroke-dasharray: 5 5;
	}

	.wx-line.wx-line-selected.wx-violated > .wx-line-draw {
		stroke: var(--wx-color-danger);
		stroke-dasharray: none;
	}
</style>
