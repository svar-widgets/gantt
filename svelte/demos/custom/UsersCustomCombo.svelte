<script>
	import { Combo } from "@svar-ui/svelte-core";
	import UserStub from "./UserStub.svelte";

	let { value, options, onchange } = $props();
</script>

<Combo {options} {value} {onchange} clear placeholder="Assign to the person">
	{#snippet children({ option })}
		<UserStub user={option} />
	{/snippet}
</Combo>
