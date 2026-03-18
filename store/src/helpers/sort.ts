import { getValue } from "@svar-ui/grid-store";
import type { IGanttColumn, IParsedTask, TSort, TSortValue } from "../types";

function sortAsc(a: TSortValue, b: TSortValue): number {
	if (typeof a === "string")
		return a.localeCompare(b as string, undefined, { numeric: true });
	if (a instanceof Date || b instanceof Date)
		return !a ? 1 : !b ? -1 : (a as Date).getTime() - (b as Date).getTime();
	return ((a ?? 0) as number) - ((b ?? 0) as number);
}

function sortDesc(a: TSortValue, b: TSortValue): number {
	if (typeof a === "string")
		return -a.localeCompare(b as string, undefined, { numeric: true });
	if (a instanceof Date || b instanceof Date)
		return !b ? 1 : !a ? -1 : (b as Date).getTime() - (a as Date).getTime();
	return ((b ?? 0) as number) - ((a ?? 0) as number);
}

function sortBy({ order, key }: TSort, column?: IGanttColumn) {
	const sortMethod = order === "asc" ? sortAsc : sortDesc;
	return (a: IParsedTask, b: IParsedTask) =>
		sortMethod(
			column ? getValue(a, column) : a[key],
			column ? getValue(b, column) : b[key]
		);
}

function sortByMany(sortArray: TSort[], columns: IGanttColumn[]) {
	if (!sortArray || !sortArray.length) return;

	const sorts = sortArray.map(s => {
		const column = columns.find(c => c.id == s.key);
		return sortBy(s, column);
	});
	if (sortArray.length === 1) return sorts[0];

	return function (a: IParsedTask, b: IParsedTask) {
		for (let i = 0; i < sorts.length; i++) {
			const res = sorts[i](a, b);
			if (res !== 0) return res;
		}
		return 0;
	};
}

export function sort(
	data: IParsedTask[],
	conf: TSort[],
	columns: IGanttColumn[]
) {
	return data.sort(sortByMany(conf, columns));
}
