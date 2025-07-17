<script>
	let {
		position = "after",
		size = 4,
		dir = "x",
		value = $bindable(0),
		minValue = 0,
		maxValue = 0,
		onmove,
		display = $bindable("all"),
		compactMode,
	} = $props();

	function getBox(value) {
		let offset = 0;
		if (position == "center") offset = size / 2;
		else if (position == "before") offset = size;

		const box = {
			size: [size + "px", "auto"],
			p: [value - offset + "px", "0px"],
			p2: ["auto", "0px"],
		};

		if (dir != "x") for (let name in box) box[name] = box[name].reverse();
		return box;
	}

	let start = 0,
		pos,
		active = $state(false);

	function getEventPos(ev) {
		return dir == "x" ? ev.clientX : ev.clientY;
	}
	function down(ev) {
		start = getEventPos(ev);
		pos = value;
		active = true;

		document.body.style.cursor = cursor;
		document.body.style.userSelect = "none";

		window.addEventListener("mousemove", move);
		window.addEventListener("mouseup", up);
	}
	let timeout;
	function move(ev) {
		const newPos = pos + getEventPos(ev) - start;
		if (
			(!minValue || minValue <= newPos) &&
			(!maxValue || maxValue >= newPos)
		) {
			value = newPos;
			if (timeout) clearTimeout(timeout);
			timeout = setTimeout(() => onmove && onmove(value), 100);
		}
	}

	function up() {
		document.body.style.cursor = "";
		document.body.style.userSelect = "";
		active = false;
		window.removeEventListener("mousemove", move);
		window.removeEventListener("mouseup", up);
	}

	function handleExpandLeft() {
		if (compactMode) {
			display = display === "chart" ? "grid" : "chart";
		} else {
			display = display === "all" ? "chart" : "all";
		}
	}

	function handleExpandRight() {
		if (compactMode) {
			display = display === "grid" ? "chart" : "grid";
		} else {
			display = display === "all" ? "grid" : "all";
		}
	}
	const b = $derived(getBox(value));
	const cursor = $derived(
		display !== "all" ? "auto" : dir == "x" ? "ew-resize" : "ns-resize"
	);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="wx-resizer wx-resizer-{dir} wx-resizer-display-{display}"
	class:wx-resizer-active={active}
	onmousedown={down}
	style="width:{b.size[0]}; height: {b.size[1]}; cursor:{cursor};"
>
	<div class="wx-button-expand-box">
		<div class="wx-button-expand-content wx-button-expand-left">
			<i class="wxi-menu-left" onclick={handleExpandLeft}></i>
		</div>
		<div class="wx-button-expand-content wx-button-expand-right">
			<i class="wxi-menu-right" onclick={handleExpandRight}></i>
		</div>
	</div>
	<div class="wx-resizer-line"></div>
</div>

<style>
	.wx-resizer.wx-resizer-display-all:hover::before,
	.wx-resizer.wx-resizer-display-all:hover::after,
	.wx-button-expand-content::before,
	.wx-button-expand-content::after {
		content: "";
		position: absolute;
		background-color: var(--wx-gantt-border-color);
	}

	.wx-resizer {
		position: relative;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--wx-gantt-border-color);
	}
	.wx-resizer:hover .wx-button-expand-content {
		opacity: 1;
	}

	.wx-resizer.wx-resizer-display-all:hover::before,
	.wx-resizer.wx-resizer-display-all:hover::after {
		top: 0;
		width: 2px;
		height: 100%;
	}

	.wx-resizer.wx-resizer-display-all:hover::before {
		left: -3px;
	}

	.wx-resizer.wx-resizer-display-all:hover::after {
		right: -2px;
	}

	.wx-resizer-display-chart .wx-button-expand-left {
		display: none;
	}

	.wx-resizer-display-grid .wx-button-expand-right {
		display: none;
	}

	.wx-resizer-display-all {
		.wx-button-expand-content {
			opacity: 0;
		}
	}

	.wx-resizer-display-all .wx-button-expand-box,
	.wx-resizer-display-chart .wx-button-expand-box {
		left: 12px;
	}

	.wx-resizer-display-grid .wx-button-expand-left {
		right: -6px;
	}

	.wx-resizer-display-chart .wx-button-expand-left,
	.wx-resizer-display-all .wx-button-expand-left {
		right: 5px;
	}

	.wx-button-expand-box {
		position: relative;
		width: 20px;
	}

	.wx-button-expand-content {
		position: absolute;
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
		top: 4px;
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
		top: 4px;
		i {
			border-top-left-radius: 4px;
			border-bottom-left-radius: 4px;
		}

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
	}
</style>
