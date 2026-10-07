<script>
	import { addDays, format, isSameDay } from "date-fns";

	let { data } = $props();

	const histogram = $derived(data?.histogram);
	const percent = $derived(
		histogram?.capacity
			? Math.round((histogram.hours / histogram.capacity) * 100)
			: 0
	);
	const range = $derived.by(() => {
		if (!histogram?.start || !histogram?.end) return "";

		const start = histogram.start;
		const end = addDays(histogram.end, -1);
		const mask = "MMM d, yyyy";

		return isSameDay(start, end)
			? format(start, mask)
			: `${format(start, mask)} - ${format(end, mask)}`;
	});
</script>

{#if histogram}
	<div class="data">
		<div class="text">
			<span class="caption">Name:</span>
			{histogram.resource?.name}
		</div>
		<div class="text">
			<span class="caption">Range:</span>
			{range}
		</div>
		<div class="text">
			<span class="caption">Load:</span>
			{histogram.hours}h
		</div>
		<div class="text">
			<span class="caption">Capacity:</span>
			{histogram.capacity}h
		</div>
		<div class="text">
			<span class="caption">Utilization:</span>
			{percent}%
		</div>
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
		margin-bottom: 5px;
	}

	.text:last-child {
		margin-bottom: 0;
	}

	.caption {
		font-weight: 700;
	}
</style>
