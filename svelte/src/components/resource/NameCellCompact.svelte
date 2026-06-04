<script>
	import { Avatar } from "@svar-ui/svelte-core";

	let { row, column } = $props();
</script>

<div class="wx-content wx-compact" data-tooltip={row.name}>
	<div class="wx-name">
		{#if column._cell}
			<column._cell {row} {column} />
		{:else if row.role}
			<div class="wx-avatar">
				<Avatar value={row} size={20} />
			</div>
		{:else}
			{row.name}
		{/if}
	</div>
</div>

<style>
	.wx-content {
		width: 100%;
		white-space: nowrap;
		display: flex;
		align-items: center;
	}

	.wx-name {
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}

	.wx-avatar {
		display: flex;
		align-items: center;
	}
</style>
