<script>
	import { run } from "svelte/legacy";

	import {
		Globals,
		Willow,
		Material,
		WillowDark,
		Locale,
	} from "wx-svelte-core";
	import MainDemo from "./MainDemo.svelte";

	let skin = $state("willow");
	run(() => {
		document.body.className = `wx-${skin}-theme`;
	});
</script>

<Material />
<Willow />
<WillowDark />

<div class="wx-{skin}-theme content">
	<Locale>
		<Globals>
			<MainDemo bind:skin />
		</Globals>
	</Locale>
</div>

<style>
	.content {
		height: 100%;
		width: 100%;
	}
</style>
