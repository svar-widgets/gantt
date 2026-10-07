<script>
	import { getData } from "../../demos/data";
	import { Gantt, ResourceLoad, Tooltip } from "../../src";
	import MyResourceHistogramTooltip from "../../demos/custom/MyResourceHistogramTooltip.svelte";
	import { Button, Willow } from "@svar-ui/svelte-core";

	const weekScales = [
		{ unit: "quarter", step: 1, format: "%F %Y" },
		{ unit: "week", step: 1, format: "Week %W" },
	];

	const histogramZoom = {
		level: 1,
		levels: [
			{
				minCellWidth: 50,
				maxCellWidth: 50,
				scales: weekScales,
			},
			{
				minCellWidth: 100,
				maxCellWidth: 100,
				scales: weekScales,
			},
		],
	};

	const data = getData("resource-histogram");

	const overflowResources = Array.from({ length: 12 }, (_, index) => ({
		id: `overflow-${index + 1}`,
		name: `Overflow resource ${index + 1}`,
		parent: "overflow-team",
		calendar: "standard",
	}));

	const calendars = [
		...data.calendars.map(calendar => ({
			...calendar,
			weekHours: { ...calendar.weekHours },
			rules: calendar.rules?.map(rule => ({ ...rule })),
		})),
		{
			id: "exception-only",
			weekHours: {
				monday: 0,
				tuesday: 0,
				wednesday: 0,
				thursday: 0,
				friday: 0,
				saturday: 0,
				sunday: 0,
			},
			rules: [
				{
					type: "date",
					date: "2026-04-08",
					hours: 12,
				},
			],
		},
	];

	const resources = [
		...data.resources.map(resource => ({ ...resource })),
		{
			id: "exception",
			name: "Exception-only",
			calendar: "exception-only",
		},
		{ id: "overflow-team", name: "Overflow team", open: true },
		...overflowResources,
	];

	const tasks = [
		...data.tasks.map(task => ({
			...task,
			start: task.start && new Date(task.start),
			end: task.end && new Date(task.end),
		})),
		{
			text: "Exceptional assignment",
			id: 35,
			type: "task",
			parent: 0,
			start: new Date(2026, 3, 8),
			end: new Date(2026, 3, 9),
		},
	];

	const assignments = [
		...data.assignments.map(assignment => ({ ...assignment })),
		{ id: 17, task: 35, resource: "exception" },
	];

	const links = data.links.map(link => ({ ...link }));

	let api = $state();

	function zoomScale(dir) {
		api?.exec("zoom-scale", { dir, ratio: 0.2, offset: 0 });
	}
</script>

<Willow>
	<div class="controls">
		<Button onclick={() => zoomScale(1)}>Daily</Button>
		<Button onclick={() => zoomScale(-1)}>Aggregate</Button>
	</div>
	<Tooltip {api} content={MyResourceHistogramTooltip}>
		<div class="gantt">
			<Gantt
				bind:this={api}
				{tasks}
				{links}
				{resources}
				{assignments}
				{calendars}
				scales={weekScales}
				zoom={histogramZoom}
				calendar="standard"
				start={new Date(2026, 2, 1)}
				end={new Date(2026, 9, 4)}
				autoScale={false}
				cellWidth={100}
			/>
		</div>
		<div class="resource">
			<ResourceLoad {api} mode="histogram" />
		</div>
	</Tooltip>
</Willow>

<style>
	.controls {
		display: flex;
		gap: 8px;
		height: 36px;
		align-items: center;
		padding: 0 8px;
	}

	.gantt {
		height: calc(60% - 36px);
		border-bottom: 2px solid var(--wx-gantt-border-color);
	}

	.resource {
		height: 40%;
	}
</style>
