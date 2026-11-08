import type { IParsedTask } from "@svar-ui/gantt-store";

export function getUnitStart(value: number, unitSize?: number) {
	unitSize = unitSize || 1;
	return Math.trunc(value / unitSize) * unitSize;
}

export function getTaskAtRow<T extends IParsedTask>(
	tasks: T[] | null | undefined,
	y: number,
	cellHeight: number
): T | undefined {
	if (!tasks?.length) return;
	return tasks[Math.floor(y / cellHeight)];
}
