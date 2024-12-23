<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";

	import { Button } from "wx-svelte-core";

	let { skinSettings } = $props();

	let counter = 0;
	let gantts = $state([]);
	addGantt();
	addGantt();

	function addGantt() {
		gantts = [
			...gantts,
			{
				id: counter,
				data: getData("[" + counter + "] "),
			},
		];
		counter++;
	}

	function removeGantt(id) {
		gantts = gantts.filter(a => a.id !== id);
	}
</script>

<div class="rows">
	<div class="row">
		<Button type="primary" onclick={addGantt}>Add Gantt</Button>
	</div>

	{#each gantts as gantt}
		<div class="ganttCell">
			<div class="ganttHeader">
				<Button type="secondary" onclick={() => removeGantt(gantt.id)}>
					Delete Gantt
				</Button>
			</div>
			<div class="ganttBox">
				<Gantt
					{...skinSettings}
					tasks={gantt.data.tasks}
					links={gantt.data.links}
				/>
			</div>
		</div>
	{/each}
</div>

<style>
	.rows {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.row {
		padding: 13px;
	}

	.ganttCell {
		height: 410px;
		width: 100%;
		display: flex;
		flex-direction: column;
		margin-bottom: 10px;
	}

	.ganttHeader {
		padding: 13px;
		border-bottom: var(--wx-gantt-border);
	}

	.ganttBox {
		overflow: hidden;
	}
</style>
