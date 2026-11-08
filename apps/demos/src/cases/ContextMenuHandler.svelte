<script lang="ts">
	import { getData } from "../data";
	import { Gantt, ContextMenu, Editor } from "@svar-ui/svelte-gantt";
	import type { IDemoProps } from "../types";
	import type { IApi, ITask, TID } from "@svar-ui/svelte-gantt";
	import type { IMenuOption } from "@svar-ui/svelte-menu";

	let { skinSettings }: IDemoProps = $props();
	let api = $state<IApi>();
	const data = getData();

	// show menu for certain tasks
	function resolver(id: TID) {
		return (id as number) > 2;
	}

	// filter menu options
	function filter(option: IMenuOption, task: ITask) {
		const type = task.type;
		if (option.id) {
			const ids = option.id.toString().split(":");
			if (type == "milestone" && ids[0] == "add-task")
				return ids[1] != "child";
		}

		return true;
	}
</script>

<ContextMenu {api} {resolver} {filter}>
	<Gantt
		bind:this={api}
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
	/>
</ContextMenu>
<Editor {api} />
