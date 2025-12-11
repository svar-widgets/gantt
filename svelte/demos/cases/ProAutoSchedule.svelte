<script>
	import { getData } from "../data";
	import { Gantt, Editor, ContextMenu } from "../../src";
	import { DatePicker, Field } from "@wx/svelte-core";

	let { skinSettings } = $props();
	let api = $state();
	let projectStart = $state(new Date(2026, 3, 2));

	const data = getData();
</script>

<div class="demo">
	<div class="bar">
		<Field label="Project start" position="left">
			<DatePicker bind:value={projectStart} />
		</Field>
	</div>
	<div class="gantt">
		<Editor {api} />
		<ContextMenu {api}>
			<Gantt
				{...skinSettings}
				bind:this={api}
				tasks={data.tasks}
				links={data.links}
				scales={data.scales}
				schedule={{ auto: true }}
				{projectStart}
				projectEnd={new Date(2026, 5, 2)}
			/>
		</ContextMenu>
	</div>
</div>

<style>
	.demo {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.bar {
		display: flex;
		align-items: center;
		padding: 12px;
		gap: 20px;
		border-bottom: var(--wx-gantt-border);
	}

	.gantt {
		position: relative;
		height: 100%;
		overflow: hidden;
	}
	:global(.bar .wx-field.wx-left) {
		margin-bottom: 0px;
	}
</style>
