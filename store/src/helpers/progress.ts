import { IParsedTask } from "../types";

// Share of the segment covered by the progress, 0 to 100
export function getSegmentProgress(
	task: IParsedTask,
	segmentIndex: number
): number {
	let result = 0;
	return result;
}


// X of the task progress edge, in chart coordinates
export function getProgressX(
	task: IParsedTask,
	splitTasks?: boolean,
	statusX?: number
): number {
	return Math.round(task.$x + task.$w * ((task.progress || 0) / 100));
}
