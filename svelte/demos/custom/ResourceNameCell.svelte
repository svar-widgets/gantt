<script>
	import { Avatar } from "@svar-ui/svelte-core";

	let { row } = $props();
</script>

<div class="content">
	<Avatar value={row} size={28} />
	<div class="meta">
		<span class="name">{row.name}</span>
		<span class="detail">{row.role}</span>
	</div>
</div>

<style>
	.content {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
	}

	.meta {
		min-width: 0;
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
