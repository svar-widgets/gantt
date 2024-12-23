<script>
	import { run } from "svelte/legacy";

	import { onMount } from "svelte";

	import {
		Text,
		TextArea,
		Select,
		Slider,
		DatePicker,
		Locale,
	} from "wx-svelte-core";
	import { en } from "wx-gantt-locales";

	let { task = $bindable({}), taskTypes, onaction } = $props();

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

	run(() => {
		//legacy_recursive_reactive_block
		if (task.type === "milestone") {
			delete task.end;
			task.duration = 0;
		} else if (task.start > task.end) {
			task.start = task.end;
			task.duration = 1;
			task.end = 0;
		}

		onaction &&
			onaction({
				action: "update-task",
				data: { id: task.id, task },
			});
	});
</script>

<Locale words={en} optional={true}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="backdrop">
		<div class="modal" style="left:{left}px;top:{top}px" bind:this={node}>
			<div class="header">
				<h3 class="title">Edit task</h3>
				<i class="close wxi-close" onclick={onClose}></i>
			</div>
			<div class="body">
				<p class="label">Name</p>
				<Text focus={true} bind:value={task.text} />

				<p class="label">Description</p>
				<TextArea bind:value={task.details} />

				{#if taskTypes.length > 1}
					<p class="label">Type</p>
					<Select bind:value={task.type} options={taskTypes} />
				{/if}

				<p class="label">Start date</p>
				<DatePicker bind:value={task.start} />

				{#if task.type !== "milestone"}
					<p class="label">End date</p>
					<DatePicker bind:value={task.end} />
					<Slider
						label="Progress: {task.progress}%"
						bind:value={task.progress}
					/>
				{/if}

				<button class="button danger" onclick={deleteTask}
					>Delete</button
				>
			</div>
		</div>
	</div>
</Locale>

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

	.label {
		font-family: var(--wx-font-family);
		font-size: var(--wx-font-size);
	}
</style>
