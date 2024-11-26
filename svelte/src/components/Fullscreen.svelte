<script>
	import IconButton from "../widgets/IconButton.svelte";
	import { hotkeys } from "../helpers/hotkey";
	import { onDestroy } from "svelte";

	let { mode = false, hotkey = null, children } = $props();

	if (hotkey) $hotkeys.add(hotkey, toggleFullscreen);

	let node = null;
	let inFullscreen = $state(false);
	function toggleFullscreen(mode) {
		console.log(mode);
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

	$effect(() => {
		toggleFullscreen(mode);
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div tabindex="0" class="wx-fullscreen" bind:this={node}>
	{@render children?.()}
	<div class="wx-fullscreen-icon">
		<IconButton
			appearance={"transparent"}
			icon="wxi-{inFullscreen ? 'collapse' : 'expand'}"
			on:click={() => (mode = !mode)}
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
