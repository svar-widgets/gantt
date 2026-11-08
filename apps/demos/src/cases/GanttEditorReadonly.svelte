<script lang="ts">
	import { getData } from "../data";
	import { Gantt, Editor } from "@svar-ui/svelte-gantt";
	import type { IDemoProps } from "../types";
	import type { IApi } from "@svar-ui/svelte-gantt";

	let { skinSettings }: IDemoProps = $props();

	const data = getData();
	let api = $state<IApi>();
</script>

<Gantt
	bind:this={api}
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
/>
<Editor {api} readonly topBar={true} />
