<script lang="ts">
	import { getContext } from "svelte";
	import { Button } from "@svar-ui/svelte-core";
	import type { ILocale } from "@svar-ui/lib-dom";
	import type { IApi as ITableApi, IRow } from "@svar-ui/svelte-grid";
	import type {
		IApi,
		IAssignment,
		IParsedResource,
		TID,
	} from "@svar-ui/gantt-store";
	import type { IEditorSectionChange, TEditorTableColumn } from "../../types";

	import GridSection from "./GridSection.svelte";
	import ActionCell from "../grid/ActionCell.svelte";
	import ResourcesEditorCell from "./ResourcesEditorCell.svelte";
	import { tempID } from "@svar-ui/lib-state";

	type TAssignmentRow = IAssignment & { id: TID };
	type TResourceOption = IParsedResource & { label: string };

	type Props = {
		api: IApi;
		autoSave?: boolean;
		onextchange?: (ev: IEditorSectionChange) => void;
		taskAssignments?: TAssignmentRow[] | null;
	};

	const locale = getContext<ILocale>("wx-i18n");
	const _ = locale.getGroup("gantt");
	let {
		api,
		autoSave,
		onextchange: onchange,
		taskAssignments = null,
	}: Props = $props();

	const { activeTask, resources, _assignments, assignments } = $derived(
		api.getReactiveState()
	);

	let gridApi = $state<ITableApi>();
	let newRowId = $state<TID | null>(null);

	let taskResources = $derived.by((): TAssignmentRow[] => {
		void $_assignments;
		return (
			taskAssignments ||
			api.getTaskResources($activeTask as TID).map(r => {
				return { ...r, resource: r.id!, id: r.assignmentId };
			})
		);
	});

	const allOptions = $derived.by(() => {
		const items: TResourceOption[] = [];
		$resources!.eachChild(item => {
			if (!item.data) items.push({ ...item, label: item.name! });
		}, 0);
		return items;
	});

	const filteredOptions = $derived.by(() => {
		return allOptions.filter(
			r => !taskResources.find(a => a.resource === r.id)
		);
	});

	function getActionData(
		evData: IEditorSectionChange["event"]
	): IEditorSectionChange {
		return {
			view: "resources",
			event: evData,
			values: {
				taskAssignments: taskResources,
			},
		};
	}
	function deleteAssignment(id: TID) {
		gridApi!.exec("close-editor", { ignore: true });
		if (autoSave) {
			api.exec("delete-assignment", { id });
		} else {
			taskResources = taskResources.filter(a => a.id !== id);
			onchange?.(
				getActionData({
					id,
					action: "delete-assignment",
					data: { id },
				})
			);
		}
		newRowId = null;
	}

	function addAssignment(id: TID, assignment: Partial<IAssignment>) {
		assignment = {
			...assignment,
			units: 100,
			task: $activeTask as TID,
			id,
		};
		const item = { assignment: assignment as IAssignment };
		if (autoSave) {
			api.exec("add-assignment", item);
		} else {
			const r = $resources?.byId(assignment.resource!);
			taskResources = [
				...taskResources,
				{ ...r, ...assignment } as TAssignmentRow,
			];
			onchange?.(
				getActionData({
					id: r!.id,
					action: "add-assignment",
					data: item,
				})
			);
		}
	}

	function getRowOptions(row: IRow) {
		if (row.id === newRowId) return filteredOptions;
		const rowOption = allOptions.find(op => op.id === row.resource);
		return [rowOption!].concat(filteredOptions);
	}

	function updateAssignment(id: TID, assignment: Partial<IAssignment>) {
		let item: IAssignment | undefined = $assignments!.byId(id);
		if (!item) item = taskResources.find(a => a.id === id);
		const update = {
			id,
			assignment: {
				units: item!.units || 100,
				...assignment,
				id,
			} as IAssignment,
		};

		if (autoSave) {
			api.exec("update-assignment", update);
		} else {
			if (assignment.resource && assignment.resource !== item!.resource) {
				const r = $resources?.byId(assignment.resource);
				assignment = { ...r, ...update.assignment };
			}

			taskResources = taskResources.map(item =>
				item.id === id ? { ...item, ...assignment } : item
			);
			onchange?.(
				getActionData({
					id,
					action: "update-assignment",
					data: update,
				})
			);
		}
	}

	const columns = $derived.by((): TEditorTableColumn[] => {
		void filteredOptions;
		return [
			{
				id: "resource",
				header: _("Resource"),
				cell: ResourcesEditorCell,
				flexgrow: 3,
				editor: (row?: IRow) => {
					return {
						type: "combo",
						config: {
							options: getRowOptions(row!),
							cell: ResourcesEditorCell,
						},
					};
				},
				options: allOptions,
			},
			{
				id: "units",
				header: _("Units"),
				flexgrow: 1,
				editor: {
					type: "text",
					config: { type: "number" },
				},
				template: (v: number) => `${v}%`,
			},
			{
				id: "delete",
				header: "",
				cell: ActionCell,
				width: 50,
				align: "center",
			},
		];
	});

	function onAction(id: TID, action: string) {
		if (id && action === "delete") deleteAssignment(id);
	}

	function onEdit(id: TID, column: TID, value: any) {
		if (column === "units") updateAssignment(id, { units: value * 1 });
		else if (column === "resource") {
			const assignmentData = { resource: value };
			if (id === newRowId) {
				addAssignment(id, assignmentData);
			} else {
				updateAssignment(id, assignmentData);
			}
		}

		newRowId = null;
	}

	function oninit(tApi: ITableApi) {
		gridApi = tApi;
		// delete a new empty row if an editor closed without resource selection
		gridApi.on("close-editor", () => {
			if (newRowId) {
				gridApi!.exec("delete-row", { id: newRowId });
				newRowId = null;
			}
		});
	}

	const addingDisabled = $derived(
		(newRowId || !filteredOptions.length) as boolean
	);

	let pending = false;
	function onAddClick() {
		gridApi?.exec("close-editor", { ignore: true });
		if (!pending) {
			pending = true;
			newRowId = tempID();
			requestAnimationFrame(() => {
				addRow(newRowId!);
				pending = false;
			});
		}
	}

	function addRow(id: TID) {
		gridApi!.exec("add-row", { id, row: { units: 100 } });
		setTimeout(() => {
			gridApi!.exec("open-editor", { id, column: "resource" });
		});
	}
</script>

<div class="wx-section">
	{#if taskResources.length || newRowId}
		<GridSection
			{oninit}
			{columns}
			onaction={onAction}
			onedit={onEdit}
			data={taskResources}
			sizes={{
				rowHeight: 52,
			}}
		/>
	{:else}
		<div class="wx-nodata">{_("No assignments")}</div>
	{/if}
	<div class="wx-button-wrapper">
		<Button
			disabled={addingDisabled}
			icon="wxi-plus"
			css="wx-button"
			onclick={onAddClick}
		>
			{_("Add resource")}
		</Button>
	</div>
</div>

<style>
	.wx-section {
		margin-bottom: 10px;
	}

	.wx-nodata {
		color: var(--wx-gantt-icon-color);
		margin-top: 8px;
	}
	.wx-button-wrapper {
		margin-top: 12px;
		width: 100%;
	}
	.wx-button-wrapper :global(.wx-button) {
		width: 100% !important;
		background-color: inherit;
		border: var(--wx-table-cell-border);
	}
</style>
