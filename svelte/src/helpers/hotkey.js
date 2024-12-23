class ScreenKeys {
	constructor() {
		this.store = new Map();
	}
	limit(check) {
		this._scope = check;
	}
	isActive() {
		return !this._scope || this._scope();
	}
	add(key, handler) {
		this.store.set(key.toLowerCase().replace(/[ ]/g, ""), handler);
	}
}

const chain = [];
export const hotkeys = {
	subscribe: v => {
		init_once();

		const t = new ScreenKeys();
		chain.push(t);
		v(t);

		return () => {
			const ind = chain.findIndex(a => a === t);
			if (ind >= 0) chain.splice(ind, 1);
		};
	},
};

var ready = false;
function init_once() {
	if (ready) return;
	ready = true;

	document.addEventListener("keydown", ev => {
		if (
			chain.length &&
			(ev.ctrlKey ||
				ev.altKey ||
				ev.metaKey ||
				ev.shiftKey ||
				ev.key.length > 1 ||
				ev.key === " ")
		) {
			const code = [];
			if (ev.ctrlKey) code.push("ctrl");
			if (ev.altKey) code.push("alt");
			if (ev.metaKey) code.push("meta");
			if (ev.shiftKey) code.push("shift");
			let evKey = ev.key.toLocaleLowerCase();
			if (ev.key === " ") {
				evKey = "space";
			}
			code.push(evKey);

			const key = code.join("+");
			for (let i = chain.length - 1; i >= 0; i--) {
				const t = chain[i];
				const h = t.store.get(key) || t.store.get(evKey);
				const tagName = ev.target.tagName;
				if (h && tagName !== "INPUT" && tagName !== "TEXTAREA") {
					if (t.isActive()) {
						h(ev);
						ev.preventDefault();
						return;
					}
				}
			}
		}
	});
}
