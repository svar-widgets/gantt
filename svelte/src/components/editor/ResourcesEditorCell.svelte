<script>
	import { Avatar } from "@svar-ui/svelte-core";

	const { row, data } = $props();

	const item = $derived(data || row);
</script>

{#if item}
	<div class="wx-avatar">
		<Avatar value={item} size={40}></Avatar>
	</div>
	<div class="wx-text">
		<div class="wx-name">{item.name}</div>
		{#if item.role}
			<div class="wx-role">{item.role}</div>
		{/if}
	</div>
{/if}

<style>
	.wx-avatar {
		margin: 0 10px 0 0;
	}
	.wx-role {
		font-size: 12px;
	}
</style>
