<script>
	import Willow from "../themes/Willow.svelte";
	import WillowDark from "../themes/WillowDark.svelte";
	import Gantt from "./Gantt.svelte";
	const { skin, config = {} } = $props();
</script>

{#if skin === "willow-dark"}
	<WillowDark>
		<Gantt {...config} />
	</WillowDark>
{:else}
	<Willow>
		<Gantt {...config} />
	</Willow>
{/if}
