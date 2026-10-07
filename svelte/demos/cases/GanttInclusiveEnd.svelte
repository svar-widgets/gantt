<script>
	import { Gantt, Editor, ContextMenu, Tooltip } from "../../src";
	import { Checkbox } from "@svar-ui/svelte-core";
	import { getData } from "../data";
	import MyInclusiveEndTooltip from "../custom/MyInclusiveEndTooltip.svelte";

	let { skinSettings } = $props();

	const { tasks, links, scales } = getData();

	let api = $state();
	let inclusiveEnd = $state(true);

	const columns = [
		{ id: "text", header: "Task name", flexgrow: 1 },
		{
			id: "start",
			header: "Start",
			width: 100,
			align: "center",
			editor: "datepicker",
		},
		// shown by gantt: the default text and the editor
		{
			id: "end",
			header: "End",
			width: 100,
			align: "center",
			editor: "datepicker",
		},
		{
			id: "duration",
			header: "Duration",
			width: 100,
			align: "center",
			editor: { type: "text", config: { type: "number" } },
		},
		{ id: "add-task", header: "", width: 50, align: "center" },
	];
</script>

<div class="demo">
	<div class="bar">
		<Checkbox bind:value={inclusiveEnd} label="Inclusive end" />
		<span class="hint">
			Grid, editor, and tooltips show the last day covered; bars and
			durations do not change
		</span>
	</div>
	<div class="gantt">
		<ContextMenu {api}>
			<Tooltip {api} content={MyInclusiveEndTooltip}>
				<Gantt
					bind:this={api}
					{...skinSettings}
					{tasks}
					{links}
					{scales}
					{columns}
					{inclusiveEnd}
					gridWidth={540}
				/>
			</Tooltip>
		</ContextMenu>
		<Editor {api} />
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
		flex-wrap: wrap;
		align-items: center;
		padding: 8px 12px;
		gap: 8px 20px;
		border-bottom: var(--wx-gantt-border);
	}

	.hint {
		color: var(--wx-color-font-alt, #71717a);
		font-size: var(--wx-font-size, 14px);
	}

	.gantt {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}
</style>
