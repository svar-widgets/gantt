<script lang="ts">
	import { getData } from "../data";
	import { Gantt, ContextMenu, Editor } from "@svar-ui/svelte-gantt";
	import { Button } from "@svar-ui/svelte-core";
	import type { IDemoProps } from "../types";
	import type { IApi } from "@svar-ui/svelte-gantt";

	let { skinSettings }: IDemoProps = $props();

	let api = $state<IApi>(),
		menu = $state<ReturnType<typeof ContextMenu>>();
	const data = getData();

	const resolver = () => {
		const id = $selected!.length ? $selected![$selected!.length - 1] : null;
		return id ? api!.getTask(id) : null;
	};

	const selected = $derived.by(() => {
		return api ? api.getReactiveState().selected : null;
	});
</script>

<ContextMenu {api} {resolver} at="right" bind:this={menu} />

<div class="rows">
	<div class="bar">
		<Button type="primary" onclick={(ev: MouseEvent) => menu!.show(ev)}
			>Task action</Button
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
