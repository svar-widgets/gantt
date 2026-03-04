<script>
	import { getData } from "../../demos/data";
	import { Gantt, Editor, ContextMenu, Tooltip } from "../../src";
	import { Willow } from "@svar-ui/svelte-core";

	let { skinSettings } = $props();
	let api = $state();

	// svelte-ignore non_reactive_update
	let { tasks, links, scales } = getData();
	tasks = [
		{
			id: "0",
			start: new Date(2026, 3, 2),
			duration: 3,
			text: "Start",
			progress: 100,
			parent: 0,
			type: "task",
			details: "Start.",
		},
		...tasks.map(t => {
			return {
				...t,
				id: String(t.id),
				parent: t.parent ? String(t.parent) : 0,
			};
		}),
	];

	links = links.map(l => {
		return {
			...l,
			id: String(l.id),
			source: String(l.source),
			target: String(l.target),
		};
	});
</script>

<div class="demo">
	<Willow>
		<Editor {api} />
		<Tooltip {api}>
			<ContextMenu {api}>
				<Gantt
					{...skinSettings}
					bind:this={api}
					{tasks}
					{links}
					{scales}
					schedule={{ auto: true }}
					projectStart={new Date(2026, 3, 2)}
					projectEnd={new Date(2026, 5, 2)}
				/>
			</ContextMenu>
		</Tooltip>
	</Willow>
</div>

<style>
	.demo {
		height: 100%;
		display: flex;
		flex-direction: column;
	}
</style>
