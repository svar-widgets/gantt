<script>
	import { Toolbar } from "wx-svelte-gantt";
	let { api } = $props();
</script>

<Toolbar {api} />
