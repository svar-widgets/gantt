<script>
	import { getData } from "../data";
	import { Gantt, Editor, ContextMenu } from "../../src";
	import { DatePicker, Field, Checkbox } from "@wx/svelte-core";
	import { Calendar } from "@wx/gantt-store";

	const data = getData("calendar", {
		splitTasks: true,
		unscheduledTasks: true,
	});

	let { skinSettings } = $props();
	let api = $state();
	let tasks = $state(data.tasks);

	const calendar = new Calendar();
	let projectStart = $state(new Date(2026, 3, 2));
	let projectEnd = $state(new Date(2026, 4, 20));

	let criticalPath = $state({ type: "flexible" });
	let baselines = $state(true);
	let unscheduledTasks = $state(true);
	let splitTasks = $state(true);

	let cellHeight = $state(44);

	const markers = $derived(
		projectStart
			? [
					{
						text: "Start",
						start: projectStart,
					},
				]
			: []
	);

	function onCriticalPathChange() {
		criticalPath =
			criticalPath?.type === "flexible" ? null : { type: "flexible" };
	}

	function onBaselinesChange(ev) {
		baselines = ev.value;
		cellHeight = baselines ? 44 : 38;
	}

	function onSplitChange() {
		tasks = api.serialize().map(t => {
			//recalculate duration
			if (t.segments) delete t.duration;
			return t;
		});
	}

	//calculate baselines after summary dates are set
	function init(api) {
		tasks = api.serialize().map(t => {
			return {
				...t,
				base_start: t.start,
				base_end: t.end,
				base_duration: t.segments ? 0 : t.duration,
			};
		});
	}

	/*data.links.push({
		source: 2,
		target: 3,
		type: "e2s",
		id: 100,
	});
	data.links.push({
		source: 30,
		target: 4,
		type: "e2s",
		id: 101,
	});*/
</script>

<div class="demo">
	<div class="bar">
		<Field label="Project start" position="left" width="250px">
			<DatePicker bind:value={projectStart} />
		</Field>
		<Field label="Project end" position="left" width="250px">
			<DatePicker bind:value={projectEnd} />
		</Field>
		<Checkbox
			value={!!criticalPath}
			label="Critical path"
			onchange={onCriticalPathChange}
		/>
		<Checkbox
			bind:value={baselines}
			label="Baselines"
			onchange={onBaselinesChange}
		/>
		<Checkbox bind:value={unscheduledTasks} label="Unscheduled tasks" />
		<Checkbox
			bind:value={splitTasks}
			label="Split tasks"
			onchange={onSplitChange}
		/>
	</div>
	<div class="gantt">
		<Editor {api} />
		<ContextMenu {api}>
			<Gantt
				{init}
				{...skinSettings}
				cellWidth={50}
				{cellHeight}
				bind:this={api}
				{tasks}
				links={data.links}
				scales={data.scales}
				{calendar}
				schedule={{ auto: true }}
				{criticalPath}
				{projectStart}
				{projectEnd}
				{markers}
				{baselines}
				{unscheduledTasks}
				{splitTasks}
			/>
		</ContextMenu>
	</div>
</div>

<style>
	.demo {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.bar {
		display: flex;
		align-items: center;
		padding: 12px;
		gap: 20px;
		border-bottom: var(--wx-gantt-border);
	}

	.gantt {
		position: relative;
		height: 100%;
		overflow: hidden;
	}
	:global(.bar .wx-field.wx-left) {
		margin-bottom: 0px;
	}
</style>
