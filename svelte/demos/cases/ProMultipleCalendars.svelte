<script>
	import { getData } from "../data";
	import { Gantt, Editor } from "../../src";
	import { Field, Switch } from "@svar-ui/svelte-core";

	let { skinSettings } = $props();

	const { tasks, links, scales, calendars } = getData("calendars");
	let api = $state();

	let enabled = $state(false);
	const groupBy = $derived(enabled ? { field: "duration" } : null);
</script>

<div class="demo">
	<div class="bar">
		<Field label="Group by duration" position="left">
			<Switch bind:value={enabled}></Switch>
		</Field>
		<div class="labels">
			Wednesday off
			<div class="cell wednesday-off"></div>
			Weekends only
			<div class="cell weekends-only"></div>
			Part time
			<div class="cell part-time"></div>
		</div>
	</div>
	<div class="gt-cell">
		<Gantt
			{...skinSettings}
			bind:this={api}
			{groupBy}
			{calendars}
			calendar="default"
			{tasks}
			{links}
			{scales}
			cellWidth={60}
		/>
		<Editor {api} />
	</div>
</div>

<style>
	.demo {
		height: 100%;
	}
	.gt-cell {
		width: 100%;
		height: calc(100% - 50px);
		border-top: var(--wx-gantt-border);
	}
	.demo :global(.wednesday-off) {
		background-color: lavender;
	}
	.demo :global(.weekends-only) {
		background-color: #ffe7ea;
	}
	.demo :global(.part-time) {
		background-color: lightyellow;
	}
	.bar {
		padding-left: 12px;
		display: flex;
		align-items: center;
		border-bottom: var(--wx-gantt-border);
		& :global(.wx-field) {
			width: auto;
		}
		& :global(.wx-label) {
			width: auto !important;
			padding-top: 2px !important;
			white-space: nowrap;
		}
	}
	.cell {
		width: 60px;
		height: 36px;
		border-radius: 3px;
		margin: 6px;
	}
	.labels {
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		padding-left: 12px;
	}

	:global(.wx-willow-dark-theme) .demo :global(.wednesday-off) {
		background-color: #383650;
	}
	:global(.wx-willow-dark-theme) .demo :global(.weekends-only) {
		background-color: #4a2f37;
	}
	:global(.wx-willow-dark-theme) .demo :global(.part-time) {
		background-color: #45402a;
	}
</style>
