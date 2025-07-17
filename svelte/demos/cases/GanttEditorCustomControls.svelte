<script>
	import {
		Gantt,
		Editor,
		defaultEditorItems,
		registerEditorItem,
		defaultTaskTypes,
	} from "../../src";
	import { RadioButtonGroup } from "wx-svelte-core";
	import UsersCustomCombo from "../custom/UsersCustomCombo.svelte";
	import AvatarCell from "../custom/AvatarCell.svelte";
	import { getData, users } from "../data";

	let { skinSettings } = $props();

	registerEditorItem("radio", RadioButtonGroup);
	registerEditorItem("custom-combo", UsersCustomCombo);

	const items = defaultEditorItems.map(item => ({ ...item }));
	items.splice(
		defaultEditorItems.findIndex(d => d.key === "type"),
		1,
		{
			key: "type",
			comp: "radio",
			label: "Type",
			options: defaultTaskTypes.map(o => ({
				...o,
				value: o.id,
			})),
			config: {
				type: "inline",
			},
		},
		{
			key: "assigned",
			comp: "custom-combo",
			label: "Assigned",
			options: users,
		}
	);

	items.forEach(d => {
		if (d.comp === "date") {
			d.config = {
				time: true,
			};
		}
	});

	const data = getData();
	let api = $state();

	const columns = [
		{ id: "text", header: "Task name", width: 220 },
		{ id: "assigned", header: "Assigned", width: 160, cell: AvatarCell },
		{ id: "start", header: "Start Date", width: 100 },
	];
</script>

<Gantt
	bind:this={api}
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
	lengthUnit="hour"
	{columns}
/>
<Editor {api} {items} />
