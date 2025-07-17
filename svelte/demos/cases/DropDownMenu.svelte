<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu, Editor } from "../../src/";
	import { Button } from "wx-svelte-core";

	let { skinSettings } = $props();

	let api = $state(),
		menu = $state();
	const data = getData();

	const resolver = () => {
		const id = $selected.length ? $selected[$selected.length - 1] : null;
		return id ? api.getTask(id) : null;
	};

	const selected = $derived.by(() => {
		return api ? api.getReactiveState().selected : null;
	});
</script>

<ContextMenu {api} {resolver} at="right" bind:this={menu} />

<div class="rows">
	<div class="bar">
		<Button type="primary" onclick={ev => menu.show(ev)}>Task action</Button
		>
	</div>

	<div class="gtcell">
		<Gantt
			bind:this={api}
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
		/>
		<Editor {api} />
	</div>
</div>

<style>
	.rows {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.bar {
		padding: 12px;
	}
	.gtcell {
		position: relative;
		height: calc(100% - 56px);
		border-top: var(--wx-gantt-border);
	}
</style>
