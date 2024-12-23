<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";

	let { skinSettings } = $props();

	const data = getData();

	const scales = [
		{ unit: "year", step: 1, format: "yyyy" },
		{ unit: "month", step: 2, format: "MMMM yyy" },
		{ unit: "week", step: 1, format: "wo" },
		{ unit: "day", step: 1, format: "d, EEEE" /* , css: dayStyle */ },
		{ unit: "hour", step: 1, format: "HH:mm" },
	];

	function isDayOff(date) {
		const d = date.getDay();
		return d == 0 || d == 6;
	}
	function isHourOff(date) {
		const h = date.getHours();
		return h < 8 || h == 12 || h > 17;
	}
	function highlightTime(d, u) {
		if (u == "day" && isDayOff(d)) return "wx-weekend";
		if (u == "hour" && (isDayOff(d) || isHourOff(d))) return "wx-weekend";
		return "";
	}
</script>

<Gantt
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	{scales}
	{highlightTime}
	zoom
/>
