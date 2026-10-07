import { IData, IParsedTask, IProgressLineData } from "../types";
import { getProgressX } from "./progress";

export function getProgressLinePoints(
	visibleTasks: IParsedTask[],
	progressLine: IProgressLineData,
	areaFrom: number,
	state: Partial<IData> = {}
): string {
	const points: string[] = [];

	return points.join(" ");
}
