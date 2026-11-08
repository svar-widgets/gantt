<script lang="ts">
	import { getContext } from "svelte";
	import type { ILocale } from "@svar-ui/lib-dom";
	import type { IRow } from "@svar-ui/svelte-grid";
	import type {
		IApi,
		ILink,
		IOption,
		TID,
		TLinkType,
	} from "@svar-ui/gantt-store";
	import type {
		IEditorAction,
		IEditorSectionChange,
		TEditorTableColumn,
	} from "../../types";

	import ActionCell from "../grid/ActionCell.svelte";
	import GridSection from "./GridSection.svelte";
	import LinkTypeCell from "./LinkTypeCell.svelte";

	type TLinkRow = {
		id: TID;
		type: TLinkType;
		lag?: number;
		taskText?: string;
	};
	type TLinkGroup = { title: string; data: TLinkRow[] };

	type Props = {
		api: IApi;
		autoSave?: boolean;
		onextchange?: (ev: IEditorSectionChange) => void;
		batch?: string;
		edits?: Map<TID, IEditorAction> | null;
	};

	const _ = getContext<ILocale>("wx-i18n").getGroup("gantt");
	let {
		api,
		autoSave,
		onextchange: onchange,
		batch = "links",
		edits = null,
	}: Props = $props();

	const { activeTask, links, tasks, schedule } = $derived(
		api.getReactiveState()
	);

	let linksData = $state<TLinkGroup[]>();
	$effect(() => {
		linksData = getLinksData();
	});

	const list: IOption<TLinkType>[] = [
		{ id: "e2s", label: _("End-to-start") },
		{ id: "s2s", label: _("Start-to-start") },
		{ id: "e2e", label: _("End-to-end") },
		{ id: "s2e", label: _("Start-to-end") },
	];

	function getTypeOptions(row: IRow) {
		const link = $links!.byId(row.id);
		if (!link) return list;
		const taken = getPairTypes(link, row.id);
		const check = api.getLinkValidator();
		return list.filter(
			({ id: type }) =>
				type === row.type ||
				(!taken.has(type) && !check({ ...link, type }))
		);
	}

	function getPairTypes(link: ILink, except: TID) {
		const out = new Set<TLinkType>();
		linksData!.forEach(group =>
			group.data.forEach(row => {
				if (row.id === except) return;
				const other = $links!.byId(row.id);
				if (
					other?.source === link.source &&
					other.target === link.target
				)
					out.add(row.type);
			})
		);
		return out;
	}

	const isLagHidden = $derived(!$schedule?.auto);

	function getColumns(): TEditorTableColumn[] {
		return [
			{
				id: "taskText",
				header: _("Task name"),
				flexgrow: 2,
			},
			{
				id: "lag",
				header: _("Lag"),
				editor: { type: "text", config: { type: "number" } },
				flexgrow: 1,
				hidden: isLagHidden,
			},
			{
				id: "type",
				header: _("Type"),
				width: 124,
				options: list,
				editor: (row?: IRow) => ({
					type: "richselect",
					config: {
						cell: LinkTypeCell,
						options: getTypeOptions(row!),
					},
				}),
				cell: LinkTypeCell,
			},
			{
				id: "delete",
				header: "",
				cell: ActionCell,
				width: 50,
				align: "center",
			},
		];
	}

	function getLinksData(): TLinkGroup[] | undefined {
		if (!$activeTask) return;
		const inLinks: TLinkRow[] = [];
		const outLinks: TLinkRow[] = [];
		const toRow = (link: ILink, other: TID): TLinkRow => ({
			id: link.id!,
			type: link.type,
			lag: link.lag,
			taskText: $tasks!.byId(other).text,
		});
		$links!.forEach(saved => {
			const edit = edits?.get(saved.id!);
			if (edit?.action === "delete-link") return;
			const link = edit ? { ...saved, ...edit.data.link } : saved;
			if (link.target === $activeTask)
				inLinks.push(toRow(link, link.source));
			if (link.source === $activeTask)
				outLinks.push(toRow(link, link.target));
		});
		return [
			{ title: _("Predecessors"), data: inLinks },
			{ title: _("Successors"), data: outLinks },
		];
	}

	function getActionData(
		evData: IEditorSectionChange["event"]
	): IEditorSectionChange {
		return { view: "links", event: evData };
	}

	function onDeleteAction(id: TID) {
		if (autoSave) {
			api.exec("delete-link", { id });
		} else {
			linksData = linksData!.map(group => ({
				...group,
				data: group.data.filter(item => item.id !== id),
			}));
			onchange?.(
				getActionData({
					id,
					action: "delete-link",
					data: { id },
				})
			);
		}
	}

	function onEdit(id: TID, column: TID, value: any) {
		if (column === "lag" && value !== "") value = value * 1;

		const update = { [column]: value };

		if (autoSave) {
			api.exec("update-link", {
				id,
				link: update,
			});
		} else {
			linksData = linksData!.map(group => ({
				...group,
				data: group.data.map(item =>
					item.id === id ? { ...item, ...update } : item
				),
			}));

			onchange?.(
				getActionData({
					id,
					action: "update-link",
					data: {
						id,
						link: update,
					},
				})
			);
		}
	}

	const isMessage = $derived.by(() => {
		return (
			linksData && !linksData[0].data.length && !linksData[1].data.length
		);
	});
</script>

<div class="wx-wrapper" class:wx-nobatch={batch !== "links"}>
	{#each linksData! as links}
		{#if links.data.length}
			<div class="wx-title">{links.title}</div>
			<GridSection
				columns={getColumns()}
				onaction={onDeleteAction}
				onedit={onEdit}
				data={links.data}
				sizes={{
					rowHeight: 44,
				}}
			/>
		{/if}
	{/each}
	{#if isMessage}
		<div class="wx-nodata">{_("No links")}</div>
	{/if}
</div>

<style>
	.wx-wrapper {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.wx-nobatch {
		gap: 4px;
	}
	.wx-title {
		font-weight: var(--wx-header-font-weight);
	}
	.wx-nodata {
		color: var(--wx-gantt-icon-color);
		margin-top: 8px;
	}
</style>
