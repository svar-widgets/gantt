<script>
	import { DatePicker, TimePicker } from "wx-svelte-core";

	let { value, time, format, onchange, ...restProps } = $props();

	function handleDateChange(ev) {
		const current = new Date(ev.value);
		current.setHours(value.getHours());
		current.setMinutes(value.getMinutes());

		onchange && onchange({ value: current });
	}
</script>

<div class="date-time-controll">
	<DatePicker
		{...restProps}
		{value}
		onchange={handleDateChange}
		{format}
		buttons={["today"]}
		clear={false}
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
