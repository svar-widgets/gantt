<script>
	import { format } from "date-fns";
	let { data } = $props();
	const mask = "yyyy.MM.dd";
	const constraintLabels = {
		snet: "Start no earlier than",
		snlt: "Start no later than",
		fnet: "Finish no earlier than",
		fnlt: "Finish no later than",
		mso: "Must start on",
		mfo: "Must finish on",
	};

	const task = $derived(data?.task);
	const constraint = $derived(task?.constraint);
	const segmentIndex = $derived(data?.segmentIndex);
	const isSegment = $derived(task?.segments && segmentIndex != null);
	const values = $derived(isSegment ? task.segments[segmentIndex] : task);
</script>

{#if task}
	<div class="data">
		<div class="text">
			<span class="caption">{task.type}:</span>
			{task.text}
		</div>
		{#if isSegment}
			<div class="text">
				<span class="caption">segment:</span>
				{values?.text || ""}
			</div>
		{/if}
		{#if values?.start}
			<div class="text">
				<span class="caption">start:</span>
				{format(values.start, mask)}
			</div>
		{/if}
		{#if values?.end}
			<div class="text">
				<span class="caption">end:</span>
				{format(values.end, mask)}
			</div>
		{/if}
		{#if constraint?.type}
			<div class="text">
				<span class="caption">constraint:</span>
				<span class="plain">
					{constraintLabels[constraint.type] || constraint.type}
					{constraint.date ? format(constraint.date, mask) : ""}
				</span>
			</div>
			{#if data.violated}
				<div class="text violated">violated</div>
			{/if}
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

	.plain {
		text-transform: none;
	}

	.violated {
		color: var(--wx-gantt-constraint-violation-color);
	}
</style>
