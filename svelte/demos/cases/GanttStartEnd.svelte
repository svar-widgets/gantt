<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";

	import { DatePicker, Field, Locale, Switch } from "@wx/svelte-core";

	let { skinSettings } = $props();

	const data = getData();
	let start = $state(new Date(2026, 3, 5)),
		end = $state(new Date(2026, 4, 1)),
		autoScale = $state(false);
</script>

<div class="demo">
	<Locale>
		<div class="bar">
			<Field label="Start" position="left">
				<DatePicker bind:value={start} />
			</Field>
			<Field label="End" position="left">
				<DatePicker bind:value={end} />
			</Field>
			<Field label="autoScale" position="left">
				<div class="input">
					<Switch bind:value={autoScale} />
				</div>
			</Field>
		</div>
	</Locale>

	<div class="gantt">
		<Gantt
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
			{autoScale}
			zoom
			{start}
			{end}
		/>
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
		padding: 12px;
		border-bottom: var(--wx-gantt-border);
	}

	.gantt {
		position: relative;
		height: 100%;
		overflow: hidden;
	}
	.input {
		margin: 4px;
	}
</style>
