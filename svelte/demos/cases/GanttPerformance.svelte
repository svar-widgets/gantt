<script>
	import { Gantt } from "../../src/";
	import { Button, Checkbox, Select } from "@svar-ui/svelte-core";

	const { skinSettings } = $props();

	// one summary with N chained leaves, one e2s link per consecutive pair.
	// Every link starts violated by a day, so a forward pass cascades the whole chain
	function getChainedData(maxSize, maxYears) {
		maxYears = maxYears || 2;
		maxSize = maxSize || 1000;

		const tasks = [
			{
				id: -1,
				text: "Tasks",
				parent: 0,
				type: "summary",
				open: true,
			},
		];
		const links = [];

		for (let i = 1; i <= maxSize; i++) {
			const ii = i % (365 * maxYears);
			const start = 2 + ii - (ii >= 13 ? 12 : 0);

			tasks.push({
				id: i,
				start: new Date(2026, 2, start),
				end: new Date(2026, 2, start + 2),
				text: "Task " + i,
				progress: (i % 10) * 10,
				parent: -1,
				type: "task",
			});

			if (i > 1)
				links.push({
					id: i - 1,
					source: i - 1,
					target: i,
					type: "e2s",
				});
		}

		return { tasks, links };
	}

	const years = 2;
	const fmt = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	const options = [1000, 5000, 10000, 50000, 100000].map(id => ({
		id,
		label: fmt(id),
	}));

	let count = $state(1000);
	let auto = $state(false);
	let data = $state();
	let start = $state();
	let outArea = $state();
	let renderKey = $state(0);

	// what the last scheduling pass cost: a drag drop, or the "auto" toggle
	let pass = $state(null);

	let t0 = 0; // 0 = no pass being timed
	let depth = 0; // nesting of update-task, the cascade re-enters the same bus
	let cascade = 0;
	let bracketed = false;
	let frame = 0;

	function beginPass(label) {
		cascade = 0;
		pass = { label, sync: null, paint: null, cascade: 0 };
		t0 = performance.now();
	}

	function initApi(api) {
		// intercept runs ahead of the store handler, on() runs after it, so the
		// pair brackets the synchronous pass: graph, forward walk and cascade
		api.intercept("update-task", ev => {
			// a pass whose sync phase is closed but never published is stale,
			// so a new top-level edit takes over instead of being counted into it
			if (!depth && !ev.inProgress && (!t0 || !bracketed)) {
				beginPass(ev.eventSource ? `${ev.eventSource} edit` : "drag");
				bracketed = true;
				// a cancelled nested event would leave the counter open
				setTimeout(() => (depth = 0), 0);
			} else if (t0) cascade++;
			depth++;
		});

		api.on("update-task", () => {
			if (depth) depth--;
			if (!depth && bracketed) {
				bracketed = false;
				pass = {
					...pass,
					cascade,
					sync: Math.round(performance.now() - t0),
				};
			}
		});

		// the pass publishes through setStateAsync, one timer later; the last
		// publish before a repaint is where the user actually sees the result
		api.getReactiveState().tasks.subscribe(() => {
			if (!t0) return;
			const started = t0;
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				pass = {
					...pass,
					cascade,
					paint: Math.round(performance.now() - started),
				};
				if (t0 === started) t0 = 0;
			});
		});
	}

	function render() {
		// a fresh dataset each time, so a previous scheduling pass
		// doesn't become the starting point of the next measurement
		data = { ...getChainedData(count, years), count };
		renderKey++;
		start = new Date();
		pass = null;
		t0 = depth = cascade = 0;
		bracketed = false;
	}

	function onAutoChange(ev) {
		// only switching it on runs a pass; switching it off does no work
		if (data && ev.value) beginPass("auto scheduling on");
	}

	$effect(() => {
		if (start && outArea) outArea.innerHTML = new Date() - start;
	});
</script>

<div class="rows">
	<div class="row">
		<div class="selector">
			<Select bind:value={count} {options} />
		</div>
		<div class="auto">
			<Checkbox
				bind:value={auto}
				label="Auto scheduling"
				onchange={onAutoChange}
			/>
			<span class="pro">PRO</span>
		</div>
		<Button type="primary" onclick={render}>Render tasks</Button>
		{#if start}
			<div>
				{fmt(data.count)} chained tasks rendered in
				<span bind:this={outArea}></span>
				ms
			</div>
		{/if}
		{#if pass}
			<div>
				{pass.label}:
				{pass.sync === null ? "-" : pass.sync} ms sync /
				{pass.paint === null ? "-" : pass.paint} ms to paint (
				{pass.cascade} cascade updates )
			</div>
		{/if}
	</div>

	{#if data}
		{#key renderKey}
			<div class="gtcell">
				<Gantt
					{...skinSettings}
					init={initApi}
					tasks={data.tasks}
					links={data.links}
					schedule={{ auto }}
				/>
			</div>
		{/key}
	{/if}
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

	.row {
		display: flex;
		align-items: center;
		gap: 20px;
		padding: 13px;
		font-family: var(--wx-font-family);
		font-size: var(--wx-font-size);
	}

	.auto {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.pro {
		color: var(--demo-framework-color);
		border: 1px solid var(--demo-framework-color);
		border-radius: 4px;
		padding: 0px 8px;
		font-size: 12px;
		font-weight: 600;
	}

	.selector :global(.wx-select) {
		width: 120px;
	}

	.gtcell {
		position: relative;
		height: 100%;
		min-height: 0;
		border-top: var(--wx-gantt-border);
		margin-bottom: 10px;
	}

	.gtcell:last-of-type {
		margin-bottom: 0;
	}
</style>
