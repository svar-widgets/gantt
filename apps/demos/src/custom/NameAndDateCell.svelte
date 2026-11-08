<script lang="ts">
	import type { ICellProps } from "@svar-ui/svelte-grid";

	let { row }: ICellProps = $props();

	const date = $derived(row.start.toLocaleDateString());
</script>

<div class="text">{row.text}</div>
<div class="date">{date}</div>

<style>
	.text,
	.date {
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}
	.date {
		color: #5f5f5f;
		font-size: 12px;
	}
</style>
