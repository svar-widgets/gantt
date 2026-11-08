const MAX_ZOOM_RATE = 0.003; // per ms

import type { IApi } from "@svar-ui/gantt-store";

function clamp(value: number, min: number, max: number) {
	return Math.max(Math.min(value, max), min);
}

export function createZoomWheelHandler(
	api: Pick<IApi, "exec">,
	getZoom: () => unknown,
	getContainer: () => HTMLElement
) {
	let pending = false;
	let lastWheelTime = performance.now();

	function getZoomFactor(evDelta: number) {
		const isTouchpad = Math.abs(evDelta) < 50; // or mouse with smooth scrolling
		const SENSITIVITY = isTouchpad ? 0.004 : 0.01; // smaller - slower
		const now = performance.now();
		const dt = Math.min(now - lastWheelTime, 50);
		lastWheelTime = now;
		const normalized = clamp(
			-evDelta * SENSITIVITY,
			-MAX_ZOOM_RATE * dt,
			MAX_ZOOM_RATE * dt
		);
		return Math.exp(normalized);
	}

	return function onWheel(e: WheelEvent) {
		if (getZoom() && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			const ratio = getZoomFactor(e.deltaY);
			const offset =
				e.clientX - getContainer().getBoundingClientRect().left;
			if (!pending) {
				pending = true;
				requestAnimationFrame(() => {
					api.exec("zoom-scale", {
						dir: ratio > 1 ? 1 : -1,
						ratio: Math.abs(1 - ratio),
						offset,
					});
					pending = false;
				});
			}
		}
	};
}
