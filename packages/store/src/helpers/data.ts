import type { IDataHash } from "../types";

// a payload names a field with undefined to drop it, as undo does;
// $-fields are the store's own layout and stay in place
export function dropUndefined(target: IDataHash, payload: IDataHash) {
	for (const key in payload)
		if (payload[key] === undefined && key[0] !== "$") delete target[key];
}

// Restricts value to the [lower, upper] range
// When the range is inverted (i.e. lower > upper) the lower bound wins,
// so `clamp(5, 0, -10)` returns 0
export function clamp<T extends number | Date>(
	value: T,
	lower: T,
	upper: T
): T {
	const clamped = Math.max(Math.min(+value, +upper), +lower);
	return (value instanceof Date ? new Date(clamped) : clamped) as T;
}

const RESOURCE_METRIC_PRECISION = 2;

export function roundResourceMetric(value: number): number {
	const factor = 10 ** RESOURCE_METRIC_PRECISION;
	return Math.round((value + Number.EPSILON) * factor) / factor;
}
