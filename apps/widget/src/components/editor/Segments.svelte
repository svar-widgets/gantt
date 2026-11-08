<script lang="ts">
	import { getContext } from "svelte";
	import { dateToString } from "@svar-ui/lib-dom";
	import type { ILocale } from "@svar-ui/lib-dom";
	import type { IApi as ITableApi } from "@svar-ui/svelte-grid";
	import { prepareEditTask } from "@svar-ui/gantt-store";
	import type { IApi, ITask, TID } from "@svar-ui/gantt-store";
	import type { IEditorSectionChange, TEditorTableColumn } from "../../types";

	const l = getContext<ILocale>("wx-i18n");
	const _ = l.getGroup("gantt");
	const i18nData = l.getRaw() as Record<string, any>;
	const f = i18nData.gantt?.dateFormat || i18nData.formats?.dateFormat;
	const dateFormat = dateToString(f, i18nData.calendar);

	import GridSection from "./GridSection.svelte";
	import { tempID } from "@svar-ui/lib-state";
	import ActionCell from "../grid/ActionCell.svelte";

	type TSegment = Partial<ITask> & { id: TID };

	type Props = {
		api: IApi;
		autoSave?: boolean;
		segments?: TSegment[] | null;
		onextchange?: (ev: IEditorSectionChange) => void;
	};

	let { api, autoSave, segments, onextchange: onchange }: Props = $props();

	const { _activeTask } = $derived(api.getReactiveState());

	let segmentsState = $state<TSegment[]>([]);

	function getSegmentsData(): TSegment[] {
		if (!$_activeTask || segments === null) return [];
		return segments
			? [...segments]
			: ($_activeTask?.segments?.map(s => ({
					...s,
					id: s.id || tempID(),
				})) as TSegment[]);
	}

	$effect(() => {
		segmentsState = getSegmentsData();
	});

	const columns = $derived.by((): TEditorTableColumn[] => {
		return [
			{
				id: "text",
				header: _("Name"),
				flexgrow: 3,
				editor: "text",
			},
			{
				id: "start",
				header: _("Start"),
				flexgrow: 2,
				template: (v: Date) => dateFormat(v),
				editor: "datepicker",
			},
			{
				id: "duration",
				header: _("Duration"),
				flexgrow: 2,
				editor: {
					type: "text",
					config: { type: "number" },
				},
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

	let gridApi = $state<ITableApi | null>(null);

	function oninit(t: ITableApi) {
		gridApi = t;
	}

	function getActionData(
		evData: IEditorSectionChange["event"]
	): IEditorSectionChange {
		return {
			view: "segments",
			event: evData,
			values: {
				segments: segmentsState.length ? [...segmentsState] : null,
			},
		};
	}

	function deleteSegment(id: TID) {
		const index = segmentsState.findIndex(s => s.id === id);
		segmentsState = segmentsState.filter((_s, i) => i !== index);

		const update = {
			id: $_activeTask!.id!,
			task: {
				segments: segmentsState.length ? [...segmentsState] : null,
			},
		};
		if (autoSave) {
			api.exec("update-task", update);
		} else {
			onchange?.(
				getActionData({
					id,
					action: "update-task",
					data: update,
				})
			);
		}
	}

	function onaction(id: TID, action: string) {
		if (action === "delete") deleteSegment(id);
	}

	function onedit(id: TID, column: TID, value: any) {
		const { data } = gridApi!.getState();
		let index = data.findIndex(s => s.id === id);
		if (column === "duration") value = value * 1;
		const segment = { ...segmentsState[index], [column]: value };
		prepareEditTask(
			segment,
			api.getState(),
			api.getTaskCalendar($_activeTask!),
			column as string
		);
		const update = {
			id: $_activeTask!.id!,
			segmentIndex: index,
			task: segment,
		};

		if (autoSave) {
			api.exec("update-task", update);
		} else {
			segmentsState = segmentsState.map(s =>
				s.id === id ? { ...s, ...segment } : s
			);
			onchange?.(
				getActionData({
					id,
					action: "update-task",
					data: update,
				})
			);
		}
	}
</script>

<div class="wx-section">
	{#if segmentsState.length}
		<GridSection
			{columns}
			{oninit}
			{onaction}
			data={segmentsState}
			{onedit}
		/>
	{:else}
		<div class="wx-nodata">{_("No segments")}</div>
	{/if}
</div>

<style>
	.wx-section {
		margin-bottom: 10px;
	}
	.wx-nodata {
		color: var(--wx-gantt-icon-color);
		margin-top: 8px;
	}
</style>
