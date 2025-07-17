<script>
	import { getData } from "../data";
	import { Gantt, HeaderMenu } from "../../src/";
	import { RadioButtonGroup } from "wx-svelte-core";

	let { skinSettings } = $props();
	const data = getData();

	let api = $state();

	let selected = $state("all");
	const options = [
		{ id: "all", label: "All" },
		{ id: "some", label: "Some" },
	];
	const hidable = { start: true, duration: true };

	let columns = $derived(selected === "some" ? hidable : null);
</script>

<div class="rows">
	<div class="bar">
		<div>Right-click the grid header and select visible columns</div>
		<div class="bar">
			<div class="label">Columns that can be hidden:</div>
			<RadioButtonGroup {options} bind:value={selected} type="inline" />
		</div>
	</div>
	<div class="gtcell">
		<HeaderMenu {api} {columns}>
			<Gantt
				bind:this={api}
				{...skinSettings}
				tasks={data.tasks}
				links={data.links}
				scales={data.scales}
			/>
		</HeaderMenu>
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
		justify-content: space-between;
	}

	.gtcell {
		position: relative;
		height: 100%;
		border-top: var(--wx-gantt-border);
		overflow: hidden;
	}
	.label {
		padding-right: 20px;
		font-size: var(--wx-font-size);
	}
</style>
