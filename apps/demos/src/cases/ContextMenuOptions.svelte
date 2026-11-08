<script lang="ts">
	import { getData } from "../data";
	import {
		Gantt,
		ContextMenu,
		Editor,
		getMenuOptions,
	} from "@svar-ui/svelte-gantt";

	import { getContext } from "svelte";
	import type { IDemoHelpers, IDemoProps } from "../types";
	import type { IApi } from "@svar-ui/svelte-gantt";
	import type { IMenuOption, IMenuOptionClick } from "@svar-ui/svelte-menu";
	const helpers = getContext<IDemoHelpers>("wx-helpers");

	let { skinSettings }: IDemoProps = $props();
	let api = $state<IApi>();
	const data = getData();

	let options = $state<IMenuOption[]>();
	const ids = ["cut-task", "copy-task", "paste-task", "delete-task"];
	let arr: IMenuOption[] = [
		{ id: "add-task:after", text: " Add below", icon: "wxi-plus" },
	];
	arr = arr.concat(
		getMenuOptions().filter(op => ids.indexOf(op.id as string) >= 0)
	);
	arr.push({
		id: "my-action",
		text: "My action",
		icon: "wxi-empty",
		handler: actionHandler,
	});

	options = arr;
	function actionHandler() {
		helpers.showNotice({ text: "'My action' clicked" });
	}

	function onClick({ context, action }: IMenuOptionClick) {
		if (!action!.handler)
			helpers.showNotice({
				text: `'${action!.id}' clicked for the '${context.id}' task`,
			});
	}
</script>

<ContextMenu {api} {options} onclick={onClick}>
	<Gantt
		bind:this={api}
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
	/>
</ContextMenu>
<Editor {api} />
