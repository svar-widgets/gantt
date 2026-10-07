<script>
	import { getData } from "../data";
	import {
		Gantt,
		Editor,
		ContextMenu,
		Toolbar,
		Tooltip,
		ConflictReport,
	} from "../../src";
	import ConstraintCell from "../custom/ConstraintCell.svelte";
	import MyConstraintTooltipContent from "../custom/MyConstraintTooltipContent.svelte";

	let { skinSettings } = $props();
	let api = $state();

	const data = getData("day", { constraints: true });

	const calendar = {
		weekHours: {
			monday: 8,
			tuesday: 8,
			wednesday: 8,
			thursday: 8,
			friday: 8,
			saturday: 0,
			sunday: 0,
		},
	};

	const columns = [
		{ id: "text", header: "Task name", flexgrow: 1 },
		{ id: "start", header: "Start date", align: "center", width: 100 },
		{
			id: "constraint",
			header: "Constraint",
			width: 160,
			cell: ConstraintCell,
		},
		{ id: "add-task", header: "Add task", width: 37, align: "center" },
	];
</script>

<div class="demo">
	<div class="toolbar-wrap">
		<Toolbar {api} />
	</div>
	<div class="gtcell">
		<Tooltip {api} content={MyConstraintTooltipContent}>
			<div class="gantt">
				<Editor {api} autoSave={false} />
				<ContextMenu {api}>
					<Gantt
						{...skinSettings}
						bind:this={api}
						tasks={data.tasks}
						links={data.links}
						scales={data.scales}
						{columns}
						{calendar}
						cellHeight={40}
						gridWidth={480}
						schedule={{ auto: true }}
						projectStart={new Date(2026, 3, 2)}
						undo
					/>
				</ContextMenu>
			</div>
			<ConflictReport {api} />
		</Tooltip>
	</div>
</div>

<style>
	.demo {
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.toolbar-wrap {
		flex: 0 0 auto;
	}
	.gtcell {
		flex: 1;
		min-height: 0;
		display: flex;
		border-top: var(--wx-gantt-border);
		overflow: hidden;
	}
	.gtcell :global(.wx-tooltip-area) {
		display: flex;
		flex: 1;
		min-width: 0;
		min-height: 0;
	}
	.gantt {
		position: relative;
		flex: 1;
		min-width: 0;
		height: 100%;
		overflow: hidden;
	}
</style>
