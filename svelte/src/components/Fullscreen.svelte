<script>
	import IconButton from "../widgets/IconButton.svelte";
	import { hotkeys } from "../helpers/hotkey";

	let { hotkey = null, children } = $props();

	$effect(() => {
		if (hotkey) $hotkeys.add(hotkey, toggleFullscreen);
	});

	let node = null;
	let inFullscreen = $state(false);

	function toggleFullscreen() {
		let mode = !inFullscreen;

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

	$effect(() => {
		document.addEventListener("fullscreenchange", setFullscreenState);
		return () => {
			document.removeEventListener(
				"fullscreenchange",
				setFullscreenState
			);
		};
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div tabindex="0" class="wx-fullscreen" bind:this={node}>
	{@render children?.()}
	<div class="wx-fullscreen-icon">
		<IconButton
			appearance={"transparent"}
			icon="wxi-{inFullscreen ? 'collapse' : 'expand'}"
			onclick={() => toggleFullscreen()}
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
	}
</style>
