<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";
	import { Toolbar } from "wx-svelte-toolbar";

	let { skinSettings } = $props();

	const data = getData();

	function handleAdd() {
		api.exec("add-task", {
			task: {
				text: "New task",
			},
			target: $selected[0],
			mode: "after",
		});
	}

	function handleDelete() {
		const order = getActionOrder(true);
		order.forEach(id => api.exec("delete-task", { id }));
	}

	function handleMove(mode) {
		const changeDir = mode === "down";
		const order = getActionOrder(changeDir);
		order.forEach(id => api.exec("move-task", { id, mode }));
	}

	function getActionOrder(changeDir) {
		// sort by visible order and level
		const tasks = $selected
			.map(id => api.getTask(id))
			.sort((a, b) => {
				return a.$level - b.$level || a.$y - b.$y;
			});
		const idOrder = tasks.map(o => o.id);

		// reverse for deleting/moving tasks down
		if (changeDir) return idOrder.reverse();
		return idOrder;
	}

	const allItems = [
		{
			comp: "button",
			type: "primary",
			text: "Add task",
			handler: handleAdd,
		},
		{
			comp: "button",
			text: "Delete task",
			handler: handleDelete,
		},
		{
			comp: "button",
			type: "primary",
			text: "Move task down",
			handler: () => handleMove("down"),
		},
		{
			comp: "button",
			type: "primary",
			text: "Move task up",
			handler: () => handleMove("up"),
		},
	];

	let api = $state();
	let selected;

	const items = $derived.by(() => {
		if (api) {
			selected = api.getReactiveState().selected;
			return $selected.length ? allItems : [allItems[0]];
		}
		return [allItems[0]];
	});
</script>

<Toolbar {items} />
<div class="gtcell">
	<Gantt
		{...skinSettings}
		bind:this={api}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
	/>
</div>

<style>
	.gtcell {
		height: calc(100% - 50px);
		border-top: var(--wx-gantt-border);
	}
</style>
