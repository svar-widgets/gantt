<script>
	import { getContext } from "svelte";
	import { form } from "wx-lib-svelte";

	import {
		TextArea,
		Button,
		Combo,
		Counter,
		DatePicker,
		Field,
		Slider,
		Text,
	} from "wx-svelte-core";

	import Links from "./Links.svelte";

	let { compactMode, editorShape } = $props();

	const _ = getContext("wx-i18n").getGroup("gantt");
	const api = getContext("gantt-store");

	const task = api.getReactiveState()._activeTask;

	let tdata = form({}, v => {
		if (v.start && v.end) {
			if (v.start >= v.end) v.end = null;
			else v.duration = null;
		}

		if (v.base_start && v.base_end) {
			if (v.base_start >= v.base_end) v.base_end = null;
			else v.base_duration = null;
		}
		api.exec("update-task", {
			id: $task.id,
			task: v,
			inProgress,
		});
	});

	$effect.pre(() => {
		tdata.reset({ ...$task });
	});

	let milestone = $derived($task?.type === "milestone");
	let summary = $derived($task?.type === "summary");

	function deleteTask() {
		api.exec("delete-task", { id: $task.id });
		hide();
	}

	function hide() {
		api.exec("show-editor", { id: null });
	}

	function onDurationChange(e) {
		tdata.update(v => {
			v.duration = e.value;
			v.end = null;
			v.start = $task.start;
			return v;
		});
	}

	let inProgress = false;
	function onProgressChange(e) {
		inProgress = e.input;
		if (inProgress) {
			tdata.update(v => {
				v.progress = e.value;
				return v;
			});
		} else {
			api.exec("update-task", {
				id: $task.id,
				task: { ...$task, progress: e.value },
			});
		}
	}
</script>

<div class="wx-sidebar" class:wx-compact={compactMode}>
	<div class="wx-header">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<i class="wxi-close" onclick={hide}></i>
		<div>
			<Button type="danger" onclick={deleteTask}>{_("Delete")}</Button>
			<Button type="primary" onclick={hide}>{_("Save")}</Button>
		</div>
	</div>

	<div class="wx-form">
		{#each editorShape as field}
			{#if field.type === "text"}
				<Field label={_(field.label) || ""} position="top">
					{#snippet children({ id })}
						<Text
							{id}
							bind:value={$tdata[field.key]}
							{...field.config}
							placeholder={_(field.config.placeholder)}
						/>
					{/snippet}
				</Field>
			{:else if field.type === "date" && (!milestone || (field.key !== "end" && field.key !== "base_end")) && !summary}
				<Field label={_(field.label) || ""} position="top">
					{#snippet children({ id })}
						<div class="input_wrapper">
							<DatePicker {id} bind:value={$tdata[field.key]} />
						</div>
					{/snippet}
				</Field>
			{:else if field.type === "select" && field.options.length > 1}
				<Field label={_(field.label) || ""} position="top">
					{#snippet children({ id })}
						<Combo
							{id}
							placeholder={_("Select type")}
							options={field.options}
							{...field.config}
							bind:value={$tdata[field.key]}
							title={""}
						>
							{#snippet children({ option })}
								{option.label}
							{/snippet}
						</Combo>
					{/snippet}
				</Field>
			{:else if field.type === "textarea"}
				<Field label={_(field.label) || ""} position="top">
					{#snippet children({ id })}
						<TextArea
							{id}
							bind:value={$tdata[field.key]}
							{...field.config}
							placeholder={_(field.config.placeholder)}
						/>
					{/snippet}
				</Field>
			{:else if field.type === "counter" && !summary && !milestone}
				<Field label={_(field.label) || ""} position="top">
					<Counter
						value={$tdata[field.key]}
						onchange={onDurationChange}
					/>
				</Field>
			{:else if field.type === "slider" && !milestone}
				<Field
					label={`${_(field.label)} ${$tdata[field.key]}%`}
					position="top"
				>
					<Slider
						value={$tdata[field.key]}
						onchange={onProgressChange}
						{...field.config}
					/>
				</Field>
			{:else if field.type === "links"}
				<Links />
			{/if}
		{/each}
	</div>
</div>

<style>
	.wx-sidebar {
		flex: 0 0 400px;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		background: var(--wx-background);
		box-shadow: 0px 1px 30px rgba(0, 0, 0, 0.25);
		overflow: hidden;
		z-index: 1;
	}

	.wx-sidebar.wx-compact {
		position: absolute;
		width: 100%;
		z-index: 4;
		height: 100%;
	}

	.wx-header {
		box-sizing: border-box;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 11px 20px;
		border-bottom: var(--wx-gantt-form-header-border);
	}

	.wx-form {
		flex: 1 1 auto;
		padding: 20px;
		overflow: auto;
	}

	.wxi-close {
		width: 24px;
		height: 18px;
		cursor: pointer;
		font-size: 24px;
		color: var(--wx-icon-color);
	}
</style>
