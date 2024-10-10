<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";

	import { DatePicker, Field, Locale } from "wx-svelte-core";

	export let skinSettings;

	const data = getData();
	let start = new Date(2024, 3, 5),
		end = new Date(2024, 4, 1);
</script>

<div class="demo">
	<Locale>
		<div class="bar">
			<Field label="Start" let:id>
				<DatePicker bind:value={start} {id} />
			</Field>
			<Field label="End" let:id>
				<DatePicker bind:value={end} {id} />
			</Field>
		</div>
	</Locale>

	<div class="gantt">
		<Gantt
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
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
</style>
