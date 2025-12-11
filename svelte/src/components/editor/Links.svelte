<script>
	import { getContext, setContext } from "svelte";
	import { Field, Combo, Text } from "@svar-ui/svelte-core";

	const _ = getContext("wx-i18n").getGroup("gantt");
	let { api, autoSave, onlinkschange: onchange } = $props();

	const {
		activeTask,
		_activeTask,
		_links: links,
		schedule,
		unscheduledTasks,
	} = api.getReactiveState();

	let linksData = $state();
	$effect(() => {
		linksData = getLinksData();
	});

	function getLinksData() {
		if ($activeTask) {
			const inLinks = $links
				.filter(a => a.target == $activeTask)
				.map(link => ({ link, task: api.getTask(link.source) }));

			const outLinks = $links
				.filter(a => a.source == $activeTask)
				.map(link => ({ link, task: api.getTask(link.target) }));

			return [
				{ title: _("Predecessors"), data: inLinks },
				{ title: _("Successors"), data: outLinks },
			];
		}
	}

	const list = [
		{ id: "e2s", label: _("End-to-start") },
		{ id: "s2s", label: _("Start-to-start") },
		{ id: "e2e", label: _("End-to-end") },
		{ id: "s2e", label: _("Start-to-end") },
	];

	function deleteLink(id) {
		if (autoSave) {
			api.exec("delete-link", { id });
		} else {
			linksData = linksData.map(group => ({
				...group,
				data: group.data.filter(item => item.link.id !== id),
			}));
			onchange &&
				onchange({
					id,
					action: "delete-link",
					data: { id },
				});
		}
	}

	function handleChange(id, update) {
		if (autoSave) {
			api.exec("update-link", {
				id,
				link: update,
			});
		} else {
			linksData = linksData.map(group => ({
				...group,
				data: group.data.map(item =>
					item.link.id === id
						? { ...item, link: { ...item.link, ...update } }
						: item
				),
			}));
			onchange &&
				onchange({
					id,
					action: "update-link",
					data: {
						id,
						link: update,
					},
				});
		}
	}
</script>

{#each linksData as links}
	{#if links.data.length}
		<div class="wx-links">
			<Field label={links.title} position="top">
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				{setContext("wx-input-id", null)}
				<table>
					<tbody>
						{#each links.data as obj}
							<tr>
								<td class="wx-cell">
									<div class="wx-task-name">
										{obj.task.text || ""}
									</div>
								</td>
								{#if $schedule?.auto && obj.link.type == "e2s"}
									<td class="wx-cell wx-link-lag">
										<Text
											type="number"
											placeholder={_("Lag")}
											value={obj.link.lag}
											disabled={$unscheduledTasks &&
												$_activeTask.unscheduled}
											onchange={ev => {
												if (!ev.input)
													handleChange(obj.link.id, {
														lag: ev.value,
													});
											}}
										/>
									</td>
								{/if}
								<td class="wx-cell">
									<div class="wx-wrapper">
										<Combo
											value={obj.link.type}
											placeholder={_("Select link type")}
											options={list}
											onchange={ev =>
												handleChange(obj.link.id, {
													type: ev.value,
												})}
										>
											{#snippet children({ option })}
												{option.label}
											{/snippet}
										</Combo>
									</div>
								</td>

								<td class="wx-cell">
									<!-- svelte-ignore a11y_interactive_supports_focus -->
									<i
										class="wxi-delete wx-delete-icon"
										onclick={() => deleteLink(obj.link.id)}
										role="button"
									></i>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</Field>
		</div>
	{/if}
{/each}

<style>
	.wx-links {
		margin-bottom: 10px;
	}

	.wx-cell {
		text-align: center;
	}

	.wx-task-name {
		font-family: var(--wx-input-font-family);
		font-size: var(--wx-input-font-size);
		font-weight: var(--wx-input-font-weigth);
		color: var(--wx-input-font-color);
		width: 170px;
		text-align: left;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.wx-link-lag {
		width: 60px;
	}

	.wx-wrapper {
		position: relative;
		display: flex;
	}

	.wx-delete-icon {
		margin-left: 12px;
		position: relative;
		top: 2px;

		font-size: var(--wx-icon-size);
		cursor: pointer;
		color: var(--wx-gantt-icon-color);
	}

	.wx-delete-icon:hover {
		color: var(--wx-color-primary);
	}
</style>
