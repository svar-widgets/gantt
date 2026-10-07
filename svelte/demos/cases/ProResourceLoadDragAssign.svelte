<script>
	import { locateID } from "@svar-ui/lib-dom";
	import { getData, resources, assignments } from "../data";
	import {
		Gantt,
		ResourceLoad,
		Tooltip,
		Editor,
		locateTask,
	} from "../../src";
	import MyTaskResourceTooltip from "../custom/MyTaskResourceTooltip.svelte";

	let { skinSettings } = $props();

	const MIME = "application/x-svar-gantt-resource";
	const data = getData();

	let api = $state();
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

	function onResourceDragStart(e) {
		const id = locateID(e);
		if (!id || !api) return;

		const resource = api.getResource(id);
		if (!resource || resource.data?.length) return;

		e.dataTransfer.setData(MIME, JSON.stringify(resource.id));
		e.dataTransfer.setData("text/plain", resource.name);
		e.dataTransfer.effectAllowed = "copy";

		const name = e.target.closest(".wx-row")?.querySelector(".wx-name");
		if (name) {
			e.dataTransfer.setDragImage(name, 0, name.offsetHeight / 2);
		}
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

		if (!resourceId || !taskTarget) return;

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

<Tooltip {api} content={MyTaskResourceTooltip}>
	<div class="layout">
		<div class="hint">
			Drag a resource from the load grid onto a task (grid row or chart)
			to assign it. Summaries are not valid targets.
		</div>
		<div class="main">
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
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="resource" ondragstart={onResourceDragStart}>
				<ResourceLoad {api} draggableRows={row => !row.data?.length} />
			</div>
		</div>
		<Editor {api} />
	</div>
</Tooltip>

<style>
	.layout {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow: hidden;
	}

	.hint {
		flex-shrink: 0;
		padding: 8px 12px;
		color: var(--wx-color-font-alt);
		border-bottom: var(--wx-gantt-border);
	}

	.main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	.gantt {
		flex: 0 0 60%;
		min-height: 0;
		overflow: hidden;
		border-bottom: 2px solid var(--wx-gantt-border-color);
	}

	.resource {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.resource :global(.wx-resource-grid .wx-row[draggable="true"]) {
		cursor: grab;
	}

	:global(.resource-drop) {
		outline: 2px solid var(--wx-color-primary);
		outline-offset: -2px;
	}
</style>
