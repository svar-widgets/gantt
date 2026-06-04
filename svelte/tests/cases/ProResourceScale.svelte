<script>
	import { getData, resources, assignments } from "../../demos/data";
	import { Gantt, ResourceLoad, registerScaleUnit, Tooltip } from "../../src";
	import MyTaskResourceTooltip from "../../demos/custom/MyTaskResourceTooltip.svelte";
	import { Select, Willow } from "@svar-ui/svelte-core";
	import {
		startOfMonth,
		endOfMonth,
		isSameMonth,
		addMonths,
		addDays,
		addHours,
		differenceInDays,
		format,
		startOfDay,
	} from "date-fns";

	const data = getData("calendar");

	let api = $state();

	const options = [
		{ id: 1, label: "8h" },
		{ id: 2, label: "sprint" },
		{ id: 3, label: "month, sprint" },
		{ id: 4, label: "month, sprint, week" },
		{ id: 5, label: "month, sprint, week, day" },
	];

	const getMidDate = d => {
		const m = d.getMonth();
		return m === 1 ? 15 : 16;
	};

	const sprintStart = d => {
		const monthStart = startOfMonth(d);
		const midDate = getMidDate(d);
		if (d.getDate() >= midDate) monthStart.setDate(midDate);
		return monthStart;
	};

	const sprintEnd = d => {
		const monthEnd = endOfMonth(d);
		const midDate = getMidDate(d);
		if (d.getDate() < midDate) monthEnd.setDate(midDate - 1);
		return monthEnd;
	};

	const sprintFormat = d => {
		const monthStr = format(d, "MMMM");
		const start = d.getDate();
		const end = sprintEnd(d).getDate();
		return `${monthStr} ${start} - ${end}`;
	};

	/** 8-hour blocks from midnight: 00–08, 08–16, 16–24 */
	const normalizeDate = d => {
		const x = d instanceof Date ? d : d != null ? new Date(d) : new Date();
		return Number.isNaN(x.getTime()) ? new Date() : x;
	};
	const eighthStart = d => {
		const date = normalizeDate(d);
		const day = startOfDay(date);
		const slot = Math.floor(date.getHours() / 8);
		return addHours(day, slot * 8);
	};
	const eighthFormat = d => {
		const s = eighthStart(d);
		const e = addHours(s, 8);
		return `${format(s, "MMM d")} ${format(s, "HH:mm")}–${format(e, "HH:mm")}`;
	};

	const allScales = [
		{ unit: "month", step: 1, format: "%F %Y" },
		{ unit: "sprint", step: 1, format: sprintFormat },
		{ unit: "week", step: 1, format: "%w" },
		{ unit: "day", step: 1, format: "%j" },
		{ unit: "eighthour", step: 1, format: eighthFormat },
	];

	let scaleOption = $state(2);

	let scales = $derived.by(() => {
		if (scaleOption === 1) return [allScales[4]];
		if (scaleOption === 2) return [allScales[1]];
		if (scaleOption === 3) return allScales.slice(0, 2);
		if (scaleOption === 4) return allScales.slice(0, 3);
		if (scaleOption === 5) return allScales.slice(0, 4);
		return allScales;
	});

	function getSmallerCount(d) {
		if (!d) return 15;
		const start = sprintStart(d).getDate();
		const end = sprintEnd(d).getDate();
		return end - start + 1;
	}

	registerScaleUnit("sprint", {
		start: sprintStart,
		end: sprintEnd,
		isSame: (a, b) => {
			if (!a || !b) return true;
			const sameMonth = isSameMonth(a, b);
			if (!sameMonth) return false;
			const midDate = getMidDate(a);
			return a.getDate() < midDate == b.getDate() < midDate;
		},
		add: (d, amount) => {
			const date = d.getDate();
			const start = sprintStart(d);
			const diff = date - start.getDate();
			let newDate = addMonths(start, Math.floor(amount / 2));
			const midDate = getMidDate(newDate);
			if (amount % 2) {
				newDate = addDays(newDate, midDate);
				newDate = sprintStart(newDate);
			}
			return addDays(newDate, diff);
		},
		diff: (endDate, startDate) => {
			return Math.floor(differenceInDays(endDate, startDate) / 15) || 1;
		},
		smallerCount: {
			day: getSmallerCount,
			hour: d => getSmallerCount(d) * 24,
		},
		biggerCount: {
			year: 24,
			quarter: 6,
			month: 2,
		},
	});

	const calendar = {
		weekHours: {
			monday: 8,
			tuesday: 8,
			wednesday: 8,
			thursday: 8,
			friday: 4,
			saturday: 0,
			sunday: 0,
		},
	};
</script>

<Willow>
	<div class="demo">
		<div class="bar">
			<Select bind:value={scaleOption} {options} />
		</div>
		<div class="main">
			<Tooltip {api} content={MyTaskResourceTooltip}>
				<div class="gantt">
					<Gantt
						bind:this={api}
						tasks={data.tasks}
						links={data.links}
						{scales}
						{resources}
						{assignments}
						{calendar}
						zoom
					/>
				</div>
				<div class="resource">
					<ResourceLoad
						{api}
						template={v => `${v.hours}h (${v.percent}%)`}
					/>
				</div>
			</Tooltip>
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
		padding: 20px;
		background-color: var(--wx-background);
		border: var(--wx-border);

		--wx-input-width: 180px;
	}

	.main {
		position: relative;
		height: calc(100% - 74px);
	}

	.gantt {
		height: 60%;
		border-bottom: 2px solid var(--wx-gantt-border-color);
	}
	.resource {
		height: 40%;
	}
</style>
