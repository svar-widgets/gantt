<script>
	import { getData } from "../data";
	import { Gantt } from "../../src";
	import { RadioButtonGroup, DatePicker } from "@svar-ui/svelte-core";

	let { skinSettings } = $props();

	const MODE_OFF = 0;
	const MODE_DATE = 1;

	let mode = $state(MODE_DATE);
	let date = $state(new Date("2026-04-04T00:00:00"));
	const progressLine = $derived(mode === MODE_OFF ? false : date);

	const options = ["Off", "Custom date"].map((label, id) => ({
		id,
		label,
	}));

	const { tasks, links, scales } = getData();
</script>

<div class="rows">
	<div class="bar">
		<RadioButtonGroup {options} type="inline" bind:value={mode} />
		<div>
			<DatePicker disabled={mode !== MODE_DATE} bind:value={date} />
		</div>
	</div>
	<div class="gtcell">
		<Gantt
			{...skinSettings}
			{progressLine}
			{tasks}
			{links}
			{scales}
			cellWidth={20}
			zoom
		/>
	</div>
</div>

<style>
	.rows {
		position: relative;
		display: flex;
		flex-direction: column;
		background: var(--wx-background);
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.bar {
		padding: 10px;

		display: flex;
		align-items: center;
	}
	.gtcell {
		position: relative;
		height: 100%;
		border-top: var(--wx-gantt-border);
		overflow: hidden;
	}
</style>
