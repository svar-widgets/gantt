<script>
	import { format } from "date-fns";

	let { api, data } = $props();

	const mask = "yyyy.MM.dd";
</script>

{#if data?.task}
	{@const task = data.task}
	<div class="data">
		<div class="text">
			<span class="caption">{task.type}:</span>
			{task.text}
		</div>
		<div class="text">
			<span class="caption">start:</span>
			{format(task.start, mask)}
		</div>
		{#if task.end}
			<div class="text">
				<span class="caption">end:</span>
				{format(task.end, mask)}
			</div>
		{/if}
	</div>
{:else if data?.link}
	{@const link = data.link}
	<div class="data">
		<div class="text">
			<span class="caption">predecessor:</span>
			{api.getTask(link.source).text}
		</div>
		<div class="text">
			<span class="caption">successor:</span>
			{api.getTask(link.target).text}
		</div>
	</div>
{:else if data?.rollup}
	{@const rollup = data.rollup}
	<div class="data">
		<div class="text">
			<span class="caption">{rollup.type}:</span>
			{rollup.text}
		</div>
		<div class="text">
			<span class="caption">start:</span>
			{format(rollup.start, mask)}
		</div>
		{#if rollup.end}
			<div class="text">
				<span class="caption">end:</span>
				{format(rollup.end, mask)}
			</div>
		{/if}
	</div>
{/if}

<style>
	.data {
		white-space: nowrap;
		background-color: var(--wx-tooltip-background);
		padding: 3px 8px;
	}

	.text {
		font-family: var(--wx-font-family);
		color: var(--wx-color-primary-font);
		font-size: 13px;
		text-transform: capitalize;
		margin-bottom: 5px;
	}

	.text:last-child {
		margin-bottom: 0;
	}

	.caption {
		font-weight: 700;
	}
</style>
