<script>
	import {
		Gantt,
		ContextMenu,
		Editor,
		defaultEditorItems,
		defaultColumns,
	} from "../../src";
	import { format } from "date-fns";
	import { getData } from "../data";

	let { skinSettings } = $props();

	const { tasks, links, scales } = getData("hour");

	let api = $state();

	const items = defaultEditorItems.map(ed => ({
		...ed,
		...(ed.comp === "date" && { config: { time: true } }),
	}));

	const columns = defaultColumns.map(col => ({
		...col,
		...(col.id === "start" && {
			template: d => format(d, "MMM d, HH:mm"),
			width: 120,
		}),
	}));

	function highlightTime(date, unit) {
		const h = date.getHours();
		if ((unit === "hour" && h < 8) || h > 21) return "wx-weekend";
		return "";
	}
</script>

<ContextMenu {api}>
	<Gantt
		bind:this={api}
		{...skinSettings}
		{tasks}
		{links}
		{columns}
		{scales}
		cellWidth={40}
		durationUnit={"hour"}
		lengthUnit={"minute"}
		{highlightTime}
	/>
</ContextMenu>
<Editor {api} {items} />
