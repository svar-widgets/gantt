<script lang="ts">
	import { getData, complexScales } from "../data";
	import { Gantt } from "@svar-ui/svelte-gantt";
	import type { IDemoProps } from "../types";

	let { skinSettings }: IDemoProps = $props();

	const data = getData();
</script>

<Gantt
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={complexScales}
	start={new Date(2026, 3, 1)}
	end={new Date(2026, 4, 12)}
	cellWidth={60}
/>
