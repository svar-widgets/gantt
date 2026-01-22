import { mount } from "svelte";
import Gantt from "./components/Export.svelte";

function init(target, config, skin) {
	mount(Gantt, {
		target: target ? document.querySelector(target) : document.body,
		props: {
			config,
			skin,
		},
	});
}

export { init };
