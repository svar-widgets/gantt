<script>
	import { getData, resources, assignments } from "../data";
	import { Gantt, ContextMenu, getDefaultColumns, Editor } from "../../src";
	import { Field, Switch, Button, Dropdown } from "@svar-ui/svelte-core";

	let { skinSettings } = $props();

	const data = getData();
	let api = $state();

	let tasks = $state([...data.tasks]);

	let enabled = $state(false);
	let multipleResources = $state(false);
	let resourceHierarchy = $state(false);
	let popup = $state(false);

	const groupBy = $derived(
		enabled
			? {
					field: "resource",
					multipleResources,
					resourceHierarchy,
				}
			: null
	);

	const columns = $derived.by(() => {
		let cols = getDefaultColumns({ resources: true });
		cols.find(c => c.id === "resources").editor = "multiselect";

		// drop the resources column when grouping by resource
		if (enabled) {
			const index = cols.findIndex(c => c.id === "resources");
			if (index >= 0) cols.splice(index, 1);
		}

		return cols;
	});

	function init(ganttApi) {
		api = ganttApi;
	}

	function onResourceOptionChange() {
		if (multipleResources) resourceHierarchy = false;
	}
</script>

<ContextMenu {api}>
	<div class="demo">
		<div class="bar">
			<div class="group-controls">
				<div class="toggle">
					<Field label="Group by resource" position="left">
						<Switch bind:value={enabled}></Switch>
					</Field>
				</div>
				<div class="settings-anchor">
					<Button disabled={!enabled} onclick={() => (popup = true)}>
						Settings
					</Button>
					{#if popup}
						<Dropdown
							width="auto"
							oncancel={() => (popup = false)}
							css="my-dropdown"
						>
							<div class="dropdown-wrapper">
								<div class="switch">
									<Field
										label="Multiple resources"
										position="left"
									>
										<Switch
											onchange={onResourceOptionChange}
											bind:value={multipleResources}
										></Switch>
									</Field>
								</div>
								<div class="switch">
									<Field
										label="Resource hierarchy"
										position="left"
									>
										<Switch
											onchange={onResourceOptionChange}
											bind:value={resourceHierarchy}
											disabled={multipleResources}
										></Switch>
									</Field>
								</div>
							</div>
						</Dropdown>
					{/if}
				</div>
			</div>
		</div>

		<div class="gtcell">
			<Gantt
				{init}
				{...skinSettings}
				{tasks}
				{columns}
				{resources}
				{assignments}
				{groupBy}
				links={data.links}
				scales={data.scales}
				undo
			/>
		</div>

		<Editor {api} />
	</div>
</ContextMenu>

<style>
	.demo {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		min-height: 50px;
		gap: 20px;
		border-bottom: var(--wx-gantt-border);
	}
	.group-controls {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0 12px;
	}
	.settings-anchor {
		position: relative;
	}
	.toggle {
		display: flex;
		align-items: center;
		& :global(.wx-field) {
			width: auto;
		}
		& :global(.wx-label) {
			width: auto !important;
			padding-top: 2px !important;
			white-space: nowrap;
		}
	}
	.gtcell {
		flex: 1;
		min-height: 0;
		border-top: var(--wx-gantt-border);
	}

	.switch {
		width: 230px;
		display: flex;
		align-items: center !important;
		& :global(.wx-label) {
			width: 140px !important;
			padding-top: 2px !important;
		}
	}

	.dropdown-wrapper {
		padding: 16px 0 0 16px;
	}
</style>
