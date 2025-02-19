<script>
	let { row, column } = $props();

	function getStyle(row, col) {
		return `justify-content:${col.align};padding-left: ${
			(row.$level - 1) * 20
		}px`;
	}
</script>

<div class="wx-content" style={getStyle(row, column)}>
	{#if row.data || row.lazy}
		<i
			class="wx-toggle-icon wxi-menu-{row.open ? 'down' : 'right'}"
			data-action="open-task"
		></i>
	{:else}<i class="wx-toggle-placeholder"></i>{/if}
	<div class="wx-text">{row.text}</div>
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
	}
	.wx-toggle-placeholder {
		width: var(--wx-icon-size);
		height: 16px;
		line-height: 16px;
		margin: 0 5px;
		flex: 0 0 var(--wx-icon-size);
	}

	.wx-text {
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}
</style>
