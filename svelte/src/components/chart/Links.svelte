<script>
	import { getContext } from "svelte";

	const api = getContext("gantt-store");
	const { _links: links, selectedLink, _selectedLink } = api.getReactiveState();

	// 调试信息
	// $: console.log("Links.svelte - selectedLink:", $selectedLink, "_selectedLink:", $_selectedLink);

	function handleLinkClick(event, linkId) {
		event.stopPropagation();
		console.log("Clicking link:", linkId);
		api.exec("select-link", { id: linkId });
	}

	function handleDeleteClick(event, linkId) {
		event.stopPropagation();
		api.exec("delete-link", { id: linkId });
	}
</script>

<svg class="wx-links">
	{#each $links as link (link.id)}
		<g class="wx-link-group" class:wx-selected={$selectedLink === link.id}>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<polyline 
				class="wx-line" 
				points={link.$p}
				onclick={(e) => handleLinkClick(e, link.id)}
				role="button"
				tabindex="0"
			/>
			{#if $selectedLink === link.id}
				{@const coords = link.$p.split(',').map(Number)}
				{@const midIndex = Math.floor(coords.length / 4)}
				{@const midX = coords[midIndex * 2] || coords[0]}
				{@const midY = coords[midIndex * 2 + 1] || coords[1]}
				{@const shouldShow = $selectedLink === link.id}
				{@const debugInfo = `Link: ${link.id}, Selected: ${$selectedLink}, Should show: ${shouldShow}, Coords: ${midX},${midY}`}
				<!-- {console.log(debugInfo)} -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<g class="wx-delete-button" transform="translate({midX}, {midY})" onclick={(e) => handleDeleteClick(e, link.id)} role="button" tabindex="0">
					<circle cx="0" cy="0" r="10" fill="#ff4444" stroke="white" stroke-width="2" />
					<text x="0" y="4" text-anchor="middle" fill="white" font-size="12" font-weight="bold">×</text>
				</g>
			{/if}
		</g>
	{/each}
</svg>

<style>
	.wx-links {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 10;
		pointer-events: none;
	}

	.wx-link-group {
		cursor: pointer;
		pointer-events: auto;
	}

	.wx-line {
		user-select: auto;
		pointer-events: stroke;
		position: relative;
		cursor: pointer;
		outline: none;
		stroke: var(--wx-gantt-link-color);
		stroke-width: 2;
		z-index: 0;
		fill: transparent;
	}

	.wx-link-group.wx-selected .wx-line {
		stroke: var(--wx-color-primary);
		stroke-width: 3;
	}

	.wx-delete-button {
		cursor: pointer;
		pointer-events: auto;
		z-index: 20;
		outline: none;
	}

	.wx-delete-button:hover circle {
		fill: #cc0000;
		transform: scale(1.1);
		transition: all 0.2s ease;
	}
</style>
