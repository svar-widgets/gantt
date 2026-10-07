<script>
	let { row } = $props();

	const detail = $derived(
		row.type === "milestone"
			? "milestone"
			: row.duration != null
				? `${row.duration}d`
				: ""
	);
</script>

<div class="meta">
	<span class="name">{row.text}</span>
	{#if detail}
		<span class="detail">{detail}</span>
	{/if}
</div>

<style>
	.meta {
		min-width: 0;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0;
		line-height: 1.15;
	}

	.name,
	.detail {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.name {
		font-size: var(--wx-font-size);
		color: var(--wx-color-font);
	}

	.detail {
		font-size: var(--wx-font-size-sm);
		color: var(--wx-color-font-alt);
	}
</style>
