<script>
	import {
		Globals,
		Willow,
		Material,
		WillowDark,
		Locale,
	} from "wx-svelte-core";
	import MainDemo from "./MainDemo.svelte";

	let skin = "willow";
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
