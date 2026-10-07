<script>
	import { locateID } from "@svar-ui/lib-dom";
	import { Grid } from "@svar-ui/svelte-grid";
	import { getData, resources, assignments } from "../data";
	import { Gantt, Editor, locateTask } from "../../src";
	import ResourceNameCell from "../custom/ResourceNameCell.svelte";

	let { skinSettings } = $props();

	const MIME = "application/x-svar-gantt-resource";
	const data = getData();
	const leafResources = resources.filter(r => r.parent);

	const resourceColumns = [
		{
			id: "name",
			header: "Resources",
			flexgrow: 1,
			cell: ResourceNameCell,
		},
	];

	let api = $state();
	let tableApi = $state();
	let dropTarget = $state(null);

	function clearDropTarget() {
		if (dropTarget) {
			dropTarget.classList.remove("resource-drop");
			dropTarget = null;
		}
	}

	function isResourceDrag(e) {
		return Array.from(e.dataTransfer?.types || []).includes(MIME);
	}

	function onGridDragStart(e) {
		const id = locateID(e);
		if (!id || !tableApi) return;

		const row = tableApi.getRow(id);
		if (!row) return;

		e.dataTransfer.setData(MIME, JSON.stringify(row.id));
		e.dataTransfer.setData("text/plain", row.name);
		e.dataTransfer.effectAllowed = "copy";
	}

	function onDragOver(e) {
		if (!isResourceDrag(e)) return;

		const taskTarget = locateTask(e, api);
		if (!taskTarget || !api) {
			clearDropTarget();
			return;
		}

		const { id, node } = taskTarget;
		const task = api.getTask(id);
		if (!task || task.type === "summary") {
			clearDropTarget();
			return;
		}

		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";

		if (dropTarget !== node) {
			clearDropTarget();
			node.classList.add("resource-drop");
			dropTarget = node;
		}
	}

	function onDragLeave(e) {
		if (!e.currentTarget.contains(e.relatedTarget)) {
			clearDropTarget();
		}
	}

	function onDrop(e) {
		if (!isResourceDrag(e) || !api) return;

		const resourceId = JSON.parse(e.dataTransfer.getData(MIME));
		const taskTarget = locateTask(e, api);
		clearDropTarget();

		if (resourceId == null || !taskTarget) return;

		e.preventDefault();
		e.stopPropagation();

		const { id } = taskTarget;
		const task = api.getTask(id);
		const resource = api.getResource(resourceId);
		if (!task || task.type === "summary" || !resource) return;

		api.exec("add-assignment", {
			assignment: {
				task: id,
				resource: resourceId,
			},
		});
	}
</script>

<div class="demo">
	<div class="hint">
		Drag a resource onto a task (grid row or chart) to assign it. Summaries
		are not valid targets.
	</div>
	<div class="body">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="panel" ondragstart={onGridDragStart}>
			<Grid
				bind:this={tableApi}
				data={leafResources}
				columns={resourceColumns}
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
				{resources}
				{assignments}
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

	:global(.resource-drop) {
		outline: 2px solid var(--wx-color-primary);
		outline-offset: -2px;
	}
</style>
