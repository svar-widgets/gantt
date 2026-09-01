<script>
	import { getContext } from "svelte";

	import ActionCell from "../grid/ActionCell.svelte";
	import GridSection from "./GridSection.svelte";
	import LinkTypeCell from "./LinkTypeCell.svelte";

	const _ = getContext("wx-i18n").getGroup("gantt");
	let {
		api,
		autoSave,
		onextchange: onchange,
		predecessors = null,
		successors = null,
		batch = "links",
	} = $props();

	const {
		activeTask,
		_activeTask,
		links,
		tasks,
		schedule,
		unscheduledTasks,
	} = api.getReactiveState();

	let linksData = $state();
	$effect(() => {
		linksData = getLinksData();
	});

	const list = [
		{ id: "e2s", label: _("End-to-start") },
		{ id: "s2s", label: _("Start-to-start") },
		{ id: "e2e", label: _("End-to-end") },
		{ id: "s2e", label: _("Start-to-end") },
	];

	function lagEditorHandler(row) {
		return row.type === "e2s"
			? { type: "text", config: { type: "number" } }
			: null;
	}

	const isLagHidden = $derived(
		!$schedule?.auto || ($unscheduledTasks && $_activeTask.unscheduled)
	);

	function getColumns() {
		return [
			{
				id: "taskText",
				header: _("Task name"),
				flexgrow: 2,
			},
			{
				id: "lag",
				header: _("Lag"),
				editor: lagEditorHandler,
				flexgrow: 1,
				hidden: isLagHidden,
			},
			{
				id: "type",
				header: _("Type"),
				width: 124,
				options: list,
				editor: {
					type: "richselect",
					config: {
						cell: LinkTypeCell,
					},
				},
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

	function getLinksData() {
		if ($activeTask) {
			const il = [];
			const ol = [];

			if (!predecessors || !successors) {
				$links.forEach(l => {
					if (!predecessors && l.target === $activeTask) il.push(l);
					if (!successors && l.source === $activeTask) ol.push(l);
				});
			}

			const inLinks =
				predecessors ||
				il.map(link => {
					const { id, lag, type, source } = link;
					return {
						id,
						type,
						lag,
						taskText: $tasks.byId(source).text,
					};
				});

			const outLinks =
				successors ||
				ol.map(link => {
					const { id, lag, type, target } = link;
					return {
						id,
						type,
						lag,
						taskText: $tasks.byId(target).text,
					};
				});

			return [
				{ title: _("Predecessors"), data: inLinks },
				{ title: _("Successors"), data: outLinks },
			];
		}
	}

	function getActionData(evData) {
		return {
			view: "links",
			event: evData,
			values: {
				predecessors: linksData[0].data,
				successors: linksData[1].data,
			},
		};
	}

	function onDeleteAction(id) {
		if (autoSave) {
			api.exec("delete-link", { id });
		} else {
			linksData = linksData.map(group => ({
				...group,
				data: group.data.filter(item => item.id !== id),
			}));
			onchange &&
				onchange(
					getActionData({
						id,
						action: "delete-link",
						data: { id },
					})
				);
		}
	}

	function onEdit(id, column, value) {
		if (column === "lag" && value !== "") value = value * 1;

		const update = { [column]: value };
		if (column === "type" && $schedule?.auto) {
			if (value !== "e2s") update.lag = "";
		}

		if (autoSave) {
			api.exec("update-link", {
				id,
				link: update,
			});
		} else {
			linksData = linksData.map(group => ({
				...group,
				data: group.data.map(item =>
					item.id === id ? { ...item, ...update } : item
				),
			}));

			onchange &&
				onchange(
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
	{#each linksData as links}
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
