<script>
	import { Button } from "@wx/svelte-core";
	import { getData } from "../data";
	import { Gantt, Editor, ContextMenu } from "../../src";

	let { skinSettings } = $props();

	let api = $state();

	const { tasks, links, scales } = getData();

	let history = $state();

	function handleUndo() {
		api.exec("undo");
	}
	function handleRedo() {
		api.exec("redo");
	}

	function init(ganttApi) {
		api = ganttApi;
		history = api.getReactiveState().history;
	}
</script>

<div class="rows">
	<div class="buttons">
		<div class="button">
			<Button
				type="primary"
				onclick={handleUndo}
				disabled={history && !$history.undo}
				>Undo
			</Button>
			{#if history && $history.undo}
				<span>{$history.undo}</span>
			{/if}
		</div>
		<div class="button">
			<Button
				type="primary"
				onclick={handleRedo}
				disabled={history && !$history.redo}
				>Redo
			</Button>
			{#if history && $history.redo}
				<span>{$history.redo}</span>
			{/if}
		</div>
	</div>

	<div class="gtcell">
		<ContextMenu {api}>
			<Gantt {init} {...skinSettings} {tasks} {links} {scales} undo />
		</ContextMenu>
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
	.buttons {
		display: flex;
		gap: 10px;
		padding: 8px 12px;
	}
	.gtcell {
		position: relative;
		height: calc(100% - 48px);
		border-top: var(--wx-gantt-border);
	}
	.button {
		position: relative;
	}
	.button span {
		background-color: var(--wx-color-danger);
		height: 18px;
		width: 18px;
		border-radius: 50px;
		position: absolute;
		text-align: center;
		font-size: 12px;
		line-height: 12px;
		padding: 3px 0;
		color: #fff;
		top: -6px;
		right: -6px;
	}
</style>
