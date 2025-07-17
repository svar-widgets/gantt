<script>
	import { onMount } from "svelte";

	import {
		Field,
		Text,
		TextArea,
		Select,
		Slider,
		DatePicker,
	} from "wx-svelte-core";

	let { task, taskTypes, onaction } = $props();

	let node = $state(),
		left = $state(),
		top = $state();

	onMount(() => {
		left = (window.innerWidth - node.offsetWidth) / 2;
		top = (window.innerHeight - node.offsetHeight) / 2;
	});

	function deleteTask() {
		onaction && onaction({ action: "delete-task", data: { id: task.id } });
		onaction && onaction({ action: "close-form" });
	}

	function onClose() {
		onaction && onaction({ action: "close-form" });
	}

	function handleChange({ value }, key) {
		if (key === "type" && value === "milestone") {
			delete task.end;
			task.duration = 0;
		} else if (task.start > task.end) {
			task.start = task.end;
			task.duration = 1;
			task.end = 0;
		}
		task = {
			...task,
			[key]: value,
		};
		onaction &&
			onaction({
				action: "update-task",
				data: { id: task.id, task },
			});
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="backdrop">
	<div class="modal" style="left:{left}px;top:{top}px" bind:this={node}>
		<div class="header">
			<h3 class="title">Edit task</h3>
			<i class="close wxi-close" onclick={onClose}></i>
		</div>
		<div class="body">
			<Field label="Name">
				{#snippet children({ id })}
					<Text
						{id}
						focus={true}
						value={task.text}
						onchange={ev => handleChange(ev, "text")}
					/>
				{/snippet}
			</Field>

			<Field label="Description">
				{#snippet children({ id })}
					<TextArea
						{id}
						value={task.details}
						onchange={ev => handleChange(ev, "details")}
					/>
				{/snippet}
			</Field>

			{#if taskTypes.length > 1}
				<Field label="Type">
					{#snippet children({ id })}
						<Select
							{id}
							value={task.type}
							options={taskTypes}
							onchange={ev => handleChange(ev, "type")}
						/>
					{/snippet}
				</Field>
			{/if}

			<Field label="Start date">
				{#snippet children({ id })}
					<DatePicker
						{id}
						value={task.start}
						onchange={ev => handleChange(ev, "start")}
					/>
				{/snippet}
			</Field>

			{#if task.type !== "milestone"}
				<Field label="End date">
					{#snippet children({ id })}
						<DatePicker
							{id}
							value={task.end}
							onchange={ev => handleChange(ev, "end")}
						/>
					{/snippet}
				</Field>
				<Field label="Progress: {task.progress}%">
					{#snippet children({ id })}
						<Slider
							{id}
							value={task.progress}
							onchange={ev => handleChange(ev, "progress")}
						/>
					{/snippet}
				</Field>
			{/if}

			<button class="button danger" onclick={deleteTask}>Delete</button>
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		right: 0;
		z-index: 5;
		background: var(--wx-modal-backdrop);
	}

	.modal {
		position: relative;
		width: 340px;
		padding: 20px;
		border-radius: 6px;
		box-shadow:
			0 4px 4px rgba(0, 0, 0, 0.12),
			0 0 10px rgba(0, 0, 0, 0.06);
		background-color: var(--wx-background);
		font-family: var(--wx-font-family);
		font-size: var(--wx-font-size);
		color: var(--wx-color-font);
	}

	.title {
		margin: 0;
	}

	.close {
		position: absolute;
		top: 20px;
		right: 20px;
		cursor: pointer;
		font-weight: 700;
		transition: color 0.15s ease-in;
	}

	.close:hover {
		color: rgb(255, 122, 122);
	}

	.body {
		margin: 20px 0 0 0;
	}

	.button {
		padding: 10px;
		margin: 1.5em 0 0 0;
		box-sizing: border-box;
		border: 1px solid #ccc;
		border-radius: 2px;
		font-family: var(--wx-font-family);
		font-size: var(--wx-font-size);
		border-radius: 3px;
		cursor: pointer;
	}

	.button:focus {
		outline: none;
		opacity: 0.7;
	}

	.danger {
		color: var(--wx-color-danger-font);
		background-color: var(--wx-color-danger);
	}
</style>
