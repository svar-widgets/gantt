<script>
	import { dateToString } from "@svar-ui/lib-dom";
	import { defaultConstraintTypes } from "@svar-ui/gantt-store";

	let { api, data } = $props();

	const dateFormat = dateToString("%d.%m.%Y");
	const constraintLabels = Object.fromEntries(
		defaultConstraintTypes.map(t => [t.id, t.label])
	);

	function constraintLabel(type) {
		return constraintLabels[type] || type;
	}
</script>

{#snippet row(label, value)}
	<div class="wx-row">
		<span class="wx-label">{label}:</span>
		<span class="wx-value">{value}</span>
	</div>
{/snippet}

{#if data?.text}
	<div class="data">
		<div class="wx-row">{data.text}</div>
	</div>
{:else if data?.task}
	{@const task = data.task}
	{@const c = task.constraint}
	<div class="data">
		{@render row("Name", task.text)}
		{#if task.start}
			{@render row("Start date", dateFormat(task.start))}
		{/if}
		{#if task.end}
			{@render row("End date", dateFormat(task.end))}
		{/if}
		{#if c?.type}
			{@render row(
				constraintLabel(c.type),
				c.date ? dateFormat(c.date) : ""
			)}
			{#if data.violated}
				<div class="wx-violated-row">Violated</div>
			{/if}
		{/if}
	</div>
{:else if data?.link}
	{@const link = data.link}
	<div class="data">
		{@render row("Predecessors", api.getTask(link.source).text)}
		{@render row("Successors", api.getTask(link.target).text)}
	</div>
{:else if data?.deadline}
	{@const deadlineTask = data.deadline}
	<div class="data">
		{#if deadlineTask.deadline}
			{@render row("Deadline", dateFormat(deadlineTask.deadline))}
		{/if}
	</div>
{:else if data?.constraint}
	{@const c = data.constraint.constraint}
	<div class="data">
		{#if c?.type}
			{@render row(
				constraintLabel(c.type),
				c.date ? dateFormat(c.date) : ""
			)}
		{/if}
		{#if data.violated}
			<div class="wx-violated-row">Violated</div>
		{/if}
	</div>
{/if}

<style>
	.data {
		white-space: nowrap;
		background-color: var(--wx-tooltip-background);
		padding: 6px 10px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.wx-row {
		display: flex;
		align-items: baseline;
		gap: 6px;
		font-family: var(--wx-font-family);
		font-size: 13px;
		color: var(--wx-color-primary-font);
	}

	.wx-label {
		font-weight: normal;
	}

	.wx-value {
		font-weight: 600;
	}

	.wx-violated-row {
		font-family: var(--wx-font-family);
		font-size: 13px;
		font-weight: normal;
		color: var(--wx-gantt-constraint-violation-color);
	}
</style>
