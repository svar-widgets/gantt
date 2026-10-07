import { locate, getID, setID } from "@svar-ui/lib-dom";
import { isPlaceholder } from "@svar-ui/gantt-store";

function getOffset(node, relative, ev) {
	const box = node.getBoundingClientRect();
	const base = relative.querySelector(".wx-body").getBoundingClientRect();

	return {
		top: box.top - base.top,
		left: box.left - base.left,
		dt: box.bottom - ev.clientY,
		db: ev.clientY - box.top,
	};
}

function checkSource(node) {
	if (!node) return null;
	const id = getID(node, "data-context-id");
	return isPlaceholder(id) ? null : id;
}

function findRow(root, id) {
	return root.querySelector(`[data-id="${setID(id)}"]`);
}

function makeClone(source) {
	const clone = source.cloneNode(true);
	clone.classList.add("wx-reorder-task");
	clone.style.pointerEvents = "none";
	clone.style.position = "absolute";
	return clone;
}

const SHIFT = 5;

// Mirror reorder started in another panel
export function followReorder(node, config) {
	if (!config) return {};

	let clone = null;
	let activeId = null;
	const tag = Symbol();
	const { api } = config;

	function cleanup() {
		if (clone?.parentNode) clone.parentNode.removeChild(clone);
		clone = null;
		if (activeId) {
			const source = findRow(node, activeId);
			if (source) source.style.visibility = "";
		}
		activeId = null;
	}

	function onDrag(ev) {
		if (typeof ev.top === "undefined") return;

		if (ev.inProgress === false) {
			cleanup();
			return;
		}

		const body = node.querySelector(".wx-body");
		const source = findRow(node, ev.id);
		if (!body || !source) return;

		activeId = ev.id;

		if (!clone || !clone.parentNode) {
			if (clone?.parentNode) clone.parentNode.removeChild(clone);
			clone = makeClone(source);
			clone.style.left = "0";
			body.appendChild(clone);
		}

		source.style.visibility = "hidden";
		const from = api.getState().area?.from ?? 0;
		clone.style.top = Math.round(Math.max(0, ev.top - from)) + "px";
	}

	if (node.style.position !== "absolute") node.style.position = "relative";

	api.on("drag-task", onDrag, { tag });

	api.on(
		"move-task",
		ev => {
			if (ev.inProgress === false) cleanup();
		},
		{ tag }
	);

	return {
		destroy() {
			api.detach(tag);
			cleanup();
		},
	};
}

export function reorder(node, config) {
	let source, clone, sid;
	let x, y, base, detail;
	let touched, touchTimer;

	function down(event) {
		x = event.clientX;
		y = event.clientY;
		base = {
			...getOffset(source, node, event),
			y: config.getTask(sid).$y,
		};

		document.body.style.userSelect = "none";
	}

	function handleTouchstart(event) {
		source = locate(event);
		if (!checkSource(source)) return;

		sid = getID(source);

		touchTimer = setTimeout(() => {
			touched = true;
			if (config && config.touchStart) config.touchStart();
			down(event.touches[0]);
		}, 500);

		node.addEventListener("touchmove", handleTouchmove);
		node.addEventListener("contextmenu", handleContext);
		window.addEventListener("touchend", handleTouchend);
	}

	function handleContext(event) {
		if (touched || touchTimer) {
			event.preventDefault();
			return false;
		}
	}

	function handleMousedown(event) {
		if (event.which !== 1) return;

		source = locate(event);
		if (!checkSource(source)) return;

		sid = getID(source);

		node.addEventListener("mousemove", handleMousemove);
		window.addEventListener("mouseup", handleMouseup);

		down(event);
	}

	function end(full) {
		if (touchTimer) {
			clearTimeout(touchTimer);
			touchTimer = null;
		}
		node.removeEventListener("mousemove", handleMousemove);
		node.removeEventListener("touchmove", handleTouchmove);
		node.removeEventListener("contextmenu", handleContext);
		window.removeEventListener("mouseup", handleMouseup);
		window.removeEventListener("touchend", handleTouchend);
		document.body.style.userSelect = "";

		if (full) {
			node.removeEventListener("mousedown", handleMousedown);
			node.removeEventListener("touchstart", handleTouchstart);
		}
	}

	function move(event) {
		const dx = event.clientX - x;
		const dy = event.clientY - y;
		if (!clone) {
			if (Math.abs(dx) < SHIFT && Math.abs(dy) < SHIFT) return;
			if (config && config.start) {
				if (config.start({ id: sid, e: event }) === false) return;
			}

			clone = makeClone(source);
			clone.style.left = base.left + "px";
			clone.style.top = base.top + "px";

			source.style.visibility = "hidden";
			source.parentNode.insertBefore(clone, source);
		}

		if (clone) {
			const top = Math.round(Math.max(0, base.top + dy));

			if (config && config.move) {
				if (config.move({ id: sid, top, detail }) === false) return;
			}

			const task = config.getTask(sid);
			const y = task.$y;
			//dnd may be blocked
			if (!base.start && base.y === y) return up();

			base.start = true;
			base.y = task.$y - 4;
			clone.style.top = top + "px"; //task.$y - scroll

			const targetNode = document.elementFromPoint(
				event.clientX,
				event.clientY
			);
			const target = locate(targetNode);

			if (target && target !== source) {
				const tid = getID(target);
				if (isPlaceholder(tid)) return;
				const box = target.getBoundingClientRect();
				const line = box.top + box.height / 2;

				const after =
					event.clientY + base.db > line &&
					target.nextElementSibling !== source;
				const before =
					event.clientY - base.dt < line &&
					target.previousElementSibling !== source;

				if (detail?.after === tid || detail?.before === tid) {
					// avoid duplicate calls
					detail = null;
				} else if (after) {
					// move down
					detail = { id: sid, after: tid };
				} else if (before) {
					// move up
					detail = { id: sid, before: tid };
				}
			}
		}
	}

	function handleMousemove(event) {
		move(event);
	}

	function handleTouchmove(event) {
		if (touched) {
			event.preventDefault();
			move(event.touches[0]);
		} else if (touchTimer) {
			clearTimeout(touchTimer);
			touchTimer = null;
		}
	}

	function handleTouchend() {
		touched = null;
		if (touchTimer) {
			clearTimeout(touchTimer);
			touchTimer = null;
		}
		up();
	}

	function handleMouseup() {
		up();
	}

	function up() {
		if (source) {
			source.style.visibility = "";
		}
		if (clone) {
			clone.parentNode.removeChild(clone);
			if (config && config.end) config.end({ id: sid, top: base.top });
		}

		sid = source = clone = base = detail = null;
		end();
	}

	if (node.style.position !== "absolute") node.style.position = "relative";

	node.addEventListener("mousedown", handleMousedown);
	node.addEventListener("touchstart", handleTouchstart);

	return {
		destroy() {
			end(true);
		},
	};
}
