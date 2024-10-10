<script>
	import { getData } from "../data";
	import { Gantt, defaultColumns } from "../../src/";
	import { Field, Switch } from "wx-svelte-core";

	export let skinSettings;

	const data = getData();

	let edit = true; // if false - cannot add and edit task
	let drag = true; // if false - cannot drag tasks on scale
	let order = true; // if false - cannot reorder tasks in grid
	let newLink = true; // if false - cannot create new links

	let ignore = false;
	let gapi;

	function init(api) {
		gapi = api;

		api.intercept("show-editor", () => edit || ignore);
		api.intercept("drag-task", ev => {
			if (typeof ev.top !== "undefined") return order;
			return drag; //ev.width && ev.left
		});
	}

	$: columns = edit
		? defaultColumns
		: defaultColumns.filter(a => a.id != "action");

	// for demo purposes: close editor when checkbox is unchecked
	$: {
		if (!edit) {
			ignore = true;
			gapi.exec("show-editor", { id: null });
			ignore = false;
		}
	}
</script>

<div class="rows">
	<div class="bar">
		<Field label="Adding and editing" position={"left"} let:id>
			<Switch bind:value={edit} {id} />
		</Field>
		<Field label="Creating links" position={"left"} let:id>
			<Switch bind:value={newLink} {id} />
		</Field>
		<Field label="Dragging tasks" position={"left"} let:id>
			<Switch bind:value={drag} {id} />
		</Field>
		<Field label="Reordering tasks" position={"left"} let:id>
			<Switch bind:value={order} {id} />
		</Field>
	</div>
	<div
		class="gantt"
		class:hide-progress={!edit}
		class:hide-links={!newLink}
		class:hide-drag={!drag}
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
		padding-top: 12px;
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
	.gantt.hide-drag > :global(.wx-gantt .wx-bar) {
		cursor: pointer !important;
	}
</style>
