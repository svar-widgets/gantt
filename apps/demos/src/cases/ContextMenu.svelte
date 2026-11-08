<script lang="ts">
	import { getData } from "../data";
	import { Gantt, ContextMenu, Editor } from "@svar-ui/svelte-gantt";
	import type { IDemoProps } from "../types";
	import type { IApi } from "@svar-ui/svelte-gantt";

	let { skinSettings }: IDemoProps = $props();
	let api = $state<IApi>();
	const data = getData();
</script>

<ContextMenu {api}>
	<Gantt
		bind:this={api}
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
		zoom
	/>
</ContextMenu>
<Editor {api} />
