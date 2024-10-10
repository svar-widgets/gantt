import type { IParsedTask, TSort, TSortValue } from "../types";
export function sort(data: IParsedTask[], conf: TSort) {
	return data.sort(sortBy(conf));
}

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
