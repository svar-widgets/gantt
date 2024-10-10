<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu } from "../../src/";

	export let skinSettings;

	const data = getData();
	let api;

	function toSummary(id, self) {
		const task = api.getTask(id);
		if (!self) id = task.parent;

		if (id && task.type !== "summary") {
			api.exec("update-task", {
				id,
				task: { type: "summary" },
			});
		}
	}

	function toTask(id) {
		const obj = api.getTask(id);
		if (obj && !obj.data?.length) {
			api.exec("update-task", {
				id,
				task: { type: "task" },
			});
		}
	}

	$: if (api) {
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
	<ContextMenu {api}>
		<Gantt
			bind:api
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
		/>
	</ContextMenu>
</div>
