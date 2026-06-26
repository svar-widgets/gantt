<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";
	import { getISOWeek, getQuarter, startOfWeek } from "date-fns";
	import { Checkbox } from "@svar-ui/svelte-core";

	let { skinSettings } = $props();

	const data = getData();

	let sabbaticalYear = $state(false);
	let summerBreak = $state(false);

	let everySecondWeekOff = $state(false);
	let everySecondQuarterOff = $state(false);

	const zoomLevel = {
		year: 0,
		quarter: 1,
		month: 2,
		week: 3,
		day: 4,
	};

	let activeZoomLevel = $state(zoomLevel.day);

	function onHolidayToggle(level, ev) {
		if (ev.value) activeZoomLevel = level;
	}

	const scales = [
		{ unit: "year", step: 1, format: "%Y" },
		{ unit: "month", step: 2, format: "%F %Y" },
		{ unit: "week", step: 1, format: "Week %W" },
		{ unit: "day", step: 1, format: "%j, %l" },
	];

	function isDayOff(date) {
		const d = date.getDay();
		return d == 0 || d == 6;
	}
	function isHourOff(date) {
		const h = date.getHours();
		return h < 8 || h == 12 || h > 17;
	}

	function isYearOff(date) {
		return sabbaticalYear && date.getFullYear() === 2026;
	}

	function isQuarterOff(date) {
		if (summerBreak && [6, 7, 8].includes(date.getMonth())) return true;
		if (!everySecondQuarterOff) return false;
		return getQuarter(date) === 2;
	}

	function isMonthOff(date) {
		return summerBreak && [6, 7, 8].includes(date.getMonth());
	}

	function isWeekOff(date) {
		if (!everySecondWeekOff) return false;
		const week = startOfWeek(date, { weekStartsOn: 0 });
		return getISOWeek(week) % 2 === 0;
	}

	const off = {
		year: isYearOff,
		quarter: isQuarterOff,
		month: isMonthOff,
		week: isWeekOff,
		day: isDayOff,
		hour: isHourOff,
	};
	function highlightTime(d, u) {
		for (const unit in off) {
			if (off[unit](d)) return "wx-weekend";
			if (unit === u) break;
		}
		return "";
	}
</script>

<div class="demo">
	<div class="bar">
		<Checkbox
			bind:value={sabbaticalYear}
			label="Sabbatical year 2026"
			onchange={ev => onHolidayToggle(zoomLevel.year, ev)}
		/>
		<Checkbox
			bind:value={everySecondQuarterOff}
			label="Q2 off"
			onchange={ev => onHolidayToggle(zoomLevel.quarter, ev)}
		/>
		<Checkbox
			bind:value={summerBreak}
			label="Summer break"
			onchange={ev => onHolidayToggle(zoomLevel.month, ev)}
		/>
		<Checkbox
			bind:value={everySecondWeekOff}
			label="Every second week off"
			onchange={ev => onHolidayToggle(zoomLevel.week, ev)}
		/>
	</div>
	<div class="gantt">
		<Gantt
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			{scales}
			{highlightTime}
			zoom={{ level: activeZoomLevel }}
		/>
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
</style>
