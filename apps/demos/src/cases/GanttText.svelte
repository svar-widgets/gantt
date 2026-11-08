<script lang="ts">
	import { getData } from "../data";
	import { Gantt } from "@svar-ui/svelte-gantt";
	import MyTaskContent from "../custom/MyTaskContent.svelte";
	import type { IDemoProps } from "../types";
	import type { IApi, TID } from "@svar-ui/svelte-gantt";

	let { skinSettings }: IDemoProps = $props();

	const data = getData();
	let api = $state<IApi>();

	function doClick(ev: { id: TID; clicked: boolean }) {
		api!.exec("update-task", {
			id: ev.id,
			task: {
				clicked: ev.clicked,
			},
		});
	}
</script>

<Gantt
	{...skinSettings}
	bind:this={api}
	oncustomclick={doClick}
	taskTemplate={MyTaskContent}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
/>
