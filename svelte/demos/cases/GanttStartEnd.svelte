<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";

	import { DatePicker, Field, Locale, Switch } from "wx-svelte-core";

	let { skinSettings } = $props();

	const data = getData();
	let start = $state(new Date(2024, 3, 5)),
		end = $state(new Date(2024, 4, 1)),
		autoScale = $state(false);
</script>

<div class="demo">
	<Locale>
		<div class="bar">
			<Field label="Start" position="left">
				{#snippet children({ id })}
					<DatePicker bind:value={start} {id} />
				{/snippet}
			</Field>
			<Field label="End" position="left">
				{#snippet children({ id })}
					<DatePicker bind:value={end} {id} />
				{/snippet}
			</Field>
			<Field label="autoScale" position="left">
				{#snippet children({ id })}
					<div class="input">
						<Switch bind:value={autoScale} {id} />
					</div>
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
