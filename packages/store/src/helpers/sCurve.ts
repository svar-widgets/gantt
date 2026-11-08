import { IApi, ISCurveTooltip } from "../types";

export function resolveSCurvePoint(
	api: Pick<IApi, "getState">,
	target: EventTarget | null
): ISCurveTooltip | null {
	let result: ISCurveTooltip | null = null;
	return result;
}
