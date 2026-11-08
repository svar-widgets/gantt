<script lang="ts">
	import { getData } from "../data";
	import { Gantt } from "@svar-ui/svelte-gantt";
	import type { IDemoProps } from "../types";

	let { skinSettings }: IDemoProps = $props();

	const data = getData();
</script>

<Gantt
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
	columns={false}
	cellWidth={60}
/>
