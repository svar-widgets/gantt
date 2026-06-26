<script>
	import { getContext } from "svelte";

	const _ = getContext("wx-i18n").getGroup("gantt");
	const api = getContext("gantt-store");
	const { groupBy } = api.getReactiveState();
	let { row } = $props();
	const priorityMap = { 1: "low", 2: "medium", 3: "high" };

	const isGroup = $derived($groupBy?.field && row.$group);

	const groupValue = $derived.by(() => {
		if (!isGroup) return undefined;
		let value = row.$groupValue;
		if (value && $groupBy.field === "priority") {
			value = priorityMap[value];
		}
		return value;
	});
</script>

{#if isGroup}
	{#if row.$groupValue === "$ungrouped"}
		{_("Ungrouped")}
	{:else}
		<div class="group">
			{$groupBy.field}: {groupValue}
		</div>
	{/if}
{:else}
	{row.text}
{/if}

<style>
	.group {
		text-transform: capitalize;
	}
</style>
