<script>
	import { format } from "date-fns";

	let { api, data } = $props();

	const mask = "yyyy.MM.dd";
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
			{@render row("End date", format(task.end, mask))}
		{/if}
	</div>
{:else if data?.link}
	{@const link = data.link}
	<div class="data">
		{@render row("Predecessors", api.getTask(link.source).text)}
		{@render row("Successors", api.getTask(link.target).text)}
	</div>
{:else if data?.rollup}
	{@const rollup = data.rollup}
	<div class="data">
		{@render row("Name", rollup.text)}
		{#if rollup.start}
			{@render row("Start date", format(rollup.start, mask))}
		{/if}
		{#if rollup.end}
			{@render row("End date", format(rollup.end, mask))}
		{/if}
	</div>
{:else if data?.sCurve}
	{@const sCurve = data.sCurve}
	<div class="data">
		{@render row("Start date", format(sCurve.date, mask))}
		{#each sCurve.lines as line (line.line)}
			<div
				class="wx-row"
				class:hovered={line.line === sCurve.hovered.line}
			>
				<span class="wx-label">{line.type} by {line.metric}:</span>
				<span class="wx-value">{Math.round(line.value)}%</span>
			</div>
		{/each}
	</div>
{:else if data?.deadline}
	{@const task = data.deadline}
	<div class="data">
		<div class="text">
			<span class="caption">deadline:</span>
			{format(task.deadline, mask)}
		</div>
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

	.hovered .wx-value {
		color: #ffd88a;
	}
</style>
