<script>
	import { getContext } from "svelte";
	import { Avatar } from "@svar-ui/svelte-core";

	const { row } = $props();

	const api = getContext("gantt-store");
	let { assignments } = api.getReactiveState();

	const assigned = $derived.by(() => {
		$assignments;
		return api.getTaskResources(row.$id || row.id);
	});
</script>

{#key assigned}
	<div class="wx-avatar">
		<Avatar value={assigned} size={28}></Avatar>
	</div>
{/key}

<style>
	.wx-avatar {
		margin: 0 4px 0 0;
		width: 100%;
	}
</style>
