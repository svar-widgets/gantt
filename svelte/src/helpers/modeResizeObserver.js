const COMPACT_WIDTH = 650;

export function useModeObserver(callback) {
	let observer;

	function observe() {
		observer = new ResizeObserver(entries => {
			for (let obj of entries) {
				if (obj.target === document.body) {
					let mode = obj.contentRect.width <= COMPACT_WIDTH;
					callback(mode);
				}
			}
		});

		observer.observe(document.body);
	}

	function disconnect() {
		if (observer) {
			observer.disconnect();
			observer = null;
		}
	}

	return {
		observe,
		disconnect,
	};
}
