<script lang="ts">
	import { getData } from "../data";
	import { Gantt, Tooltip } from "@svar-ui/svelte-gantt";
	import MyTooltipContent from "../custom/MyTooltipContent.svelte";
	import type { IDemoProps } from "../types";
	import type { IApi } from "@svar-ui/svelte-gantt";

	let { skinSettings }: IDemoProps = $props();

	const data = getData();
	let api = $state<IApi>();
</script>

<Tooltip {api} content={MyTooltipContent}>
	<Gantt
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
		bind:this={api}
	/>
</Tooltip>
