import { dateToString } from "@svar-ui/lib-dom";
import { getDefaultColumns, normalizeLinks } from "../../src/index";
import type { ITask, ILink } from "../../src/types";

// The "project tree" of backend/js-gantt-benchmarks: one summary, N leaves, one
// e2s link per consecutive pair. Leaf k spans [day k, day k + 2], so every link is
// violated by a day and a forward pass cascades the whole chain.
export function projectTree(count: number) {
	const origin = new Date(2026, 2, 1);
	const day = (n: number) =>
		new Date(origin.getFullYear(), origin.getMonth(), origin.getDate() + n);

	// a collapsed summary keeps its leaves out of _tasks, and with them every
	// geometry cost this measures
	const tasks: Partial<ITask>[] = [
		{ id: 1, text: "project", type: "summary", open: true },
	];
	const links: Partial<ILink>[] = [];

	for (let k = 0; k < count; k++) {
		const id = k + 2;
		tasks.push({
			id,
			parent: 1,
			text: `task ${k}`,
			type: "task",
			start: day(k),
			end: day(k + 2),
			progress: k % 101,
		});
		if (k > 0)
			links.push({ id: k, source: id - 1, target: id, type: "e2s" });
	}

	return { tasks, links: normalizeLinks(links as ILink[]) };
}

const locale = {
	dayShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	dayFull: [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
	],
	monthShort: "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" "),
	monthFull: [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	],
};

// prepareScales converts a format to a function before the config reaches the
// store, so a measurement that passes raw strings never pays for the label.
export const scales = [
	{ unit: "week" as const, step: 1, format: dateToString("%d %M", locale) },
	{ unit: "day" as const, step: 1, format: dateToString("%d", locale) },
];

export function ganttConfig(count: number, extra: Record<string, any> = {}) {
	return {
		...projectTree(count),
		scales,
		cellWidth: 70,
		columns: getDefaultColumns(),
		start: new Date(2026, 2, 1),
		end: new Date(2026, 5, 1),
		...extra,
	};
}
