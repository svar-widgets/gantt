<script>
	import { getContext } from "svelte";
	import { DatePicker, TimePicker } from "@svar-ui/svelte-core";

	let {
		value,
		time,
		format,
		onchange,
		buttons = ["today"],
		clear,
		...restProps
	} = $props();

	const _ = getContext("wx-i18n").getGroup("gantt");

	function handleDateChange(ev) {
		let current = ev.value;
		if (current) {
			current = new Date(ev.value);
			if (value) {
				current.setHours(value.getHours());
				current.setMinutes(value.getMinutes());
			}
		}

		onchange && onchange({ value: current });
	}
</script>

<div class="date-time-controll">
	<DatePicker
		{...restProps}
		{value}
		onchange={handleDateChange}
		{format}
		buttons={buttons.map(b => _(b))}
		clear={clear ?? buttons.includes("Unschedule")}
	/>
	{#if time}
		<TimePicker {value} {onchange} {format} />
	{/if}
</div>

<style>
	.date-time-controll {
		display: flex;
		gap: 12px;
	}
</style>
