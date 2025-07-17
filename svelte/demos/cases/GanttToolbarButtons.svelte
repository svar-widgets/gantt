<script>
	import { getContext } from "svelte";
	import { getData } from "../data";
	import { Gantt, Toolbar, Editor, defaultToolbarButtons } from "../../src/";

	const helpers = getContext("wx-helpers");
	let { skinSettings } = $props();
	let api = $state();

	const data = getData();

	//remove indentation buttons
	const items = defaultToolbarButtons.filter(b => {
		return b.id?.indexOf("indent") === -1;
	});

	//add custom button
	items.push({
		id: "my-action",
		comp: "icon",
		icon: "wxi-cat",
		handler: actionHandler,
	});

	function actionHandler() {
		helpers.showNotice({ text: "'My action' clicked" });
	}
</script>

<Toolbar {api} {items} />
<div class="gtcell">
	<Gantt
		{...skinSettings}
		bind:this={api}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
	/>
	<Editor {api} />
</div>

<style>
	.gtcell {
		height: calc(100% - 50px);
		border-top: var(--wx-gantt-border);
	}
</style>
