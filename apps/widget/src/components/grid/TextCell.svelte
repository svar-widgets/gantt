<script lang="ts">
	import { getContext } from "svelte";
	import type { ILocale } from "@svar-ui/lib-dom";
	import type { IColumn } from "@svar-ui/grid-store";
	import type { IParsedTask } from "@svar-ui/gantt-store";
	import type { TCellComponent } from "../../types";
	import GroupCellText from "./GroupCellText.svelte";

	type TRow = IParsedTask;
	type TColumn = IColumn & { align?: string; _cell?: TCellComponent };

	type Props = {
		row: TRow;
		column: TColumn;
	};

	let { row, column }: Props = $props();

	const _ = getContext<ILocale>("wx-i18n").getGroup("gantt");

	function getStyle(row: TRow, col: TColumn) {
		return `justify-content:${col.align};padding-left: ${
			(row.$level - 1) * 20
		}px`;
	}
</script>

<div class="wx-content" style={getStyle(row, column)}>
	{#if !row.$empty && (row.data?.length || row.lazy)}
		<i
			class="wx-toggle-icon wxi-menu-{row.open ? 'down' : 'right'}"
			data-action="open-task"
		></i>
	{:else}<i class="wx-toggle-placeholder"></i>{/if}
	<div class="wx-text">
		{#if column._cell}
			<column._cell {row} {column} />
		{:else if row.$group}
			<GroupCellText {row} />
		{:else if row.$placeholder && !row.text}
			<span class="wx-hint">{_("New task")}</span>
		{:else}
			{row.text}
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

	.wx-text {
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}

	.wx-hint {
		color: var(--wx-color-font-disabled);
	}
</style>
