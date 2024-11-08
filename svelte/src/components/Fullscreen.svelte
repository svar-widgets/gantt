<script>
	import IconButton from "../widgets/IconButton.svelte";
	import { hotkeys } from "../helpers/hotkey";
	import { onDestroy } from "svelte";

	export let mode = false;
	export let hotkey = null;

	if (hotkey) $hotkeys.add(hotkey, toggleFullscreen);

	let node;
	let inFullscreen = false;
	function toggleFullscreen(mode) {
		if (typeof mode === "undefined") mode = !inFullscreen;

		if (mode && node) {
			node.requestFullscreen();
		} else if (inFullscreen) {
			document.exitFullscreen();
		}
		inFullscreen = mode;
	}

	const setFullscreenState = () => {
		inFullscreen = document.fullscreenElement === node;
	};
	document.addEventListener("fullscreenchange", setFullscreenState);
	onDestroy(() => {
		document.removeEventListener("fullscreenchange", setFullscreenState);
	});

	$: toggleFullscreen(mode);
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div tabindex="0" class="wx-fullscreen" bind:this={node}>
	<slot />
	<div class="wx-fullscreen-icon">
		<IconButton
			appearance={"transparent"}
			icon="wxi-{inFullscreen ? 'collapse' : 'expand'}"
			on:click={() => toggleFullscreen()}
		/>
	</div>
</div>

<style>
	.wx-fullscreen {
		position: relative;
		height: 100%;
		width: 100%;
		outline: none;
	}
	.wx-fullscreen-icon {
		position: absolute;
		right: 25px;
		bottom: 35px;
		z-index: 4;
		right: 3px;
		bottom: 16px;
	}
</style>
