<script lang="ts">
	import { getData } from "../data";
	import {
		Gantt,
		ContextMenu,
		Editor,
		getEditorItems,
	} from "@svar-ui/svelte-gantt";
	import { RadioButtonGroup } from "@svar-ui/svelte-core";
	import type { IDemoProps } from "../types";
	import type {
		IApi,
		IScaleConfig,
		TDurationUnit,
		TID,
	} from "@svar-ui/svelte-gantt";

	let { skinSettings }: IDemoProps = $props();

	let { tasks, links } = $state(getData());
	const scalesMap: Record<TDurationUnit, IScaleConfig[]> = {
		hour: getData("hour").scales,
		day: getData().scales,
	};

	const options = [
		{ id: "day", label: "Day" },
		{ id: "hour", label: "Hour" },
	];

	let durationUnit = $state<TDurationUnit>("day");
	let scales = $state(scalesMap["day"]);

	let api = $state<IApi>();

	let items = $derived(
		getEditorItems().map(ed => ({
			...ed,
			...(ed.comp === "date" && {
				config: { time: durationUnit === "hour" },
			}),
		}))
	);

	function handleUnitChange(ev: { value: TID }) {
		const value = ev.value as TDurationUnit;
		const sTasks = api!.serialize()!.map(task => {
			if (task.start && task.end) {
				const ms = 1000 * 60 * 60 * (value === "day" ? 24 : 1);
				const duration = Math.floor((+task.end - +task.start) / ms);
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
