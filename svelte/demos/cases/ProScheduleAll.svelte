<script>
	import { getData, resources, assignments } from "../data";
	import { Gantt, Editor, ContextMenu, ResourceLoad } from "../../src";
	import { DatePicker, Field, Checkbox } from "@svar-ui/svelte-core";
	import { getDefaultColumns } from "@svar-ui/gantt-store";
	import SchedulingFlagCell from "../custom/SchedulingFlagCell.svelte";
	import { getContext } from "svelte";

	const helpers = getContext("wx-helpers");

	const linkRemovalReasons = {
		cycle: "it would close a dependency loop",
		"parent-chain": "a task cannot be linked to its own summary or subtask",
		"summary-endpoint":
			"a summary can only be linked from its end or to its start",
	};

	const data = getData("calendar", {
		splitTasks: true,
		unscheduledTasks: true,
		constraints: true,
		linkTypes: true,
	});

	let { skinSettings } = $props();
	let api = $state();
	let tasks = $state(
		data.tasks.map(t => {
			const copy = { ...t };
			delete copy.calendar;
			return copy;
		})
	);

	const calendar = true;
	let taskCalendars = $state(false);
	let calendarsList = $state([]);
	let projectStart = $state(new Date(2026, 3, 2));
	let projectEnd = $state(new Date(2026, 4, 20));

	let autoSchedule = $state(true);
	let criticalPath = $state({ type: "flexible" });
	let baselines = $state(true);
	let unscheduledTasks = $state(true);
	let inactiveTasks = $state(true);
	let splitTasks = $state(true);
	let slack = $state(false);
	let resourceLoad = $state(false);

	let cellHeight = $state(44);

	const inactiveColumn = {
		id: "inactive",
		header: "Inactive",
		width: 90,
		align: "center",
		sort: true,
		cell: SchedulingFlagCell,
	};

	const slackColumns = [
		{
			id: "text",
			header: "Task name",
			flexgrow: 1,
		},
		{
			id: "resources",
			header: "Resources",
			width: 110,
			editor: "multiselect",
		},
		{
			id: "duration",
			header: "Duration",
			align: "center",
			width: 100,
		},
		{
			id: "slack",
			header: "Total slack",
			align: "center",
			width: 110,
			getter: t => t.slack?.totalSlack,
			template: v => v || "-",
		},
		{
			id: "add-task",
			header: "Add task",
			width: 37,
			align: "center",
		},
	];

	const columns = $derived.by(() => {
		const cols = slack
			? [...slackColumns]
			: getDefaultColumns({ resources: true }).map(c =>
					c.id === "resources" ? { ...c, editor: "multiselect" } : c
				);
		const i = cols.findIndex(c => c.id === "add-task");
		if (inactiveTasks) cols.splice(i, 0, inactiveColumn);

		return cols;
	});

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

	function onTaskCalendarsChange(ev) {
		taskCalendars = ev.value;
		calendarsList = taskCalendars ? data.calendars : [];
		tasks = (api ? api.serialize() : tasks).map(t => {
			if (!taskCalendars) {
				const copy = { ...t };
				delete copy.calendar;
				return copy;
			}
			if (t.id === 10 || t.id === 23)
				return { ...t, calendar: "wednesday-off" };
			return t;
		});
	}

	// gantt expects every task to have a start when unscheduled tasks are off
	const originalStarts = new Map(
		getData("calendar").tasks.map(t => [t.id, t.start])
	);

	let unscheduledIds = new Set();

	function onUnscheduledChange(ev) {
		if (ev.value) {
			tasks = api.serialize().map(t => {
				if (!unscheduledIds.has(t.id)) return t;
				const copy = { ...t };
				delete copy.start;
				return copy;
			});
			unscheduledIds = new Set();
			return;
		}
		tasks = api.serialize().map(t => {
			if (t.start || t.type === "summary") return t;
			unscheduledIds.add(t.id);
			const copy = {
				...t,
				start: originalStarts.get(t.id) || projectStart,
			};
			delete copy.unscheduled;
			delete copy.end;
			return copy;
		});
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
		api.on("delete-link", ({ reason }) => {
			if (reason)
				helpers.showNotice({
					text: `Link removed: ${linkRemovalReasons[reason]}`,
				});
		});

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
		<Field label="Project start" position="left" width="220px">
			<DatePicker bind:value={projectStart} />
		</Field>
		<Field label="Project end" position="left" width="220px">
			<DatePicker bind:value={projectEnd} />
		</Field>
		<Checkbox bind:value={autoSchedule} label="Auto scheduling" />
		<Checkbox
			value={!!criticalPath}
			label="Critical path"
			onchange={onCriticalPathChange}
		/>
		<Checkbox bind:value={slack} label="Slack" />
		<Checkbox
			bind:value={baselines}
			label="Baselines"
			onchange={onBaselinesChange}
		/>
		<Checkbox
			bind:value={unscheduledTasks}
			label="Unscheduled tasks"
			onchange={onUnscheduledChange}
		/>
		<Checkbox bind:value={inactiveTasks} label="Inactive tasks" />
		<Checkbox
			bind:value={splitTasks}
			label="Split tasks"
			onchange={onSplitChange}
		/>
		<Checkbox
			value={taskCalendars}
			label="Task calendars"
			onchange={onTaskCalendarsChange}
		/>
		<Checkbox bind:value={resourceLoad} label="Resource load" />
	</div>
	<div class="main" class:with-resources={resourceLoad}>
		<div class="gantt">
			<Editor {api} />
			<ContextMenu {api}>
				<Gantt
					{init}
					{...skinSettings}
					cellWidth={50}
					{cellHeight}
					gridWidth={660}
					bind:this={api}
					{tasks}
					links={data.links}
					scales={data.scales}
					summary={{ autoConvert: true }}
					{calendar}
					calendars={calendarsList}
					{resources}
					{assignments}
					schedule={{ auto: autoSchedule }}
					{criticalPath}
					{projectStart}
					{projectEnd}
					{markers}
					{baselines}
					{unscheduledTasks}
					{inactiveTasks}
					{splitTasks}
					{slack}
					{columns}
					undo
				/>
			</ContextMenu>
		</div>
		{#if resourceLoad}
			<div class="resource">
				<ResourceLoad {api} />
			</div>
		{/if}
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
		flex-wrap: wrap;
		align-items: center;
		padding: 12px;
		gap: 12px 20px;
		border-bottom: var(--wx-gantt-border);
	}

	.main {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.gantt {
		flex: 1;
		min-height: 0;
		position: relative;
		overflow: hidden;
	}

	.main.with-resources .gantt {
		height: 60%;
		flex: none;
		border-bottom: 2px solid var(--wx-gantt-border-color);
	}

	.resource {
		height: 40%;
		overflow: hidden;
	}
	:global(.bar .wx-field.wx-left) {
		margin-bottom: 0px;
	}
	.bar :global(.wx-field.wx-left > .wx-label) {
		width: auto;
		text-align: left;
	}
	.bar :global(.wx-field.wx-left > .wx-field-control) {
		max-width: none;
	}
	.demo :global(.wednesday-off) {
		background-color: lavender;
	}

	:global(.wx-willow-dark-theme) .demo :global(.wednesday-off) {
		background-color: #383650;
	}
</style>
