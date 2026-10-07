<script>
	import {
		Gantt,
		Editor,
		ContextMenu,
		Tooltip,
		getEditorItems,
		version,
	} from "../../src";
	import { Checkbox, DatePicker, Button, Willow } from "@svar-ui/svelte-core";
	import { addDays, format } from "date-fns";
	import { getData } from "../../demos/data";

	const { tasks, links } = getData("calendar", {
		baselines: true,
		splitTasks: true,
		deadlines: true,
		constraints: true,
	});

	const calendar = {
		weekHours: {
			monday: 8,
			tuesday: 8,
			wednesday: 8,
			thursday: 8,
			friday: 8,
			saturday: 0,
			sunday: 0,
		},
	};

	const scales = [
		{ unit: "month", step: 1, format: "%F %Y" },
		{ unit: "day", step: 1, format: "%D %j" },
	];

	let api = $state();

	let inclusiveEnd = $state(true);
	let baselines = $state(false);
	let deadlines = $state(true);
	let autoSchedule = $state(false);
	let unscheduledTasks = $state(true);
	let showSCurve = $state(false);
	let showProgressLine = $state(true);
	let showStored = $state(true);
	// the state at the end of Fri 17 Apr
	let statusDate = $state(new Date(2026, 3, 18));

	// app code shows an end-like date a day earlier itself
	const shownEnd = date => (inclusiveEnd && date ? addDays(date, -1) : date);

	const schedule = $derived({ auto: autoSchedule });
	const progressLine = $derived(showProgressLine ? statusDate : false);
	const sCurve = $derived(
		showSCurve
			? [
					{ type: "baseline", metric: "duration" },
					{ type: "scheduled", metric: "duration" },
					{ type: "earned", metric: "duration" },
				]
			: null
	);

	// the format of the built-in date columns
	const fmt = date => (date ? format(date, "dd-MM-yyyy") : "");

	const finishSide = ["fnlt", "fnet", "mfo"];
	const constraintLabels = {
		snet: "SNET",
		snlt: "SNLT",
		fnet: "FNET",
		fnlt: "FNLT",
		mso: "MSO",
		mfo: "MFO",
	};

	const columns = $derived.by(() => {
		const cols = [
			{ id: "text", header: "Task name", flexgrow: 1, sort: true },
			{
				id: "start",
				header: "Start",
				width: 110,
				align: "center",
				sort: true,
				editor: "datepicker",
			},
			// shown by gantt: the default text, the editor and the filter
			{
				id: "end",
				header: ["End", { filter: "datepicker" }],
				width: 120,
				align: "center",
				sort: true,
				editor: "datepicker",
			},
			{
				id: "duration",
				header: "Dur",
				width: 60,
				align: "center",
				sort: true,
				editor: { type: "text", config: { type: "number" } },
			},
		];
		if (showStored)
			cols.push({
				id: "stored-end",
				header: "Stored end",
				width: 120,
				align: "center",
				// an own getter: no conversion
				getter: row => row.end,
				template: fmt,
			});
		if (baselines)
			cols.push({
				id: "base_end",
				header: "Baseline end",
				width: 120,
				align: "center",
				editor: "datepicker",
				template: v => fmt(shownEnd(v)),
			});
		if (deadlines)
			cols.push({
				id: "deadline",
				header: "Deadline",
				width: 120,
				align: "center",
				editor: "datepicker",
				// an app template gets the stored value
				template: v => fmt(shownEnd(v)),
			});
		if (autoSchedule)
			cols.push({
				id: "constraint",
				header: "Constraint",
				width: 150,
				template: (v, row) => {
					if (!v?.type) return "";
					const date =
						finishSide.includes(v.type) && row.type !== "milestone"
							? shownEnd(v.date)
							: v.date;
					return `${constraintLabels[v.type]} ${fmt(date)}`;
				},
			});
		cols.push({ id: "add-task", header: "", width: 50, align: "center" });
		return cols;
	});

	const items = $derived(
		getEditorItems({
			deadlines,
			unscheduledTasks,
			splitTasks: true,
			schedule,
		}).flatMap(item => {
			if (item.key !== "links") return item;
			return [
				{ key: "base_start", comp: "date", label: "Baseline start" },
				{ key: "base_end", comp: "date", label: "Baseline end" },
				item,
			];
		})
	);

	// an app control shifts the status date itself
	const shownStatusDate = $derived(shownEnd(statusDate));
	function setStatusDate({ value }) {
		if (value) statusDate = inclusiveEnd ? addDays(value, 1) : value;
	}

	const url = "https://export.svar.dev/gantt/" + version;
	// Excel gets the shown end, PDF renders with inclusiveEnd,
	// MS Project gets the stored dates
	function exportData(format, visual) {
		const ev = { url, format, fileName: "inclusive-end" };
		if (format === "xlsx")
			ev.excel = {
				columns: [
					{ id: "text", header: "Task name", width: 200 },
					{ id: "start", header: "Start", width: 110, type: "date" },
					{ id: "end", header: "End", width: 110, type: "date" },
					{
						id: "duration",
						header: "Duration",
						width: 80,
						type: "number",
					},
				],
				sheetNames: ["Tasks", "Links"],
				dateFormat: "yyyy-mmm-dd",
				visual,
			};
		if (format === "mspx") delete ev.url;
		api.exec("export-data", ev);
	}
</script>

<Willow>
	<div class="demo">
		<div class="bar">
			<Checkbox bind:value={inclusiveEnd} label="Inclusive end" />
			<Checkbox bind:value={showStored} label="Stored end column" />
			<Checkbox bind:value={baselines} label="Baselines" />
			<Checkbox bind:value={deadlines} label="Deadlines" />
			<Checkbox bind:value={autoSchedule} label="Auto schedule" />
			<Checkbox bind:value={unscheduledTasks} label="Unscheduled" />
			<Checkbox bind:value={showSCurve} label="S-curve" />
			<Checkbox bind:value={showProgressLine} label="Progress line" />
			<div class="date">
				<DatePicker
					value={shownStatusDate}
					onchange={setStatusDate}
					disabled={!showProgressLine}
				/>
			</div>
		</div>
		<div class="bar">
			<Button onclick={() => exportData("xlsx", false)}>To XLSX</Button>
			<Button onclick={() => exportData("xlsx", true)}>
				To XLSX with chart
			</Button>
			<Button onclick={() => exportData("pdf")}>To PDF</Button>
			<Button onclick={() => exportData("mspx")}>To MS Project</Button>
			<span class="hint">
				Grid, editor, deadline, constraint, and S-curve tooltips show
				the last day covered; bars and durations do not change
			</span>
		</div>
		<div class="gantt">
			<ContextMenu {api}>
				<Tooltip {api}>
					<Gantt
						bind:this={api}
						{tasks}
						{links}
						{scales}
						{columns}
						{calendar}
						{inclusiveEnd}
						cellWidth={50}
						cellHeight={40}
						gridWidth={760}
						{baselines}
						{deadlines}
						{schedule}
						{unscheduledTasks}
						{progressLine}
						{sCurve}
						splitTasks
						undo
					/>
				</Tooltip>
			</ContextMenu>
			<Editor {api} {items} />
		</div>
	</div>
</Willow>

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
		padding: 8px 12px;
		gap: 8px 20px;
		border-bottom: var(--wx-gantt-border);
	}

	.date {
		width: 130px;
	}

	.hint {
		color: var(--wx-color-font-alt, #71717a);
		font-size: var(--wx-font-size, 14px);
	}

	.gantt {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}
</style>
