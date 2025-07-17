<script>
	import { getData } from "../data";
	import { Gantt, Editor, defaultEditorItems } from "../../src";

	let { skinSettings } = $props();

	const data = getData();
	let api = $state();

	const items = defaultEditorItems.map(ed => ({
		...ed,
		...(ed.comp === "text" && { required: true }),
		...(ed.comp === "counter" && {
			validation: v => v <= 50,
			validationMessage: "Task duration should not exceed 50 days",
		}),
	}));
</script>

<Gantt
	bind:this={api}
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
/>
<Editor {api} {items} autoSave={false} />
