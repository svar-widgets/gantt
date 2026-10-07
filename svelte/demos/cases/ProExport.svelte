<script>
	import { subDays } from "date-fns";
	import { getData, resources, assignments } from "../data";
	import { Gantt, version } from "../../src";
	import { Toolbar, registerToolbarItem } from "@svar-ui/svelte-toolbar";
	import { Switch, RichSelect, Segmented } from "@svar-ui/svelte-core";

	registerToolbarItem("switch", Switch);
	registerToolbarItem("segmented", Segmented);
	registerToolbarItem("richselect", RichSelect);

	let { skinSettings } = $props();

	const data = getData(null, {
		splitTasks: true,
		baselines: true,
		constraints: true,
		deadlines: true,
	});

	let size = $state("auto");
	let fit = $state(true);
	let api = $state();
	let config = $state("basic");
	let tasks = $state(data.tasks);

	const items = $derived([
		{ text: "Page size" },
		{
			id: "size",
			comp: "richselect",
			css: "rselect",
			value: size,
			options: [
				{ id: "auto", label: "Auto" },
				{ id: "a4-landscape", label: "A4 Landscape" },
				{ id: "a4", label: "A4 Portrait" },
				{ id: "a3-landscape", label: "A3 Landscape" },
				{ id: "a3", label: "A3 Portrait" },
			],
		},
		{ text: "Fit to page" },
		{
			id: "fit",
			comp: "switch",
			value: fit,
		},
		{
			id: "export-pdf",
			comp: "button",
			text: "To PDF",
		},
		{
			id: "export-png",
			comp: "button",
			text: "To PNG",
		},
		{ comp: "separator" },
		{
			id: "export-xlsx",
			comp: "button",
			text: "To XLSX",
		},
		{
			id: "export-xlsx-chart",
			comp: "button",
			text: "To XLSX with Chart",
		},
		{
			id: "export-mspx",
			comp: "button",
			text: "To MS Project (XML)",
		},
		{ comp: "spacer" },
		{
			id: "config",
			comp: "segmented",
			value: "basic",
			options: [
				{ id: "basic", label: "Basic" },
				{ id: "advanced", label: "Advanced" },
			],
		},
	]);

	const markers = [
		{
			start: new Date(2026, 3, 8),
			text: "Approval of strategy",
			css: "myMarker",
		},
	];

	const calendar = true;

	function handleClick({ item }) {
		const parts = item.id.split("-");
		if (parts[0] === "export") {
			if (parts[1] === "xlsx") {
				exportExcel(parts[2] === "chart");
			} else {
				exportOthers(parts[1]);
			}
		}
	}

	const url = "https://export.svar.dev/gantt/" + version;
	function exportExcel(visual) {
		api.exec("export-data", {
			url,
			format: "xlsx",
			excel: {
				columns: visual
					? [
							{
								id: "text",
								header: "Task name",
								width: 200,
							},
							{
								id: "deadline",
								header: "Deadline",
								width: 110,
								type: "date",
							},
							{
								id: "constraint_type",
								header: "Constraint",
								width: 110,
								type: "string",
							},
							{
								id: "constraint_date",
								header: "Constraint date",
								width: 130,
								type: "date",
							},
						]
					: [
							{ id: "id", header: "ID", width: 60 },
							{ id: "text", header: "Task name", width: 200 },
							{
								id: "start",
								header: "Start",
								width: 110,
								type: "date",
							},
							{
								id: "end",
								header: "End",
								width: 110,
								type: "date",
							},
							{
								id: "duration",
								header: "Duration",
								width: 80,
								type: "number",
							},
							{
								id: "deadline",
								header: "Deadline",
								width: 110,
								type: "date",
							},
							{
								id: "constraint_type",
								header: "Constraint",
								width: 110,
								type: "string",
							},
							{
								id: "constraint_date",
								header: "Constraint date",
								width: 130,
								type: "date",
							},
						],
				sheetNames: ["Tasks", "Links"],
				dateFormat: "yyyy-mmm-dd",
				visual,
			},
		});
	}
	function exportOthers(format) {
		const parts = size.split("-");
		const props = {
			size: parts[0],
			landscape: parts[1] === "landscape",
			fitSize: fit && size != "auto",
			styles: ".wx-gantt .myMarker{ background-color: rgba(255, 84, 84, 0.77);",
		};
		api.exec("export-data", {
			url,
			format,
			pdf: props,
			png: props,
			ganttConfig: {
				cellWidth: 30,
			},
		});
	}

	function applyConfigTasks(config) {
		const serialized = api.serialize();
		return serialized.map(t => {
			if (t.id !== 22) return t;
			if (config === "advanced") {
				const copy = { ...t };
				delete copy.start;
				return copy;
			}
			if (!t.start && t.end && t.duration) {
				return {
					...t,
					start: subDays(t.end, t.duration),
				};
			}
			return t;
		});
	}

	function handleChange({ item, value }) {
		if (item.id === "size") size = value;
		else if (item.id === "fit") fit = value;
		else if (item.id === "config") {
			tasks = applyConfigTasks(value);
			config = value;
		}
	}
</script>

<Toolbar {items} onclick={handleClick} onchange={handleChange} />
<div class="gtcell">
	{#if config === "basic"}
		<Gantt
			bind:this={api}
			{...skinSettings}
			{tasks}
			links={data.links}
			scales={data.scales}
		/>
	{:else}
		<Gantt
			bind:this={api}
			baselines={true}
			splitTasks={true}
			unscheduledTasks={true}
			deadlines={true}
			schedule={{ auto: true }}
			{markers}
			{calendar}
			{...skinSettings}
			{tasks}
			links={data.links}
			scales={data.scales}
			{resources}
			{assignments}
		/>
	{/if}
</div>

<style>
	:global(.rselect) {
		width: 150px;
	}
	:global(.wx-gantt .myMarker) {
		background-color: rgba(255, 84, 84, 0.77);
	}
	.gtcell {
		position: relative;
		height: calc(100% - 48px);
		border-top: var(--wx-gantt-border);
	}
</style>
