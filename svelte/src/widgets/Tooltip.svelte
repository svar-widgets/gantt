<script>
	import { afterUpdate } from "svelte";

	export let content = null;
	export let api = null;

	export let data = getTaskObj;

	let tooltipData, tooltipNode, tooltipCoords;
	let targetCoords;
	let area, areaCoords;
	let pos;

	function findAttribute(node) {
		while (node) {
			if (node.getAttribute) {
				const id = node.getAttribute("data-tooltip-id");
				const at = node.getAttribute("data-tooltip-at");
				const tooltip = node.getAttribute("data-tooltip");
				if (id || tooltip) return { id, tooltip, target: node, at };
			}
			node = node.parentNode;
		}

		return { id: null, tooltip: null, target: null, at: null };
	}

	afterUpdate(() => {
		if (tooltipNode) {
			tooltipCoords = tooltipNode.getBoundingClientRect();
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
		let { id, tooltip, target, at } = findAttribute(e.target);
		pos = null;
		tooltipData = null;

		if (!tooltip) {
			if (!id) {
				clearTimeout(timer);
				return;
			} else {
				tooltip = getTaskText(id);
			}
		}

		debounce(() => {
			if (id && data) {
				tooltipData = data(prepareId(id));
			}

			targetCoords = target.getBoundingClientRect();
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
		return api?.getTask(prepareId(id)) || null;
	}

	function getTaskText(id) {
		return getTaskObj(id)?.text || "";
	}

	function prepareId(id) {
		const numId = parseInt(id);
		return isNaN(numId) ? id : numId;
	}

</script>

<div class="wx-tooltip-area" bind:this={area} on:mousemove={move}>
	{#if pos && (pos.text || content)}
		<div
			class="wx-gantt-tooltip"
			bind:this={tooltipNode}
			style="top:{pos.top}px;left:{pos.left}px">
			{#if content}
				<svelte:component this={content} data={tooltipData} />
			{:else if pos.text}
				<div class="wx-gantt-tooltip-text">{pos.text}</div>
			{/if}
		</div>
	{/if}

	<slot />
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
