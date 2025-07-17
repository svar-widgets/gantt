<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu, Editor, defaultEditorItems } from "../../src";
	import { RadioButtonGroup } from "wx-svelte-core";

	let { skinSettings } = $props();

	let { tasks, links } = $state(getData());
	const scalesMap = {
		hour: getData("hour").scales,
		day: getData().scales,
	};

	const options = [
		{ id: "hour", label: "Hour" },
		{ id: "day", label: "Day" },
	];

	let durationUnit = $state("hour");
	let scales = $state(scalesMap["hour"]);

	let api = $state();

	let items = $derived(
		defaultEditorItems.map(ed => ({
			...ed,
			...(ed.comp === "date" && {
				config: { time: durationUnit === "hour" },
			}),
		}))
	);

	function handleUnitChange({ value }) {
		const sTasks = api.serialize().map(task => {
			if (task.start && task.end) {
				const ms = 1000 * 60 * 60 * (value === "day" ? 24 : 1);
				const duration = Math.floor((task.end - task.start) / ms);
				return { ...task, duration };
			}
			return task;
		});
		tasks = sTasks;
		durationUnit = value;
		scales = scalesMap[value];
	}
</script>

<div class="rows">
	<div class="bar">
		<div class="label">Gantt duration unit</div>
		<RadioButtonGroup
			{options}
			value={durationUnit}
			type="inline"
			onchange={handleUnitChange}
		/>
	</div>

	<div class="gtcell">
		<ContextMenu {api}>
			<Gantt
				bind:this={api}
				{...skinSettings}
				{tasks}
				{links}
				{scales}
				cellWidth={40}
				{durationUnit}
				lengthUnit={"hour"}
			/>
		</ContextMenu>
		<Editor {api} {items} />
	</div>
</div>

<style>
	.rows {
		display: flex;
		flex-direction: column;
		background: var(--wx-background);
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.bar {
		padding: 10px;
		display: flex;
		gap: 40px;
	}
	.bar div {
		display: flex;
	}
	.gtcell {
		position: relative;
		height: 100%;
		border-top: var(--wx-gantt-border);
		overflow: hidden;
	}
	.label {
		padding-right: 20px;
		font-size: var(--wx-font-size);
		font-weight: var(--wx-label-font-weight);
	}
</style>
