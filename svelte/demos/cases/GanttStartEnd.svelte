<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";

	import { DatePicker, Field, Locale } from "wx-svelte-core";

	let { skinSettings } = $props();

	const data = getData();
	let start = $state(new Date(2024, 3, 5)),
		end = $state(new Date(2024, 4, 1));
</script>

<div class="demo">
	<Locale>
		<div class="bar">
			<Field label="Start">
				{#snippet children({ id })}
					<DatePicker bind:value={start} {id} />
				{/snippet}
			</Field>
			<Field label="End">
				{#snippet children({ id })}
					<DatePicker bind:value={end} {id} />
				{/snippet}
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
