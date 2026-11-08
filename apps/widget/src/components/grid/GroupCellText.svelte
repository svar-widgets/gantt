<script lang="ts">
	import { getContext } from "svelte";
	import { Avatar } from "@svar-ui/svelte-core";
	import type { IUser } from "@svar-ui/svelte-core";
	import type { ILocale } from "@svar-ui/lib-dom";
	import type { ITask, TID } from "@svar-ui/gantt-store";
	import type { IInnerApi } from "../../types";

	type Props = {
		row: ITask;
	};

	let { row }: Props = $props();
	const _ = getContext<ILocale>("wx-i18n").getGroup("gantt");

	const api = getContext<IInnerApi>("gantt-store");
	let { groupBy, resources } = api.getReactiveState();

	const resourceData = $derived.by(() => {
		if ($groupBy?.field === "resource") {
			let value = row.$groupValue;
			if (!Array.isArray(value)) value = [value];
			return value.map((id: TID) => $resources!.byId(id)).filter(Boolean);
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
			<Avatar value={resourceData as IUser[]} size={28}></Avatar>
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
