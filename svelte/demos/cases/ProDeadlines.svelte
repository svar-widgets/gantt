<script>
	import { getData } from "../data";
	import { Gantt, Editor, Tooltip, getDefaultColumns } from "../../src";
	import DeadlineTaskContent from "../custom/DeadlineTaskContent.svelte";
	import MyTooltipContent from "../custom/MyTooltipContent.svelte";
	import DeadlineCell from "../custom/DeadlineCell.svelte";

	const { tasks, links, scales } = getData("day", { deadlines: true });
	let { skinSettings } = $props();
	let api = $state();

	const columns = getDefaultColumns();
	columns.splice(2, 0, {
		id: "deadline",
		header: "Deadline",
		align: "center",
		width: 110,
		cell: DeadlineCell,
	});
</script>

<Tooltip {api} content={MyTooltipContent}>
	<Gantt
		bind:this={api}
		{...skinSettings}
		{tasks}
		{links}
		{scales}
		{columns}
		gridWidth={560}
		taskTemplate={DeadlineTaskContent}
		deadlines
	/>
	<Editor {api} />
</Tooltip>
