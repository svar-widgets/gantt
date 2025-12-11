<script>
	import { HeaderMenu } from "@svar-ui/svelte-grid";

	let { children, columns = null, api } = $props();

	let tableAPI = $derived(api?.getTable());
</script>

<HeaderMenu api={tableAPI} {columns}>{@render children?.()}</HeaderMenu>
