<script lang="ts">
	import { Combo } from "@svar-ui/svelte-core";
	import AvatarCell from "./AvatarCell.svelte";
	import type { TUser } from "../data";
	import type { TID } from "@svar-ui/svelte-gantt";

	type Props = {
		value?: TID;
		options: TUser[];
		onchange?: (ev: { value: TID }) => void;
	};

	let { value, options, onchange }: Props = $props();
</script>

<Combo {options} {value} {onchange} clear placeholder="Assign to the person">
	{#snippet children({ option })}
		<AvatarCell user={option} />
	{/snippet}
</Combo>
