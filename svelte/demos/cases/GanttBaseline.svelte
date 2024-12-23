<script>
	import { getBaselinesData } from "../data";
	import { Gantt, defaultEditorShape } from "../../src/";

	let { skinSettings } = $props();

	const data = getBaselinesData();

	const editorShape = defaultEditorShape.flatMap(item =>
		item.key === "links"
			? [
					...[
						{
							key: "base_start",
							type: "date",
							label: "Baseline start",
						},
						{
							key: "base_end",
							type: "date",
							label: "Baseline end",
						},
					],
					item,
				]
			: item
	);
</script>

<Gantt
	{...skinSettings}
	baselines={true}
	cellHeight={45}
	tasks={data.tasks}
	links={data.links}
	{editorShape}
/>
