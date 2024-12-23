<script>
	import { getContext } from "svelte";
	import { Field, Combo } from "wx-svelte-core";

	const _ = getContext("wx-i18n").getGroup("gantt");
	const api = getContext("gantt-store");

	const { _activeTask: task, _links: links } = api.getReactiveState();

	let linksData = $derived.by(() => {
		if ($task) {
			const inLinks = $links
				.filter(a => a.target == $task.id)
				.map(link => ({ link, task: api.getTask(link.source) }));

			const outLinks = $links
				.filter(a => a.source == $task.id)
				.map(link => ({ link, task: api.getTask(link.target) }));

			return [
				{ title: _("Predecessors"), data: inLinks },
				{ title: _("Successors"), data: outLinks },
			];
		}
	});

	const list = [
		{ id: "e2s", label: _("End-to-start") },
		{ id: "s2s", label: _("Start-to-start") },
		{ id: "e2e", label: _("End-to-end") },
		{ id: "s2e", label: _("Start-to-end") },
	];

	function onClick(e) {
		const { action, id } = e.target.dataset;
		if (action) {
			api.exec(action, { id });
		}
	}

	function onChange(ev, id) {
		const value = ev.value.id;
		api.exec("update-link", {
			id,
			link: { type: value },
		});
	}
</script>

{#each linksData as links}
	{#if links.data.length}
		<div class="wx-links">
			<Field label={links.title} position="top">
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<table onclick={onClick}>
					<tbody>
						{#each links.data as obj}
							<tr>
								<td class="wx-cell">
									<div class="wx-task-name">
										{obj.task.text || ""}
									</div>
								</td>

								<td class="wx-cell">
									<div class="wx-wrapper">
										<Combo
											value={obj.link.type}
											placeholder={_("Select link type")}
											options={list}
											onchange={e =>
												onChange(e, obj.link.id)}
										>
											{#snippet children({ option })}
												{option.label}
											{/snippet}
										</Combo>
									</div>
								</td>

								<td class="wx-cell">
									<i
										class="wxi-delete wx-delete-icon"
										data-action="delete-link"
										data-id={obj.link.id}
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
