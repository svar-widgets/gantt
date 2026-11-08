<script lang="ts">
	import {
		Gantt,
		ContextMenu,
		Editor,
		getEditorItems,
		defaultColumns,
	} from "@svar-ui/svelte-gantt";
	import { format } from "date-fns";
	import { getData } from "../data";
	import type { IDemoProps } from "../types";
	import type { IApi } from "@svar-ui/svelte-gantt";

	let { skinSettings }: IDemoProps = $props();

	const { tasks, links, scales } = getData("hour");

	let api = $state<IApi>();

	const items = getEditorItems().map(ed => ({
		...ed,
		...(ed.comp === "date" && { config: { time: true } }),
	}));

	const columns = defaultColumns.map(col => ({
		...col,
		...(col.id === "start" && {
			template: (d: Date) => format(d, "MMM d, HH:mm"),
			width: 120,
		}),
	}));

	function highlightTime(date: Date, unit: string) {
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
