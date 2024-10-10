<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu, defaultMenuOptions } from "../../src/";

	import { getContext } from "svelte";
	const helpers = getContext("wx-helpers");

	export let skinSettings;
	let api;
	const data = getData();

	let options;
	const ids = ["cut-task", "copy-task", "paste-task", "delete-task"];
	let arr = [{ id: "add-task:after", text: " Add below", icon: "wxi-plus" }];
	arr = arr.concat(defaultMenuOptions.filter(op => ids.indexOf(op.id) >= 0));
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

	function onClick(ev) {
		const { context, action } = ev.detail;
		if (!action.handler)
			helpers.showNotice({
				text: `'${action.id}' clicked for the '${context.id}' task`,
			});
	}
</script>

<ContextMenu {api} {options} on:click={onClick}>
	<Gantt
		bind:api
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
	/>
</ContextMenu>
