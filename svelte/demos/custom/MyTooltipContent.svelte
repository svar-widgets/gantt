<script>
	import { format } from "date-fns";
	let { data } = $props();

	const mask = "yyyy.MM.dd";
</script>

{#if data}
	<div class="data">
		<div class="text">
			<span class="caption">{data.type}:</span>
			{data.text}
		</div>
		<div class="text">
			<span class="caption">start:</span>
			{format(data.start, mask)}
		</div>
		{#if data.end}
			<div class="text">
				<span class="caption">end:</span>
				{format(data.end, mask)}
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
