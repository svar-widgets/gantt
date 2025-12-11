<script>
	import { getData } from "../data";
	import { Gantt, Editor } from "../../src";
	import { DatePicker, Field, Locale, RichSelect } from "@svar-ui/svelte-core";

	let { skinSettings } = $props();

	const data = getData("critical");

	let api = $state();
	let pathMode = $state("flexible");
	let projectStart = $state(new Date(2026, 3, 2));
	let projectEnd = $state(new Date(2026, 3, 12));

	function init(ganttApi) {
		api = ganttApi;
	}
</script>

<div class="demo">
	<Locale>
		<div class="bar">
			<Field label="Mode" position="left">
				<RichSelect
					options={[
						{ id: "flexible", label: "Flexible" },
						{ id: "strict", label: "Strict" },
					]}
					bind:value={pathMode}
				/>
			</Field>
			<Field label="Project start" position="left">
				<DatePicker bind:value={projectStart} />
			</Field>
			<Field label="Project end" position="left">
				<DatePicker bind:value={projectEnd} />
			</Field>
		</div>
	</Locale>
	<Gantt
		{...skinSettings}
		{init}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
		criticalPath={{ type: pathMode }}
		{projectStart}
		{projectEnd}
	/>
</div>
<Editor {api} />

<style>
	.demo {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.bar {
		display: flex;
		justify-content: center;
		padding: 12px;
		border-bottom: var(--wx-gantt-border);
	}
</style>
