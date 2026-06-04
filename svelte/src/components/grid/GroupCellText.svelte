<script>
	import { getContext } from "svelte";
	import { Avatar } from "@svar-ui/svelte-core";

	let { row } = $props();
	const _ = getContext("wx-i18n").getGroup("gantt");

	const api = getContext("gantt-store");
	let { groupBy, resources } = api.getReactiveState();

	const resourceData = $derived.by(() => {
		if ($groupBy?.field === "resource") {
			let value = row.$groupValue;
			if (!Array.isArray(value)) value = [value];
			return value.map(id => $resources.byId(id)).filter(Boolean);
		}
		return null;
	});

	const ungroupLabel = $derived(
		$groupBy?.field == "resource" ? _("Unassigned") : _("Ungrouped")
	);
</script>

{#key row}
	<div class="wx-group-text">
		{#if row.$groupValue === "$ungrouped"}
			{ungroupLabel}
		{:else if resourceData?.length}
			<Avatar value={resourceData} size={28}></Avatar>
			{#if resourceData.length === 1}
				<span class="wx-name">
					{resourceData[0].name}
				</span>
			{/if}
		{:else}
			{row.text}
		{/if}
	</div>
{/key}

<style>
	.wx-group-text {
		display: flex;
		align-items: center;
		gap: 8px;
		& :global(.wx-avatar-root) {
			flex: 0 0 auto;
		}
	}
	.wx-group-text,
	.wx-name {
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}
</style>
