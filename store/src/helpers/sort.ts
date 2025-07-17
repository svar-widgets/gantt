import type { IParsedTask, TSort, TSortValue } from "../types";
function sortAsc(a: TSortValue, b: TSortValue): number {
	if (typeof a === "string")
		return a.localeCompare(b as string, undefined, { numeric: true });
	if (typeof a === "object") return a.getTime() - (b as Date).getTime();
	return ((a ?? 0) as number) - ((b ?? 0) as number);
}

function sortDesc(a: TSortValue, b: TSortValue): number {
	if (typeof a === "string")
		return -a.localeCompare(b as string, undefined, { numeric: true });
	if (typeof b === "object") return b.getTime() - (a as Date).getTime();
	return ((b ?? 0) as number) - ((a ?? 0) as number);
}

function sortBy({ key, order }: TSort) {
	const sortMethod = order === "asc" ? sortAsc : sortDesc;
	return (a: IParsedTask, b: IParsedTask) => sortMethod(a[key], b[key]);
}

function sortByMany(sortArray: TSort[]) {
	if (!sortArray || !sortArray.length) return;

	const sorts = sortArray.map(s => sortBy(s));
	if (sortArray.length === 1) return sorts[0];

	return function (a: IParsedTask, b: IParsedTask) {
		for (let i = 0; i < sorts.length; i++) {
			const res = sorts[i](a, b);
			if (res !== 0) return res;
		}
		return 0;
	};
}

export function sort(data: IParsedTask[], conf: TSort[]) {
	return data.sort(sortByMany(conf));
}
