<script>
	import { getContext, setContext } from "svelte";
	import { Button, Icon } from "@svar-ui/svelte-core";
	import { dateToString, locale } from "@svar-ui/lib-dom";
	import { en } from "@svar-ui/gantt-locales";
	import { en as coreEn } from "@svar-ui/core-locales";
	import { defaultConstraintTypes } from "@svar-ui/gantt-store";

	let { api = null, onclose = undefined } = $props();

	let l = getContext("wx-i18n");
	if (!l) {
		l = locale({ ...en, ...coreEn });
		setContext("wx-i18n", l);
	}
	const _ = l.getGroup("gantt");
	const i18nData = l.getRaw();
	const f = i18nData.gantt?.dateFormat || i18nData.formats?.dateFormat;
	const dateFormat = dateToString(f, i18nData.calendar);
	const constraintLabels = Object.fromEntries(
		defaultConstraintTypes.map(t => [t.id, t.label])
	);
	const typeIcons = {
		constraint: "wxi-triangles-out-h",
		link: "wxi-link",
	};

	let state = $derived(api?.getReactiveState());
	const { _conflicts, showConflicts, links, tasks, scaleHeight } = $derived(
		state ?? {}
	);

	let open = $derived(!!$showConflicts);

	let clickedId = $state(null);
	let rows = $derived($_conflicts?.rows ?? []);
	let selectedId = $derived(
		open && rows.some(r => r.id === clickedId) ? clickedId : null
	);

	function taskText(id) {
		if (id == null) return "—";
		return $tasks?.byId?.(id)?.text ?? String(id);
	}

	function itemTitle(row) {
		return row.typeKey ? _(row.typeKey) : "";
	}

	function actionsFor(row) {
		const resolveAction = row.required
			? { id: "resolve", label: "Move task" }
			: null;
		if (row.type === "constraint")
			return [
				resolveAction,
				{ id: "remove-constraint", label: "Remove constraint" },
			].filter(Boolean);
		if (row.type === "link")
			return [
				resolveAction,
				{ id: "remove-link", label: "Remove link" },
			].filter(Boolean);
		return [];
	}

	function taskIdFor(row) {
		return row.task ?? null;
	}

	function focusTask(taskId) {
		if (!api || taskId == null) return;
		api.exec("select-task", { id: taskId, show: "xy", focus: "chart" });
	}

	function selectItem(row) {
		clickedId = row.id;
		focusTask(taskIdFor(row));
	}

	function liveLink(row) {
		if (row.link == null) return null;
		return $links?.byId?.(row.link);
	}

	function resolve(row, action) {
		if (!api) return;
		clickedId = row.id;
		const taskId = taskIdFor(row);
		switch (action) {
			case "remove-link": {
				const link = liveLink(row);
				if (link?.id != null) api.exec("delete-link", { id: link.id });
				break;
			}
			case "resolve": {
				if (taskId == null || !row.required) break;
				api.exec("update-task", {
					id: taskId,
					task: { start: row.required },
				});
				break;
			}
			case "remove-constraint": {
				if (taskId == null) break;
				api.exec("update-task", {
					id: taskId,
					task: { constraint: null },
				});
				break;
			}
		}
	}

	function close() {
		api?.exec("show-conflicts", { mode: false });
		onclose?.();
	}
</script>

