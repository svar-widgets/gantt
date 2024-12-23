<script>
	import { getData, bigScales } from "../data";
	import { Gantt } from "../../src/";
	import { Select } from "wx-svelte-core";

	let { skinSettings } = $props();

	const data = getData();
	const options = [
		{ id: "hour", label: "Hour" },
		{ id: "day", label: "Day" },
		{ id: "week", label: "Week" },
		{ id: "month", label: "Month" },
		{ id: "quarter", label: "Quarter" },
	];

	let lengthUnit = $state("day");

	const scales = $derived.by(() => {
		let scales;
		switch (lengthUnit) {
			case "hour":
				scales = [
					{ unit: "month", step: 1, format: "MMM" },
					{ unit: "day", step: 1, format: "MMM d" },
				];
				break;
			case "day":
				scales = [
					{ unit: "month", step: 1, format: "MMM" },
					{ unit: "week", step: 1, format: "w" },
				];
				break;
			case "week":
				scales = [
					{ unit: "year", step: 1, format: "yyyy" },
					{ unit: "month", step: 1, format: "MMM" },
				];
				break;
			case "month":
				scales = [
					{ unit: "year", step: 1, format: "yyyy" },
					{ unit: "quarter", step: 1, format: "QQQ" },
				];
				break;
			case "quarter":
				scales = [{ unit: "year", step: 1, format: "yyyy" }];
				break;
			default:
				scales = bigScales;
		}
		return scales;
	});
</script>

<div class="demo">
	<div class="bar">
		<Select bind:value={lengthUnit} {options} />
	</div>
	<div class="gantt">
		<Gantt
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			{scales}
			{lengthUnit}
			cellWidth={300}
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
		padding: 20px;
		background-color: var(--wx-background);
		border: var(--wx-border);

		--wx-input-width: 100px;
	}

	.gantt {
		position: relative;
		height: calc(100% - 74px);
	}
</style>
