<script>
	import { getData } from "../data";
	import { Gantt, Editor, defaultEditorItems } from "../../src";

	let { skinSettings } = $props();

	const data = getData();
	let api = $state();

	const bottomBar = {
		items: [
			{ comp: "button", type: "secondary", text: "Close", id: "close" },
			{ comp: "spacer" },
			{ comp: "button", type: "danger", text: "Delete", id: "delete" },
			{ comp: "button", type: "primary", text: "Save", id: "save" },
		],
	};

	const keys = [
		"text",
		"type",
		"start",
		"end",
		"duration",
		"progress",
		"details",
	];
	const items = keys.map(key => ({
		...defaultEditorItems.find(op => op.key === key),
	}));
</script>

<Gantt
	bind:this={api}
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
/>
<Editor
	{api}
	{items}
	{bottomBar}
	topBar={false}
	placement={"modal"}
	autoSave={false}
/>
