<script>
	import { getData } from "../data";
	import { Gantt, defaultColumns } from "../../src/";
	import { Field, Switch } from "@svar-ui/svelte-core";

	let { skinSettings } = $props();

	const data = getData();

	let add = $state(true); // if false - cannot add and edit task
	let drag = $state(true); // if false - cannot drag tasks on scale
	let order = $state(true); // if false - cannot reorder tasks in grid
	let newLink = $state(true); // if false - cannot create new links
	let deleteLink = $state(true); // if false - cannot delete links
	let progress = $state(true); // if false - cannot edit progress in chart
	let api = $state();

	function init(gApi) {
		api = gApi;

		api.intercept("drag-task", ev => {
			if (typeof ev.top !== "undefined") return order;
			return drag; //ev.width && ev.left
		});
	}

	let columns = $derived(
		add ? defaultColumns : defaultColumns.filter(a => a.id != "add-task")
	);
</script>

<div class="rows">
	<div class="bar">
		<Field label="Adding tasks" position={"left"}>
			<Switch bind:value={add} />
		</Field>
		<Field label="Creating links" position={"left"}>
			<Switch bind:value={newLink} />
		</Field>
		<Field label="Deleting links" position={"left"}>
			<Switch bind:value={deleteLink} />
		</Field>
		<Field label="Dragging tasks" position={"left"}>
			<Switch bind:value={drag} />
		</Field>
		<Field label="Reordering tasks" position={"left"}>
			<Switch bind:value={order} />
		</Field>
		<Field label="Editing progress" position={"left"}>
			<Switch bind:value={progress} />
		</Field>
	</div>
	<div
		class="gantt"
		class:hide-links={!newLink}
		class:hide-delete-links={!deleteLink}
		class:hide-drag={!drag}
		class:hide-progress={!progress}
	>
		<Gantt
			{init}
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
			{columns}
		/>
	</div>
</div>

<style>
	.rows {
		display: flex;
		flex-direction: column;
		position: relative;
		width: 100%;
		height: 100%;
	}

	.bar {
		display: flex;
		height: 60px;
		align-items: end;
		font-family: var(--wx-font-family);
		font-size: var(--wx-font-size);
		padding: 12px 0;
		--wx-label-width: 130px;
	}

	.bar:first-child {
		margin-left: 10px;
	}

	.gantt {
		height: 100%;
		position: relative;
		border-top: var(--wx-gantt-border);
		overflow: hidden;
	}

	.gantt.hide-progress > :global(.wx-gantt .wx-bar .wx-progress-marker) {
		display: none;
	}
	.gantt.hide-links > :global(.wx-gantt .wx-bar .wx-link) {
		display: none;
	}
	.gantt.hide-delete-links > :global(.wx-gantt .wx-delete-link) {
		display: none;
	}
	.gantt.hide-delete-links > :global(.wx-gantt .wx-line:hover) {
		cursor: default;
		stroke: var(--wx-gantt-link-color);
	}
	.gantt.hide-delete-links > :global(.wx-gantt .wx-line.wx-line-selectable) {
		cursor: default;
	}
	.gantt.hide-drag > :global(.wx-gantt .wx-bar) {
		cursor: pointer !important;
	}
</style>
