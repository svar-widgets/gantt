<script>
	import { getData } from "../data";
	import { Gantt, defaultEditorShape, ContextMenu } from "../../src";

	let { skinSettings } = $props();

	const dayDiff = (next, prev) => {
		const d = (next - prev) / 1000 / 60 / 60 / 24;
		return Math.ceil(Math.abs(d));
	};

	const data = getData();

	let tasks = data.tasks;
	let gApi = $state();
	let editorShape = $state(defaultEditorShape);

	/**
     * 
        The formula of calculation is ∑d*p / ∑d , where "d" is task duration in days,
		"p" is the task progress and "∑" stands for a sum of all loaded tasks
     */
	function getSummaryProgress(id) {
		const [totalProgress, totalDuration] = collectProgressFromKids(id);
		const res = totalProgress / totalDuration;
		return isNaN(res) ? 0 : Math.round(res);
	}
	function collectProgressFromKids(id) {
		let totalProgress = 0,
			totalDuration = 0;
		const kids = gApi.getTask(id).data;

		kids?.forEach(kid => {
			let duration = 0;
			if (kid.type !== "milestone" && kid.type !== "summary") {
				duration = kid.duration || dayDiff(kid.end, kid.start);
				totalDuration += duration;
				totalProgress += duration * kid.progress;
			}

			const [p, d] = collectProgressFromKids(kid.id);
			totalProgress += p;
			totalDuration += d;
		});
		return [totalProgress, totalDuration];
	}

	function recalcSummaryProgress(id, self) {
		const { tasks } = gApi.getState();
		const task = gApi.getTask(id);

		if (task.type != "milestone") {
			const summary =
				self && task.type === "summary" ? id : tasks.getSummaryId(id);

			if (summary) {
				const progress = getSummaryProgress(summary);
				gApi.exec("update-task", {
					id: summary,
					task: { progress },
				});
			}
		}
	}

	function init(api) {
		gApi = api;

		// provide valid progresses from start
		// will load data and then explicitely update summary tasks
		api.getState().tasks.forEach(task => {
			recalcSummaryProgress(task.id, true);
		});

		// auto progress calculations
		api.on("add-task", ({ id }) => {
			recalcSummaryProgress(id);
		});
		api.on("update-task", ({ id }) => {
			recalcSummaryProgress(id);
		});

		api.on("delete-task", ({ source }) => {
			recalcSummaryProgress(source, true);
		});
		api.on("copy-task", ({ id }) => {
			recalcSummaryProgress(id);
		});
		api.on("move-task", ({ id, source, inProgress }) => {
			if (inProgress) return;

			if (api.getTask(id).parent != source)
				recalcSummaryProgress(source, true);
			recalcSummaryProgress(id);
		});

		// disabling progress slider for summary tasks
		api.on("show-editor", ({ id }) => {
			if (id) {
				const type = api.getTask(id).type;
				const slider = defaultEditorShape.find(
					e => e.key == "progress"
				);
				slider.config = { disabled: type === "summary" };
				editorShape = defaultEditorShape;
			}
		});
	}
</script>

<div class="wrapper">
	<ContextMenu api={gApi}>
		<div class="gt-cell">
			<Gantt
				{...skinSettings}
				{init}
				{tasks}
				links={data.links}
				scales={data.scales}
				{editorShape}
				cellWidth={30}
			/>
		</div>
	</ContextMenu>
</div>

<style>
	.gt-cell > :global(.wx-gantt .wx-summary .wx-progress-marker) {
		display: none;
	}
</style>
