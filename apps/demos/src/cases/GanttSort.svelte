<script lang="ts">
	import { getData, zoomConfig } from "../data";
	import { Gantt } from "@svar-ui/svelte-gantt";
	import type { IDemoProps } from "../types";
	import type { IApi } from "@svar-ui/svelte-gantt";

	let { skinSettings }: IDemoProps = $props();

	const data = getData();

	function init(api: IApi) {
		api.intercept("sort-tasks", config => {
			return config.key === "text";
		});
	}
</script>

<div class="demo">
	<h4>Sorting by the "Task Name" column only</h4>
	<div class="gtcell">
		<Gantt
			{init}
			{...skinSettings}
			tasks={data.tasks}
			links={data.links}
			zoom={zoomConfig}
		/>
	</div>
</div>

<style>
	.demo {
		display: flex;
		flex-direction: column;
		gap: 10px;
		height: 100%;
	}

	.gtcell {
		overflow: hidden;
		border: var(--wx-gantt-border);
		height: calc(100% - 32px);
	}
</style>
