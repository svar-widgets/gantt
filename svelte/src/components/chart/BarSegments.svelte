<script>
	import { getContext } from "svelte";
	import { getSegmentProgress } from "@svar-ui/gantt-store";

	let { task, type } = $props();

	const api = getContext("gantt-store");
	const { inactiveTasks } = api.getReactiveState();

	function segmentStyle(i) {
		const s = task.segments[i];
		return `left:${s.$x}px;top:0px;width:${s.$w}px;height:100%;`;
	}
</script>

<div class="wx-segments">
	{#each task.segments as seg, i (i)}
		<div
			class="wx-segment wx-bar wx-{type}"
			class:wx-inactive={$inactiveTasks && task.inactive}
			data-segment={i}
			style={segmentStyle(i)}
		>
			{#if task.progress}
				<div class="wx-progress-wrapper">
					<div
						class="wx-progress-percent"
						style="width:{getSegmentProgress(task, i)}%"
					></div>
				</div>
			{/if}
			<div class="wx-content">
				{seg.text || ""}
			</div>
		</div>
	{/each}
</div>

<style>
	.wx-segments {
		position: relative;
		width: 100%;
		height: 100%;
	}
	.wx-segment {
		height: 100%;
	}
	.wx-segments::before {
		content: "";
		position: absolute;
		top: 50%;
		left: 0;
		width: 100%;
		height: 0;
		border-top: 1px dashed #7f7f7f;
		transform: translateY(-50%);
	}

	.wx-progress-percent {
		background-color: var(--wx-gantt-task-fill-color);
	}
</style>
