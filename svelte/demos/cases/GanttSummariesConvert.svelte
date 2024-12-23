<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu } from "../../src/";

	let { skinSettings } = $props();

	const data = getData();
	let gApi = $state();

	function toSummary(id, self) {
		const task = gApi.getTask(id);
		if (!self) id = task.parent;

		if (id && task.type !== "summary") {
			gApi.exec("update-task", {
				id,
				task: { type: "summary" },
			});
		}
	}

	function toTask(id) {
		const obj = gApi.getTask(id);
		if (obj && !obj.data?.length) {
			gApi.exec("update-task", {
				id,
				task: { type: "task" },
			});
		}
	}

	function init(api) {
		gApi = api;
		// convert parent tasks to summary
		// will load data and then explicitely update summary tasks
		api.getState().tasks.forEach(task => {
			if (task.data?.length) {
				toSummary(task.id, true);
			}
		});

		api.on("add-task", ({ id, mode }) => {
			if (mode === "child") toSummary(id);
		});

		api.on("move-task", ({ id, source, mode, inProgress }) => {
			if (inProgress) return;
			if (mode == "child") toSummary(id);
			else toTask(source);
		});

		api.on("delete-task", ({ source }) => {
			toTask(source);
		});
	}
</script>

<div class="gt-cell">
	<ContextMenu api={gApi}>
		<Gantt
			{init}
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
		/>
	</ContextMenu>
</div>
