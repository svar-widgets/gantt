<script lang="ts">
	import { Toolbar } from "@svar-ui/svelte-gantt";
	import type { IApi } from "@svar-ui/svelte-gantt";

	type Props = {
		api?: IApi;
	};

	let { api }: Props = $props();
</script>

<Toolbar {api} />
