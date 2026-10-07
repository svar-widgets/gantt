<script>
	import { onDestroy } from "svelte";

	let {
		side = "left",
		layout = "both",
		draggable = false,
		hideButtonsUntilHover = false,
		startButton = null,
		endButton = null,
		panelWidth = 0,
		resizeInvert = false,
		onResize,
		onResizeStart,
		onResizeEnd,
		onExpandStart,
		onExpandEnd,
	} = $props();

	const cursor = $derived(draggable ? "ew-resize" : "auto");

	let start = 0;
	let pos;
	let width = null; // last dragged width, null when not dragging

	function widthAt(ev) {
		const delta = ev.clientX - start;
		return resizeInvert ? pos - delta : pos + delta;
	}

	function down(ev) {
		if (!draggable) return;

		start = ev.clientX;
		pos = width = panelWidth;
		onResizeStart?.();

		document.body.style.cursor = cursor;
		document.body.style.userSelect = "none";

		window.addEventListener("mousemove", move);
		window.addEventListener("mouseup", up);
	}

	function move(ev) {
		width = widthAt(ev);
		onResize?.(width);
	}

	function stop() {
		document.body.style.cursor = "";
		document.body.style.userSelect = "";
		window.removeEventListener("mousemove", move);
		window.removeEventListener("mouseup", up);
	}

	function end(endWidth) {
		width = null;
		stop();
		onResizeEnd?.(endWidth);
	}

	function up(ev) {
		end(widthAt(ev));
	}

	// unmounted mid-drag: still commit, so the store drops its drag snapshot
	onDestroy(() => {
		if (width != null) end(width);
		else stop();
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="wx-resizer wx-resizer-{side} wx-resizer-layout-{layout}"
	class:wx-resizer-grip-hover={hideButtonsUntilHover}
	onmousedown={down}
	style="cursor:{cursor};"
>
	<div class="wx-button-expand-box">
		{#if startButton?.visible}
			<div
				class="wx-button-expand-content wx-button-expand-{startButton.side}"
			>
				<i class="wxi-menu-{startButton.icon}" onclick={onExpandStart}
				></i>
			</div>
		{/if}
		{#if endButton?.visible}
			<div
				class="wx-button-expand-content wx-button-expand-{endButton.side}"
			>
				<i class="wxi-menu-{endButton.icon}" onclick={onExpandEnd}></i>
			</div>
		{/if}
	</div>
</div>

<style>
	.wx-resizer {
		position: relative;
		display: flex;
		flex: 0 0 auto;
		width: 4px;
		align-items: center;
		justify-content: center;
		background-color: var(--wx-gantt-border-color);
	}

	.wx-resizer-left {
		z-index: 12;
	}

	.wx-resizer-right {
		z-index: 11;
	}

	.wx-resizer-right.wx-resizer-layout-collapsed {
		overflow: visible;
	}

	.wx-resizer-grip-hover:not(:hover) .wx-button-expand-content {
		opacity: 0;
	}

	/* drag grip lines */
	.wx-resizer-grip-hover:hover::before,
	.wx-resizer-grip-hover:hover::after,
	.wx-button-expand-content::before,
	.wx-button-expand-content::after {
		content: "";
		position: absolute;
		background-color: var(--wx-gantt-border-color);
	}

	.wx-resizer-grip-hover:hover::before,
	.wx-resizer-grip-hover:hover::after {
		top: 0;
		width: 2px;
		height: 100%;
	}

	.wx-resizer-grip-hover.wx-resizer-left:hover::before {
		left: -3px;
	}

	.wx-resizer-grip-hover.wx-resizer-left:hover::after {
		right: -2px;
	}

	.wx-resizer-grip-hover.wx-resizer-right:hover::before {
		left: -2px;
	}

	.wx-resizer-grip-hover.wx-resizer-right:hover::after {
		right: -3px;
	}

	/* expand box offset toward the adjacent panel */
	.wx-resizer-layout-both .wx-button-expand-box,
	.wx-resizer-layout-end .wx-button-expand-box {
		left: 12px;
	}

	.wx-resizer-right.wx-resizer-layout-collapsed .wx-button-expand-box {
		left: -12px;
	}

	/* expand button position within the box */
	.wx-resizer-layout-both .wx-button-expand-left {
		right: 5px;
	}

	.wx-resizer-layout-start .wx-button-expand-left {
		right: -6px;
	}

	.wx-resizer-right.wx-resizer-layout-collapsed .wx-button-expand-left {
		left: 5px;
		right: auto;
	}

	.wx-button-expand-box {
		position: relative;
		width: 20px;
	}

	.wx-button-expand-content {
		position: absolute;
		top: 4px;
		transform: translate(-50%, -50%);
		width: 20px;

		i {
			display: flex;
			justify-content: center;
			background-color: var(--wx-gantt-border-color);
			cursor: pointer;
			font-size: 20px;
			line-height: 24px;
		}

		i:hover {
			color: var(--wx-color-primary);
		}

		i:active {
			color: var(--wx-gantt-task-fill-color);
		}
	}

	.wx-button-expand-right {
		left: 1px;

		&::before {
			top: -3.6px;
			width: 17px;
			height: 4px;
			clip-path: polygon(100% 100%, 0 0, 0 100%);
		}

		&::after {
			width: 17px;
			height: 4px;
			clip-path: polygon(100% 0, 0 100%, 0 0);
		}

		i {
			border-top-right-radius: 4px;
			border-bottom-right-radius: 4px;
		}
	}

	.wx-button-expand-left {
		&::before {
			top: -3.6px;
			left: 3px;
			width: 17px;
			height: 4px;
			clip-path: polygon(100% 0, 100% 100%, 0% 100%);
		}

		&::after {
			left: 3px;
			width: 17px;
			height: 4px;
			clip-path: polygon(0 0, 100% 100%, 100% 0);
		}

		i {
			border-top-left-radius: 4px;
			border-bottom-left-radius: 4px;
		}
	}
</style>
