<script>
	import { Combo } from "@svar-ui/svelte-core";
	import AvatarCell from "./AvatarCell.svelte";

	let { value, options, onchange } = $props();
</script>

<Combo {options} {value} {onchange} clear placeholder="Assign to the person">
	{#snippet children({ option })}
		<AvatarCell user={option} />
	{/snippet}
</Combo>
