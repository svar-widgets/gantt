<script>
	import { format, differenceInCalendarDays } from "date-fns";

	const { row: task } = $props();

	let overdueDays = $derived.by(() => {
		const finish = task.end || task.start;
		return task.$overdue && finish && task.deadline
			? differenceInCalendarDays(finish, task.deadline)
			: 0;
	});
</script>

{#if task.deadline}
	{format(task.deadline, "dd-MM-yyyy")}
	{#if task.$overdue}
		<span class="overdue">+{overdueDays}d</span>
	{/if}
{/if}

<style>
	.overdue {
		background: rgba(255, 0, 0, 0.1);
		color: var(--wx-gantt-deadline-overdue-color, #fe6158);
		font-weight: 600;
		padding: 0 4px;
		border-radius: 999px;
		margin-left: 4px;
	}
</style>