{#snippet detailLine(label, value)}
	<div class="wx-detail-line">
		<span class="wx-detail-label">{label}:</span>{value}
	</div>
{/snippet}

{#if open}
	<div class="wx-conflict-report">
		<div class="wx-header" style:height={($scaleHeight ?? 36) + "px"}>
			<div class="wx-title">
				{_("Conflicts")}
				{#if rows.length}
					<span class="wx-count">{rows.length}</span>
				{/if}
			</div>
			<Icon css="wxi-close" onclick={close} />
		</div>

		{#if !rows.length}
			<div class="wx-empty">
				<div class="wx-empty-title">
					<span class="wx-check" aria-hidden="true"></span>
					{_("No conflicts found")}
				</div>
			</div>
		{:else}
			<div class="wx-list" role="list">
				{#each rows as row (row.id)}
					{@const actions = actionsFor(row)}
					{@const icon = typeIcons[row.type]}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<div
						class="wx-item"
						class:wx-selected={selectedId === row.id}
						role="listitem"
						data-id={row.id}
						onclick={() => selectItem(row)}
					>
						<div class="wx-item-title">
							<span class="wx-type-icon">
								{#if icon}
									<i class={icon}></i>
								{/if}
							</span>
							<span class="wx-item-title-text"
								>{itemTitle(row)}</span
							>
						</div>

						<div class="wx-item-detail">
							{#if row.type === "link"}
								{@render detailLine(
									_("From link"),
									`${taskText(liveLink(row)?.source)} → ${taskText(row.task)}`
								)}
							{:else}
								{@const constraint = $tasks?.byId?.(
									row.task
								)?.constraint}
								{@render detailLine(
									_("Task"),
									taskText(row.task)
								)}
								{#if constraint?.date}
									{@render detailLine(
										_(
											constraintLabels[constraint.type] ||
												constraint.type
										),
										dateFormat(constraint.date)
									)}
								{/if}
							{/if}
						</div>
						{#if actions.length}
							<div class="wx-item-actions">
								{#each actions as action (action.id)}
									<Button
										type={selectedId === row.id
											? "primary"
											: undefined}
										onclick={() => resolve(row, action.id)}
									>
										{_(action.label)}
									</Button>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.wx-conflict-report {
		display: flex;
		flex-direction: column;
		width: 310px;
		min-width: 310px;
		height: 100%;
		border-left: var(--wx-gantt-border);
		background: var(--wx-background);
	}

	.wx-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 0 8px 0 16px;
		box-sizing: border-box;
		border-bottom: var(--wx-gantt-border);
		flex-shrink: 0;
	}
	.wx-header :global(.wx-icon) {
		box-sizing: border-box;
		max-height: calc(
			var(--wx-button-icon-size) + 2 * var(--wx-button-icon-indent)
		);
	}

	.wx-title {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		font-weight: var(--wx-header-font-weight);
	}

	.wx-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		border-radius: 8px;
		font-size: 11px;
		color: var(--wx-gantt-constraint-violation-font-color, inherit);
		background: var(--wx-gantt-constraint-violation-color);
	}

	.wx-empty {
		padding: 32px 16px;
		text-align: center;
	}
	.wx-empty-title {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin: 0;
		font-weight: normal;
	}

	.wx-check {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		flex-shrink: 0;
		border-radius: 50%;
		background: var(--wx-color-success);
	}
	.wx-check::before {
		content: "";
		width: 5px;
		height: 9px;
		margin-top: -1px;
		border: solid var(--wx-background);
		border-width: 0 2px 2px 0;
		transform: rotate(45deg);
	}

	.wx-list {
		flex: 1;
		min-height: 0;
		overflow: auto;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 8px;
		box-sizing: border-box;
	}

	.wx-item {
		padding: 8px;
		border: var(--wx-gantt-border);
		border-radius: 4px;
		background: var(--wx-background);
		cursor: pointer;
		box-sizing: border-box;
	}
	.wx-item:hover {
		background: var(--wx-background-hover);
	}
	.wx-item.wx-selected {
		background: var(--wx-gantt-select-color);
	}

	.wx-item-title {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: var(--wx-font-size-sm);
		font-weight: var(--wx-font-weight-md);
		line-height: var(--wx-line-height-sm);
	}
	.wx-type-icon {
		display: inline-flex;
		align-items: center;
		& i {
			font-size: 14px;
		}
	}

	.wx-item-detail {
		margin-top: 4px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: var(--wx-font-size-sm);
		font-weight: var(--wx-font-weight);
		line-height: var(--wx-line-height-sm);
		overflow-wrap: anywhere;
	}

	.wx-detail-label {
		margin-right: 4px;
	}

	.wx-item-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 10px;
	}
	.wx-item-actions :global(.wx-button) {
		font-size: var(--wx-font-size-sm);
		line-height: var(--wx-line-height-sm);
	}
</style>
