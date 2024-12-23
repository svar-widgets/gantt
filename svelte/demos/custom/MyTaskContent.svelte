<script>
	let { data, onaction } = $props();

	function doClick(ev) {
		ev.stopPropagation();
		onaction({
			action: "custom-click",
			data: {
				clicked: !data.clicked,
				id: data.id,
			},
		});
	}
</script>

{#if data.type !== "milestone"}
	<div class="wx-text-out text-right">{data.text || ""}</div>
	<button onclick={doClick}>
		{#if data.clicked}Was clicked{:else}Click Me{/if}
	</button>
{:else}
	<div class="wx-text-out text-left">{data.text || ""}</div>
{/if}

<style>
	button {
		font-size: 10px;
		position: relative;
		z-index: 2;
		font: var(--wx-gantt-bar-font);
	}

	.text-right {
		left: 100%;
		top: -2px;
	}

	.text-left {
		right: 100%;
		top: -2px;
	}

	.text-right,
	.text-left,
	button {
		padding: 0 2px;
		font-size: 12px;
	}
</style>
