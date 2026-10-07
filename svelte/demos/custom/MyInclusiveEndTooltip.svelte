<script>
	import { addDays, format } from "date-fns";

	let { api, data } = $props();

	const mask = "dd-MM-yyyy";

	// custom content gets the stored (exclusive) end, convert it here
	const shownEnd = date =>
		api.getState().inclusiveEnd ? addDays(date, -1) : date;
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
	<div class="data">
		{@render row("Name", task.text)}
		{#if task.start}
			{@render row("Start date", format(task.start, mask))}
		{/if}
		{#if task.end}
			{@render row("End date", format(shownEnd(task.end), mask))}
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
</style>
