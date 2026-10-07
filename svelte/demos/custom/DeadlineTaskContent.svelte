<script>
	import { differenceInCalendarDays } from "date-fns";

	let { data } = $props();

	let overdueDays = $derived.by(() => {
		const finish = data.end || data.start;
		return data.$overdue && finish && data.deadline
			? differenceInCalendarDays(finish, data.deadline)
			: 0;
	});
</script>

{#snippet overdueLabel(float = false)}
	{#if overdueDays > 0}
		<div class="wx-overdue-label" class:float>
			<span>+{overdueDays}d</span>
		</div>
	{/if}
{/snippet}

{#if data.type !== "milestone"}
	<div class="wx-content">{data.text || ""}</div>
	{@render overdueLabel(true)}
{:else}
	<div class="wx-content"></div>
	<div class="wx-text-out">
		<div>{data.text || ""}</div>
		{@render overdueLabel()}
	</div>
{/if}

<style>
	.wx-overdue-label {
		color: var(--wx-gantt-deadline-overdue-color);
		font: var(--wx-gantt-bar-font);
		pointer-events: none;
		font-size: 12px;
		font-weight: 600;
		line-height: normal;
		text-align: left;
	}

	.wx-overdue-label.float {
		position: absolute;
		left: 100%;
		top: -2px;
		height: 100%;
		margin-left: 2px;
	}

	.wx-text-out .wx-overdue-label {
		margin-top: -2px;
	}
</style>
