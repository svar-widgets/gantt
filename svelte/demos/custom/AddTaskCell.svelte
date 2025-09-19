<script>
	import { getContext } from "svelte";

	const _ = getContext("wx-i18n").getGroup("gantt");
	const text = _("Add task");
</script>

<!-- set data-action="add-task" attribute to exec "add-task" on click -->
<div class="text" data-action="add-task">
	{text}
</div>

<style>
	.text {
		display: flex;
		align-items: center;
		cursor: pointer;
	}
	.text:hover {
		text-decoration: underline;
		color: var(--wx-color-link);
	}
</style>
