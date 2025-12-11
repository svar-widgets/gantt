<script>
	import { getData } from "../data";
	import { Gantt, Editor } from "../../src";
	import { Calendar } from "../../../store/src";

	let { skinSettings } = $props();

	const { tasks, links, scales } = getData("calendar");
	const calendar = new Calendar({
		weekHours: {
			monday: 8,
			tuesday: 8,
			wednesday: 8,
			thursday: 8,
			friday: 8,
			saturday: 0,
			sunday: 0,
		},
	});

	let api = $state();
</script>

<Gantt
	{...skinSettings}
	bind:this={api}
	{calendar}
	{tasks}
	{links}
	{scales}
	cellWidth={60}
/>
<Editor {api} />
