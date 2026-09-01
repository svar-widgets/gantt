<script>
	import { Avatar } from "@svar-ui/svelte-core";

	let { data } = $props();
	const count = $derived(data.length);
</script>

{#key data}
	{#if Array.isArray(data)}
		<div class="wx-avatar-box">
			{#if count}
				<Avatar value={data} size={28}></Avatar>
			{/if}
		</div>
	{:else}
		<div class="wx-resource-option">
			<div>
				<Avatar value={data} size={28}></Avatar>
			</div>
			<div class="wx-name">{data.name}</div>
		</div>
	{/if}
{/key}

<style>
	.wx-avatar-box {
		display: flex;
		align-items: center;
		padding-left: calc(var(--wx-grid-cell-padding-x) - 9px);
	}
	.wx-resource-option {
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
	}
	.wx-name {
		margin-left: 4px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
