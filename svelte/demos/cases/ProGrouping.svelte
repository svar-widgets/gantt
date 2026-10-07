<script>
	import { getData } from "../data";
	import { Gantt, getDefaultColumns, Editor, ContextMenu } from "../../src";
	import { Field, RichSelect, Switch } from "@svar-ui/svelte-core";
	import GroupTextCell from "../custom/GroupTextCell.svelte";

	let { skinSettings } = $props();

	const data = getData();

	let api = $state();
	let field = $state("priority");
	let taskHierarchy = $state(false);
	let ungroupedTop = $state(false);

	const groupBy = $derived.by(() => {
		if (field === "none") return null;
		return {
			field,
			taskHierarchy,
			ungrouped: ungroupedTop ? "top" : "bottom",
		};
	});

	const columns = $derived.by(() => {
		let cols = getDefaultColumns();

		// use custom cell for [GroupField: group value] template
		if (field) cols[0].cell = GroupTextCell;

		// delete columns that is used for grouping
		if (field) {
			const index = cols.findIndex(c => c.id === field);
			if (index >= 0) {
				cols.splice(index, 1);
			}
		}

		return cols;
	});
</script>

<div class="demo">
	<div class="bar">
		<div class="select">
			<Field label="Group by" position="left">
				<RichSelect
					dropdown={{ css: "select-dropdown" }}
					options={[
						{ id: "none", label: "- none -" },
						{ id: "duration", label: "duration" },
						{ id: "priority", label: "priority" },
						{ id: "progress", label: "progress" },
					]}
					bind:value={field}
				/>
			</Field>
		</div>
		<div class="switch">
			<Field label="Task hierarchy" position="left">
				<Switch bind:value={taskHierarchy} disabled={field === "none"}
				></Switch>
			</Field>
		</div>
		<div class="switch">
			<Field
				label="Top position for ungrouped tasks"
				position="left"
				type="checkbox"
			>
				<Switch bind:value={ungroupedTop} disabled={field === "none"}
				></Switch>
			</Field>
		</div>
	</div>
	<div class="gtcell">
		<ContextMenu {api}>
			<Gantt
				bind:this={api}
				{...skinSettings}
				tasks={data.tasks}
				links={data.links}
				scales={data.scales}
				{columns}
				{groupBy}
				undo
			/>
		</ContextMenu>
		<Editor {api} />
	</div>
</div>

<style>
	.demo {
		height: 100%;
		width: 100%;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
	}

	.bar {
		display: flex;
		align-items: center;
		border-bottom: var(--wx-gantt-border);
		padding: 12px;
		gap: 20px;
	}
	.gtcell {
		position: relative;
		overflow: hidden;
		height: calc(100% - 60px);
		border-top: var(--wx-gantt-border);
	}

	.select :global(.wx-field),
	.switch :global(.wx-field) {
		align-items: center !important;
	}

	.switch {
		display: flex;
		align-items: center !important;
		gap: 8px;
		& :global(.wx-field) {
			width: auto;
		}
		& :global(.wx-label) {
			width: auto !important;
			padding-top: 2px !important;
			white-space: nowrap;
		}
	}

	/* select styles */
	.select {
		width: 200px;
		& :global(.wx-field > .wx-label) {
			width: 65px !important;
			padding-top: 2px !important;
		}
		& :global(.wx-field-control) {
			max-width: calc(100% - 65px) !important;
		}
	}
	:global(.select-dropdown .wx-item[data-id=":none"]) {
		color: #888;
	}
</style>
