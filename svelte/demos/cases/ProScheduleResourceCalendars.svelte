<script>
	import { getData } from "../data";
	import {
		Gantt,
		ResourceLoad,
		Editor,
		ContextMenu,
		getDefaultColumns,
		getResourceColumns,
	} from "../../src";

	let { skinSettings } = $props();

	const data = getData("calendars");

	const taskCalendarOptions = [
		{ id: "default", label: "Default" },
		{ id: "friday-off", label: "Friday off" },
		{ id: "wednesday-off", label: "Wednesday off" },
		{ id: "weekends-only", label: "Weekends only" },
		{ id: "part-time", label: "Part time" },
	];

	const columns = getDefaultColumns({ resources: true });
	columns.splice(-1, 0, {
		id: "calendar",
		header: "Calendar",
		width: 140,
		editor: task => (task.type === "summary" ? null : "richselect"),
		options: taskCalendarOptions,
	});
	const fridayOffCalendar = {
		id: "friday-off",
		css: "friday-off",
		weekHours: {
			friday: 0,
		},
	};

	const calendarOptions = [
		{ id: "default", label: "Default" },
		{ id: "wednesday-off-resource", label: "Wednesday off" },
		{ id: "weekends-only-resource", label: "Weekends only" },
		{ id: "part-time-resource", label: "Part time" },
	];

	const resourceColumns = getResourceColumns();
	resourceColumns.splice(1, 0, {
		id: "calendar",
		header: "Calendar",
		width: 140,
		resize: true,
		template: value =>
			calendarOptions.find(option => option.id === value)?.label ??
			"Default",
	});

	const resources = data.resources.map(r => ({ ...r }));

	// only these two carry a calendar of their own, and it is the same one.
	// 13 is assigned a weekday resource — nothing in common, so it is dimmed;
	// 20 is assigned the weekend resource, so it schedules normally.
	const weekendTasks = [13, 20];

	let tasks = $state(
		data.tasks.map(t => {
			const copy = { ...t };
			delete copy.calendar;
			if (weekendTasks.includes(t.id)) copy.calendar = "weekends-only";
			if (t.id === 10) {
				copy.start = new Date(2026, 3, 3);
				copy.end = new Date(2026, 3, 11);
			}
			if (t.id === 11) copy.start = new Date(2026, 3, 7);
			if (t.id === 12) copy.start = new Date(2026, 3, 7);
			if (t.id === 20) copy.start = new Date(2026, 3, 20);
			if (t.id === 21) copy.start = new Date(2026, 3, 23);
			if (t.id === 23) copy.start = new Date(2026, 3, 18);
			return copy;
		})
	);

	let api = $state();
</script>

<div class="demo">
	<div class="bar">
		<div class="labels">
			Wednesday off
			<div class="cell wednesday-off-resource"></div>
			Weekends only
			<div class="cell weekends-only-resource"></div>
			Part time
			<div class="cell part-time-resource"></div>
		</div>
	</div>

	<div class="main">
		<div class="gantt">
			<ContextMenu {api}>
				<Gantt
					{...skinSettings}
					bind:this={api}
					{tasks}
					{columns}
					{resources}
					assignments={data.assignments}
					calendars={[...data.calendars, fridayOffCalendar]}
					calendar="default"
					links={data.links}
					schedule={{ resourceCalendars: true, auto: true }}
					scales={data.scales}
					zoom
					splitTasks
				/>
			</ContextMenu>
		</div>
		<div class="resource">
			<ResourceLoad
				{api}
				columns={resourceColumns}
				template={v => `${v.hours}h, ${v.percent}%`}
			/>
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
		gap: 20px;
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
		height: calc(100% - 55px);
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

	.demo :global(.wednesday-off),
	.demo :global(.wednesday-off-resource) {
		background: repeating-linear-gradient(
			-60deg,
			#c8b8e0,
			#c8b8e0 1px,
			transparent 1px,
			transparent 8px
		);
	}
	.demo :global(.part-time-resource) {
		background-color: lightyellow;
	}

	.demo :global(.friday-off) {
		background-color: #ffe7ea;
	}

	:global(.wx-willow-dark-theme) .demo :global(.wednesday-off),
	:global(.wx-willow-dark-theme) .demo :global(.wednesday-off-resource) {
		background: repeating-linear-gradient(
			-60deg,
			#5a5470,
			#5a5470 1px,
			transparent 1px,
			transparent 8px
		);
	}
	:global(.wx-willow-dark-theme) .demo :global(.weekends-only-resource) {
		background-color: #4a2f37;
	}
	:global(.wx-willow-dark-theme) .demo :global(.part-time-resource) {
		background-color: #45402a;
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
