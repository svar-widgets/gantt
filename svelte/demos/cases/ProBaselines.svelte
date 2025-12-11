<script>
	import { getData } from "../data";
	import { Gantt, Editor, getEditorItems } from "../../src";

	let { skinSettings } = $props();

	const data = getData("day", { baselines: true });

	let api = $state();

	// add fields for editing baseline dates
	const items = getEditorItems().flatMap(item =>
		item.key === "links"
			? [
					...[
						{
							key: "base_start",
							comp: "date",
							label: "Baseline start",
						},
						{
							key: "base_end",
							comp: "date",
							label: "Baseline end",
						},
						{
							key: "base_duration",
							comp: "counter",
							hidden: true,
						},
					],
					item,
				]
			: item
	);
</script>

<Gantt
	bind:this={api}
	{...skinSettings}
	baselines={true}
	cellHeight={45}
	tasks={data.tasks}
	links={data.links}
/>
<Editor {api} {items} />
