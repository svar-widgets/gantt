<script>
	import { format } from "date-fns";
	let { data, segmentIndex } = $props();
	const mask = "yyyy.MM.dd";

	const isSegment = $derived(
		data?.segments && typeof segmentIndex === "number"
	);
	const values = $derived(isSegment ? data.segments[segmentIndex] : data);
</script>

{#if data}
	<div class="data">
		<div class="text">
			<span class="caption">{data.type}:</span>
			{data.text}
		</div>
		{#if isSegment}
			<div class="text">
				<span class="caption">segment:</span>
				{values?.text || ""}
			</div>
		{/if}
		<div class="text">
			<span class="caption">start:</span>
			{format(values.start, mask)}
		</div>
		{#if values.end}
			<div class="text">
				<span class="caption">end:</span>
				{format(values.end, mask)}
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
