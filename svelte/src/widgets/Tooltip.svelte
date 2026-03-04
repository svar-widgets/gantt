<script>
	import { locateID } from "@svar-ui/lib-dom";
	const { api, content: Content, children } = $props();
	import { getID } from "@svar-ui/lib-dom";

	let area,
		areaCoords = $state({});
	let contentProps = $state({});
	let tooltipNode = $state(null);
	let pos = $state({});

	function findAttribute(node) {
		const trg = node;
		while (node) {
			if (node.getAttribute) {
				const id = getID(node, "data-tooltip-id");
				const at = getID(node, "data-tooltip-at");
				const tooltip = node.getAttribute("data-tooltip");
				if (id || tooltip) {
					const segment = locateID(trg, "data-segment");
					return { id, tooltip, target: node, at, segment };
				}
			}
			node = node.parentNode;
		}

		return {
			id: null,
			tooltip: null,
			target: null,
			at: null,
			segment: null,
		};
	}

	$effect(() => {
		if (tooltipNode) {
			const tooltipCoords = tooltipNode.getBoundingClientRect();
			if (tooltipCoords.right >= areaCoords.right) {
				pos.left = areaCoords.width - tooltipCoords.width - 5;
			}
			if (tooltipCoords.bottom >= areaCoords.bottom) {
				pos.top -= tooltipCoords.bottom - areaCoords.bottom + 2;
			}
		}
	});

	let timer;
	const TIMEOUT = 300;
	const debounce = code => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			code();
		}, TIMEOUT);
	};

	function move(e) {
		let { id, tooltip, target, at, segment } = findAttribute(e.target);
		pos = null;
		contentProps = {};

		if (!tooltip) {
			if (!id) {
				clearTimeout(timer);
				return;
			} else {
				tooltip = getTaskText(id, segment);
			}
		}

		debounce(() => {
			if (id) {
				contentProps = { data: getTaskObj(id) };
				if (segment != null) contentProps.segmentIndex = segment;
			}

			const targetCoords = target.getBoundingClientRect();
			areaCoords = area.getBoundingClientRect();

			let top, left;
			if (at === "left") {
				top = targetCoords.top + 5 - areaCoords.top;
				left = targetCoords.right + 5 - areaCoords.left;
			} else {
				top = targetCoords.top + targetCoords.height - areaCoords.top;
				left = e.clientX - areaCoords.left;
			}

			pos = { top, left, text: tooltip };
		});
	}

	function getTaskObj(id) {
		return api?.getTask(id) || null;
	}

	function getTaskText(id, segment) {
		const task = getTaskObj(id);
		if (segment !== null && task?.segments)
			return task.segments[segment]?.text || "";
		return task?.text || "";
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="wx-tooltip-area" bind:this={area} onmousemove={move}>
	{#if pos && (pos.text || Content)}
		<div
			class="wx-gantt-tooltip"
			bind:this={tooltipNode}
			style="top:{pos.top}px;left:{pos.left}px"
		>
			{#if Content}
				<Content {...contentProps} />
			{:else if pos.text}
				<div class="wx-gantt-tooltip-text">{pos.text}</div>
			{/if}
		</div>
	{/if}

	{@render children()}
</div>

<style>
	.wx-tooltip-area {
		position: relative;
		height: 100%;
		width: 100%;
	}

	:global(.wx-gantt-tooltip) {
		pointer-events: none;
		position: absolute;
		z-index: 10;
		box-shadow: var(--wx-box-shadow);
		border-radius: 2px;
		overflow: hidden;
	}

	.wx-gantt-tooltip-text {
		padding: 6px 10px;
		background-color: var(--wx-tooltip-background);
		font: var(--wx-tooltip-font);
		color: var(--wx-tooltip-font-color);
	}
</style>
