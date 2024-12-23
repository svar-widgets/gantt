<script>
	let {
		position = "after",
		size = 4,
		dir = "x",
		value = $bindable(0),
		minValue = 0,
		maxValue = 0,
		onmove,
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

	const b = $derived(getBox(value));
	const cursor = $derived(dir == "x" ? "ew-resize" : "ns-resize");
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="wx-resizer wx-resizer-{dir}"
	class:wx-resizer-active={active}
	onmousedown={down}
	style="left:{b.p[0]};top:{b.p[1]};width:{b.size[0]}; height: {b
		.size[1]};right:{b.p2[0]};bottom:{b.p2[1]}; cursor:{cursor};"
>
	<div class="wx-resizer-line"></div>
</div>

<style>
	.wx-resizer {
		position: absolute;
		z-index: 2;
	}

	.wx-resizer-x .wx-resizer-line {
		width: 2px;
		height: 100%;
	}
	.wx-resizer-y .wx-resizer-line {
		height: 2px;
		width: 100%;
	}
	.wx-resizer-active .wx-resizer-line {
		background: rgba(0, 0, 0, 0.05);
	}
</style>
