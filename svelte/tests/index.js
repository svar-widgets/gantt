import Demos from "./common/Index.svelte";
import { mount } from "svelte";

mount(Demos, {
	target: document.querySelector("#wx_demo_area") || document.body,
});
