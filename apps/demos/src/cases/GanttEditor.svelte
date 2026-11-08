<script lang="ts">
	import { getData } from "../data";
	import { Gantt, Editor } from "@svar-ui/svelte-gantt";
	import type { IDemoProps } from "../types";
	import type { IApi } from "@svar-ui/svelte-gantt";

	let { skinSettings }: IDemoProps = $props();

	const data = getData();
	let api = $state<IApi>();

	function init(ganttApi: IApi) {
		api = ganttApi;
		// show Editor on "add-task" action
		api!.on("add-task", ({ id }) => {
			api!.exec("show-editor", { id: id! });
		});
	}
</script>

<Gantt
	{init}
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
/>
<Editor {api} />
