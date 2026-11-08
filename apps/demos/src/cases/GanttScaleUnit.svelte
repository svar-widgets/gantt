<script lang="ts">
	import { getData } from "../data";
	import { Gantt, registerScaleUnit } from "@svar-ui/svelte-gantt";
	import {
		startOfMonth,
		endOfMonth,
		isSameMonth,
		addMonths,
		addDays,
		format,
	} from "date-fns";
	import type { IDemoProps } from "../types";
	let { skinSettings }: IDemoProps = $props();

	const data = getData();

	const getMidDate = (d: Date) => {
		const m = d.getMonth();
		return m === 1 ? 15 : 16;
	};

	const sprintStart = (d: Date) => {
		const monthStart = startOfMonth(d);
		const midDate = getMidDate(d);
		if (d.getDate() >= midDate) monthStart.setDate(midDate);
		return monthStart;
	};

	const sprintEnd = (d: Date) => {
		const monthEnd = endOfMonth(d);
		const midDate = getMidDate(d);
		if (d.getDate() < midDate) monthEnd.setDate(midDate - 1);
		return monthEnd;
	};

	const sprintFormat = (d: Date) => {
		const monthStr = format(d, "MMMM");
		const start = d.getDate();
		const end = sprintEnd(d).getDate();
		return `${monthStr} ${start} - ${end}`;
	};

	registerScaleUnit("sprint", {
		start: sprintStart,
		end: sprintEnd,
		isSame: (a, b) => {
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
	});
</script>

<Gantt
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={[
		{ unit: "month", step: 1, format: "%F %Y" },
		{ unit: "sprint", step: 1, format: sprintFormat },
		{ unit: "day", step: 1, format: "%j" },
	]}
	zoom={true}
	start={new Date(2026, 3, 1)}
	end={new Date(2026, 5, 1)}
	cellWidth={60}
/>
