export function getUnitStart(value, unitSize) {
	unitSize = unitSize || 1;
	return Math.trunc(value / unitSize) * unitSize;
}

export function getTaskAtRow(tasks, y, cellHeight) {
	if (!tasks?.length) return;
	return tasks[Math.floor(y / cellHeight)];
}
