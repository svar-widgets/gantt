<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";
	import { Button } from "wx-svelte-core";
	export let skinSettings;

	const data = getData();

	let api;
	let sortConfig = {};
	let icons = getIcons();

	function getIcons() {
		const obj = { text: "", start: "", duration: "" };
		const { key, order } = sortConfig;
		if (key) obj[key] = `wxi-arrow-${order == "asc" ? "up" : "down"}`;
		return obj;
	}

	function sort(id) {
		const { key, order } = sortConfig;
		let newOrder = !key ? "desc" : "asc";

		if (key === id) newOrder = order === "asc" ? "desc" : "asc";

		api.exec("sort-tasks", { key: id, order: newOrder });
	}

	$: {
		if (api) {
			api.on("sort-tasks", config => {
				sortConfig = config;
				icons = getIcons();
			});
		}
	}
</script>

<div class="rows">
	<div class="bar">
		<div class="label">Sort by</div>
		<Button click={() => sort("text")}
			>Task Name <i class={icons.text} /></Button
		>
		<Button click={() => sort("start")}
			>Start Date <i class={icons.start} /></Button
		>
		<Button click={() => sort("duration")}
			>Duration <i class={icons.duration} /></Button
		>
	</div>

	<div class="gtcell">
		<Gantt
			bind:api
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
		/>
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
		padding: 10px 14px;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.gtcell {
		position: relative;
		height: 100%;
		border-top: var(--wx-gantt-border);
		overflow: hidden;
	}
	.label {
		padding-right: 10px;
		font-size: var(--wx-font-size);
		font-weight: var(--wx-label-font-weight);
	}
	i {
		position: relative;
		right: -5px;
	}
</style>
