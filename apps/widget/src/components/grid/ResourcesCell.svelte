<script lang="ts">
	import { getContext } from "svelte";
	import { Avatar } from "@svar-ui/svelte-core";
	import type { IUser } from "@svar-ui/svelte-core";
	import type { ITask } from "@svar-ui/gantt-store";
	import type { IInnerApi } from "../../types";

	type Props = {
		row: ITask;
	};

	const { row }: Props = $props();

	const api = getContext<IInnerApi>("gantt-store");
	let { assignments } = api.getReactiveState();

	const assigned = $derived.by(() => {
		void $assignments;
		return api.getTaskResources(row.$id || row.id);
	});
</script>

{#key assigned}
	<div class="wx-avatar">
		<Avatar value={assigned as IUser[]} size={28}></Avatar>
	</div>
{/key}

<style>
	.wx-avatar {
		margin: 0 4px 0 0;
		width: 100%;
	}
</style>
