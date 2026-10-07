<script>
	import { locateID } from "@svar-ui/lib-dom";
	import { Grid } from "@svar-ui/svelte-grid";
	import { getData, backlogTasks } from "../data";
	import { Gantt, Editor, locateTask } from "../../src";
	import BacklogTaskCell from "../custom/BacklogTaskCell.svelte";

	let { skinSettings } = $props();

	const MIME = "application/x-svar-gantt-task";
	const data = getData();

	let backlog = $state([...backlogTasks]);

	const backlogColumns = [
		{
			id: "text",
			header: "Backlog",
			flexgrow: 1,
			cell: BacklogTaskCell,
		},
	];

	let api = $state();
	let tableApi = $state();
	let dropTarget = $state(null);

	function clearDropTarget() {
		if (dropTarget) {
			dropTarget.classList.remove("task-drop");
			dropTarget = null;
		}
	}

	function isTaskDrag(e) {
		return Array.from(e.dataTransfer?.types || []).includes(MIME);
	}

	function onGridDragStart(e) {
		const id = locateID(e);
		if (id == null || !tableApi) return;

		const row = tableApi.getRow(id);
		if (!row) return;

		e.dataTransfer.setData(MIME, JSON.stringify(row.id));
		e.dataTransfer.setData("text/plain", row.text || "");
		e.dataTransfer.effectAllowed = "copy";
	}

	function onDragOver(e) {
		if (!isTaskDrag(e)) return;

		const taskTarget = locateTask(e, api);
		if (!taskTarget) {
			clearDropTarget();
			return;
		}

		const { node } = taskTarget;
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";

		if (dropTarget !== node) {
			clearDropTarget();
			node.classList.add("task-drop");
			dropTarget = node;
		}
	}

	function onDragLeave(e) {
		if (!e.currentTarget.contains(e.relatedTarget)) {
			clearDropTarget();
		}
	}

	function onDrop(e) {
		if (!isTaskDrag(e) || !api) return;

		const taskId = JSON.parse(e.dataTransfer.getData(MIME));
		const taskTarget = locateTask(e, api);
		clearDropTarget();

		if (taskId == null || !taskTarget) return;

		e.preventDefault();
		e.stopPropagation();

		const { id } = taskTarget;
		const item = backlog.find(task => task.id === taskId);
		if (!item) return;

		const target = api.getTask(id);
		const mode = target.type === "summary" ? "child" : "after";
		const summaryId =
			target.type === "summary"
				? target.id
				: api.getState().tasks.getSummaryId(target.id);
		const dateSource = summaryId ? api.getTask(summaryId) : target;

		const task = {
			text: item.text,
			type: item.type || "task",
			duration: item.type === "milestone" ? 0 : (item.duration ?? 1),
			start: dateSource.start,
		};

		api.exec("add-task", {
			task,
			target: id,
			mode,
		});
		backlog = backlog.filter(t => t.id !== taskId);
	}
</script>

<div class="demo">
	<div class="hint">
		Drag a backlog task onto a task (grid row or chart) to add it. Start
		date comes from the parent summary, or the drop target.
	</div>
	<div class="body">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="panel" ondragstart={onGridDragStart}>
			<Grid
				bind:this={tableApi}
				data={backlog}
				columns={backlogColumns}
				draggableRows
				sizes={{ headerHeight: 72, rowHeight: 38 }}
			/>
		</div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="gantt"
			ondragover={onDragOver}
			ondragleave={onDragLeave}
			ondrop={onDrop}
		>
			<Gantt
				bind:this={api}
				{...skinSettings}
				tasks={data.tasks}
				links={data.links}
				scales={data.scales}
			/>
		</div>
	</div>
	<Editor {api} />
</div>

<style>
	.demo {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.hint {
		flex-shrink: 0;
		padding: 8px 12px;
		color: var(--wx-color-font-alt);
		border-bottom: var(--wx-gantt-border);
	}

	.body {
		flex: 1;
		min-height: 0;
		display: flex;
	}

	.panel {
		flex: 0 0 240px;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		border-right: var(--wx-gantt-border);
		--wx-table-header-background: var(--wx-gantt-background);
		--wx-table-cell-border: none;
	}

	.panel :global(.wx-table-box) {
		border: none;
	}

	.panel :global(.wx-cell) {
		display: flex;
		align-items: center;
		padding-top: 0;
		padding-bottom: 0;
	}

	.panel :global(.wx-row[draggable="true"]) {
		cursor: grab;
	}

	.gantt {
		flex: 1;
		min-width: 0;
		min-height: 0;
	}

	:global(.task-drop) {
		outline: 2px solid var(--wx-color-primary);
		outline-offset: -2px;
	}
</style>
