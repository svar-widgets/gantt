<script>
	import { Avatar } from "@svar-ui/svelte-core";

	let { row, column } = $props();

	function getStyle(row, col) {
		return `justify-content:${col.align};padding-left: ${
			(row.$level - 1) * 20
		}px`;
	}
</script>

<div class="wx-content" style={getStyle(row, column)}>
	{#if row.data}
		<i
			class="wx-toggle-icon wxi-menu-{row.open ? 'down' : 'right'}"
			data-action="open-resource-row"
		></i>
	{:else}<i class="wx-toggle-placeholder"></i>{/if}
	<div class="wx-name">
		{#if column._cell}
			<column._cell {row} {column} />
		{:else if row.role}
			<div class="wx-avatar-name">
				<Avatar value={row} size={28} />
				<span>{row.name}</span>
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

	.wx-toggle-icon {
		width: var(--wx-icon-size);
		min-width: 12px;
		height: 16px;
		line-height: 16px;
		margin: 0 5px;
		font-size: var(--wx-icon-size);
		color: var(--wx-gantt-icon-color);
		cursor: pointer;
		flex-shrink: 0;
	}
	.wx-toggle-placeholder {
		width: var(--wx-icon-size);
		height: 16px;
		line-height: 16px;
		margin: 0 5px;
		flex: 0 0 var(--wx-icon-size);
	}

	.wx-name,
	.wx-avatar-name span {
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}

	.wx-avatar-name {
		display: flex;
		align-items: center;
		gap: 5px;
		& :global(.wx-avatar-root) {
			flex: 0 0 auto;
		}
	}
</style>
