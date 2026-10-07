<script>
	import { getContext } from "svelte";
	import { setID } from "@svar-ui/lib-dom";

	let { row, column } = $props();

	const api = getContext("gantt-store");
	const { conflicts } = api.getReactiveState();
	const taskId = $derived(row.$id || row.id);
	const isViolated = $derived(
		$conflicts?.some(c => c.type === "constraint" && c.task === taskId)
	);

	const constraint = $derived(row.constraint ?? row[column.id]);
	const text = $derived(
		constraint?.type ? constraint.type.toUpperCase() : ""
	);
</script>

{#if text}
	<span class="wx-constraint-cell" data-constraint-id={setID(row.id)}>
		{#if isViolated}
			<i class="wxi-warning"></i>
		{/if}
		<span class="wx-label">{text}</span>
	</span>
{/if}

<style>
	.wx-constraint-cell {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
		max-width: 100%;
	}
	.wx-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.wxi-warning {
		font-size: 14px;
		color: var(--wx-gantt-constraint-violation-color);
	}
</style>
