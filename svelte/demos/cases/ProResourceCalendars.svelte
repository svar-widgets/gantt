<script>
	import { getData } from "../data";
	import { Gantt, ResourceLoad, Editor } from "../../src";
	import { Field, Switch } from "@svar-ui/svelte-core";

	let { skinSettings } = $props();

	const data = getData("calendars");

	const taskCalendar = {
		id: "prototyping",
		css: "prototyping",
		weekHours: {
			saturday: 8,
			sunday: 8,
			monday: 0,
			tuesday: 0,
			wednesday: 0,
			thursday: 0,
			friday: 0,
		},
	};

	const calendars = [...data.calendars, taskCalendar];

	const tasks = data.tasks.map(t => {
		const copy = { ...t };
		delete copy.calendar;
		if (t.id === 13) copy.calendar = "prototyping";
		return copy;
	});

	let api = $state();
	let enabled = $state(true);

	const groupBy = $derived(enabled ? { field: "resource" } : null);

	console.log(data.resources);
</script>

<div class="demo">
	<div class="bar">
		<Field label="Group by resource" position="left">
			<Switch bind:value={enabled}></Switch>
		</Field>
		<div class="labels">
			Wednesday off
			<div class="cell wednesday-off-resource"></div>
			Weekends only
			<div class="cell weekends-only-resource"></div>
			Part time
			<div class="cell part-time-resource"></div>
			Weekends only (task)
			<div class="cell prototyping"></div>
		</div>
	</div>

	<div class="main">
		<div class="gantt">
			<Gantt
				{...skinSettings}
				bind:this={api}
				{tasks}
				columns={data.columns}
				resources={data.resources}
				assignments={data.assignments}
				{calendars}
				calendar={"default"}
				links={data.links}
				{groupBy}
				scales={data.scales}
				zoom
			/>
		</div>
		<div class="resource">
			<ResourceLoad {api} template={v => `${v.hours}h, ${v.percent}%`} />
		</div>
		<Editor {api} />
	</div>
</div>

<style>
	.demo {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.bar {
		padding-left: 12px;
		display: flex;
		align-items: center;
		border-bottom: var(--wx-gantt-border);
		& :global(.wx-field) {
			width: auto;
		}
		& :global(.wx-label) {
			width: auto !important;
			padding-top: 2px !important;
			white-space: nowrap;
		}
	}
	.main {
		width: 100%;
		height: calc(100% - 50px);
	}

	.gantt {
		height: 60%;
		border-bottom: 2px solid var(--wx-gantt-border-color);
	}
	.resource {
		height: 40%;
	}

	.demo :global(.weekends-only-resource) {
		background-color: #ffe7ea;
	}

	.demo :global(.wednesday-off-resource) {
		background-color: lavender;
	}
	.demo :global(.part-time-resource) {
		background-color: lightyellow;
	}

	:global(.wx-willow-dark-theme) .demo :global(.wednesday-off-resource) {
		background-color: #383650;
	}
	:global(.wx-willow-dark-theme) .demo :global(.weekends-only-resource) {
		background-color: #4a2f37;
	}
	:global(.wx-willow-dark-theme) .demo :global(.part-time-resource) {
		background-color: #45402a;
	}

	.demo :global(.prototyping) {
		background-color: #e6f9ea;
	}
	:global(.wx-willow-dark-theme) .demo :global(.prototyping) {
		background-color: #2e3f30;
	}
	.cell {
		width: 60px;
		height: 36px;
		border-radius: 3px;
		margin: 6px;
	}
	.labels {
		display: flex;
		align-items: center;
		padding-left: 20px;
		font-weight: 600;
	}
</style>
