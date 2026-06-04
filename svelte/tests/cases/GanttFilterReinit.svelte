<script>
	// Demonstrates: an active filter is dropped when Gantt.init() re-runs
	// because of an UNRELATED prop change. The filter here is applied through
	// the column HEADER filter - the bug is not specific to the filter-tasks
	// API, any filter ends up on the task tree and is lost when it is rebuilt.
	//
	//   1. Type a few letters into the "Task name" column filter - rows filter.
	//   2. Click "Change row height" - this changes only `cellHeight`. The task
	//      data is untouched, but it still forces Gantt.init() to re-run.
	//   3. init() rebuilds the task tree from scratch; the rebuilt tree has no
	//      filter applied, so the hidden rows reappear and links vanish - yet
	//      _isFiltered is still true. View and filter state disagree.

	import { tick } from "svelte";
	import { getData } from "../../demos/data";
	import { Gantt } from "../../src/";
	import { Button, Willow } from "@svar-ui/svelte-core";

	const data = getData();
	let api = $state();

	// an unrelated, non-tasks prop
	let cellHeight = $state(38);
	let status = $state("");

	// column headers with an inline (header) filter on the task name
	const textfilter = { filter: { type: "text", config: { clear: true } } };
	const columns = [
		{ id: "text", header: ["Task name", textfilter], width: 220 },
		{ id: "start", header: "Start", width: 100, align: "center" },
		{ id: "duration", header: "Duration", width: 90, align: "center" },
	];

	function init(ganttApi) {
		api = ganttApi;
	}

	// live readout: filter state vs. what the tree actually shows
	$effect(() => {
		const timer = setInterval(() => {
			const st = api?.getState();
			if (!st?.tasks) return;
			status =
				`_isFiltered: ${st._isFiltered} | ` +
				`visible rows: ${st.tasks.toArray().length}/` +
				`${st.tasks.toArray(true).length}`;
		}, 300);
		return () => clearInterval(timer);
	});

	async function changeRowHeight() {
		cellHeight = cellHeight === 38 ? 54 : 38;
		await tick(); // let Gantt.init() re-run
	}
</script>

<Willow>
	<div class="demo">
		<div class="bar">
			<Button type="primary" onclick={changeRowHeight}>
				Change row height (unrelated prop)
			</Button>
			<span class="status">{status}</span>
		</div>
		<p class="hint">
			Filter via the <b>Task name</b> column header, then click the
			button. Bug: the filtered-out rows reappear and links disappear, but
			<code>_isFiltered</code> stays <code>true</code> - init() rebuilt the
			task tree for an unrelated prop change and never re-applied the filter.
		</p>
		<div class="gtcell">
			<Gantt
				{init}
				{cellHeight}
				{columns}
				tasks={data.tasks}
				links={data.links}
				scales={data.scales}
			/>
		</div>
	</div>
</Willow>

<style>
	.demo {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 12px;
		flex-wrap: wrap;
	}
	.status {
		font-family: monospace;
		font-size: 13px;
	}
	.hint {
		margin: 0 12px 12px;
		font-size: 13px;
		color: #b3261e;
	}
	.gtcell {
		position: relative;
		flex: 1;
		min-height: 0;
		border-top: var(--wx-gantt-border);
	}
</style>
