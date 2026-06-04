export function setTaskResources(taskId, resourceIds, api) {
	const { _assignments } = api.getState();
	const assigned = _assignments.byTask[taskId];
	const prevResources = assigned?.map(a => a.resource);
	const prev = new Set(prevResources || []);
	const next = new Set(resourceIds || []);
	// Assign and unassign resources
	const history = api.getHistory();
	if (history) history.startBatch();
	for (const rId of prev) {
		if (!next.has(rId)) {
			const assignment = assigned.find(a => a.resource === rId);
			api.exec("delete-assignment", { id: assignment.id });
		}
	}
	for (const rId of next) {
		if (!prev.has(rId)) {
			api.exec("add-assignment", {
				assignment: {
					resource: rId,
					task: taskId,
				},
			});
		}
	}
	if (history) history.endBatch();
}
