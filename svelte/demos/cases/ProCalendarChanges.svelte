<script>
	import { getData } from "../data";
	import { Gantt, Editor } from "../../src";
	import { Calendar } from "@wx/gantt-store";
	import { Button } from "@wx/svelte-core";

	let { skinSettings } = $props();

	let { tasks, links, scales } = $state(getData("calendar"));
	const calendar = new Calendar({
		weekHours: {
			monday: 8,
			tuesday: 8,
			wednesday: 8,
			thursday: 8,
			friday: 8,
			saturday: 0,
			sunday: 0,
		},
	});

	function addNewRule() {
		calendar.addRule(date => {
			const weekday = date.getDay();
			if (weekday === 3) return 0;
		});

		tasks = api.serialize().map(task => {
			if (!calendar.isWorkingDay(task.start)) {
				task.start = calendar.getNextWorkingDay(task.start);
			}
			return task;
		});
	}

	let api = $state();
</script>

<div class="rows">
	<div class="bar">
		<span> Rule: every Wednesday is off</span>
		<Button type="primary" onclick={addNewRule}>Add rule</Button>
	</div>

	<div class="gtcell">
		<Gantt
			{...skinSettings}
			bind:this={api}
			{calendar}
			{tasks}
			{links}
			{scales}
			cellWidth={60}
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
		display: flex;
		align-items: center;
		gap: 20px;
	}
	.gtcell {
		position: relative;
		height: calc(100% - 56px);
		border-top: var(--wx-gantt-border);
	}
</style>
