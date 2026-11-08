<script lang="ts">
	import type { ComponentProps } from "svelte";
	import { Gantt } from "@svar-ui/svelte-gantt";
	import type { ILink, ITask, TID, TLinkType } from "@svar-ui/svelte-gantt";
	import { ExcelImport } from "@svar-ui/svelte-excel-import";
	import { Button } from "@svar-ui/svelte-core";
	import type { IDemoProps } from "../types";

	let { skinSettings }: IDemoProps = $props();

	type TImport = ComponentProps<typeof ExcelImport>;
	type TValidate = NonNullable<TImport["validate"]>;
	type TOnImport = NonNullable<TImport["onimport"]>;
	type TValidation = ReturnType<TValidate>;

	const taskFields: TImport["fields"] = [
		{
			id: "id",
			label: "ID",
			keywords: ["id", "identifier"],
		},
		{
			id: "text",
			label: "Task name",
			expectedType: "text",
			keywords: ["name", "title", "task"],
		},
		{
			id: "start",
			label: "Start date",
			expectedType: "date",
			required: true,
			keywords: ["start", "from", "begin"],
		},
		{
			id: "end",
			label: "End date",
			expectedType: "date",
			keywords: ["end", "finish", "to"],
		},
		{
			id: "duration",
			label: "Duration",
			expectedType: "number",
			keywords: ["duration", "length", "days"],
		},
		{
			id: "progress",
			label: "Progress",
			expectedType: "number",
			keywords: ["progress", "percent", "complete"],
		},
		{
			id: "type",
			label: "Type",
			keywords: ["type", "kind"],
		},
		{
			id: "parent",
			label: "Parent ID",
			keywords: ["parent", "group"],
		},
	];

	function validateTasks(mappings: Parameters<TValidate>[0]): TValidation {
		const errors: TValidation["errors"] = [];
		if (!mappings.start) {
			errors.push({
				fieldId: "start",
				code: "required",
				message: "Start date is required",
			});
		}
		if (
			mappings.type !== "milestone" &&
			!mappings.duration &&
			!mappings.end
		) {
			errors.push({
				fieldId: "duration",
				code: "required",
				message: "Map at least one of: Start date, End date, Duration",
			});
		}
		return { valid: errors.length === 0, errors, warnings: [] };
	}

	const linkFields: TImport["fields"] = [
		{
			id: "id",
			label: "ID",
			keywords: ["id", "identifier"],
		},
		{
			id: "source",
			label: "Source task ID",
			required: true,
			keywords: ["source", "from", "predecessor"],
		},
		{
			id: "target",
			label: "Target task ID",
			required: true,
			keywords: ["target", "to", "successor"],
		},
		{
			id: "type",
			label: "Type",
			expectedType: "text",
			keywords: ["type", "kind"],
		},
	];

	function validateLinks(mappings: Parameters<TValidate>[0]): TValidation {
		const errors: TValidation["errors"] = [];
		if (!mappings.source) {
			errors.push({
				fieldId: "source",
				code: "required",
				message: "Source task ID is required",
			});
		}
		if (!mappings.target) {
			errors.push({
				fieldId: "target",
				code: "required",
				message: "Target task ID is required",
			});
		}
		return { valid: errors.length === 0, errors, warnings: [] };
	}

	let activeWizard = $state<"tasks" | "links" | null>(null);
	let tasks = $state<ITask[]>([]);
	let links = $state<ILink[]>([]);
	let status = $state(
		"No data loaded. Click a button to import tasks or links."
	);

	function handleTasksImport(...[rows, result]: Parameters<TOnImport>) {
		tasks = rows.map(row => {
			const task: ITask = {
				id: row.id as TID,
				text: row.text as string,
				type: (row.type || "task") as string,
				progress: (row.progress ?? 0) as number,
				parent: (row.parent || 0) as TID,
			};
			if (row.start instanceof Date) task.start = row.start;
			if (row.end instanceof Date) task.end = row.end;
			if (row.duration != null) task.duration = row.duration as number;
			if (task.type === "summary") task.open = true;
			return task;
		});

		status = `Imported ${result.imported} task(s), skipped ${result.skipped}.`;
	}

	function handleLinksImport(...[rows, result]: Parameters<TOnImport>) {
		links = rows
			.filter(row => row.source != null && row.target != null)
			.map(row => ({
				id: row.id as TID,
				source: row.source as TID,
				target: row.target as TID,
				type: (row.type || "e2s") as TLinkType,
			}));

		status = `Imported ${result.imported} link(s), skipped ${result.skipped}.`;
	}
</script>

<div class="excel-import-demo">
	<div class="excel-import-toolbar">
		<Button type="primary" onclick={() => (activeWizard = "tasks")}>
			Import tasks
		</Button>
		<Button type="primary" onclick={() => (activeWizard = "links")}>
			Import links
		</Button>
		<span class="excel-import-status">{status}</span>
	</div>
	<div class="excel-import-gantt gtcell">
		<Gantt {...skinSettings} {tasks} {links} />
	</div>
	{#if activeWizard === "tasks"}
		<ExcelImport
			fields={taskFields}
			validate={validateTasks}
			onimport={handleTasksImport}
			onclose={() => (activeWizard = null)}
			autoClose={true}
		/>
	{/if}
	{#if activeWizard === "links"}
		<ExcelImport
			fields={linkFields}
			validate={validateLinks}
			onimport={handleLinksImport}
			onclose={() => (activeWizard = null)}
			autoClose={true}
		/>
	{/if}
</div>

<style>
	.excel-import-demo {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.excel-import-toolbar {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 12px 16px;
		border-bottom: var(--wx-border);
		background: var(--wx-background);
	}

	.excel-import-status {
		font: var(--wx-font);
		color: var(--wx-color-font);
		opacity: 0.7;
	}

	.excel-import-gantt {
		flex: 1;
		min-height: 0;
	}
</style>
