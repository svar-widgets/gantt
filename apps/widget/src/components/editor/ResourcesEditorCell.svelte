<script lang="ts">
	import { Avatar } from "@svar-ui/svelte-core";
	import type { IUser } from "@svar-ui/svelte-core";
	import type { IResource } from "@svar-ui/gantt-store";

	type Props = {
		row?: IResource;
		data?: IResource;
	};

	const { row, data }: Props = $props();

	const item = $derived(data || row);
</script>

{#if item}
	<div class="wx-avatar">
		<Avatar value={item as IUser} size={40}></Avatar>
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
