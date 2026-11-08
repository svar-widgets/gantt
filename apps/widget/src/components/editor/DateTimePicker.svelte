<script lang="ts">
	import { getContext, type ComponentProps } from "svelte";
	import { DatePicker, TimePicker } from "@svar-ui/svelte-core";
	import type { ILocale } from "@svar-ui/lib-dom";
	import type { TCalendarButton } from "@svar-ui/svelte-core";

	type Props = Omit<
		ComponentProps<typeof DatePicker>,
		"value" | "onchange" | "buttons" | "format"
	> & {
		value?: Date | null;
		time?: boolean;
		format?: string;
		onchange?: (ev: { value: Date | null | undefined }) => void;
		buttons?: string[];
		clear?: boolean;
	};

	let {
		value,
		time,
		format,
		onchange,
		buttons = ["today"],
		clear,
		...restProps
	}: Props = $props();

	const _ = getContext<ILocale>("wx-i18n").getGroup("gantt");

	function handleDateChange(ev: { value?: Date | null }) {
		let current = ev.value;
		if (current) {
			current = new Date(ev.value!);
			if (value) {
				current.setHours(value.getHours());
				current.setMinutes(value.getMinutes());
			}
		}

		onchange?.({ value: current });
	}
</script>

<div class="date-time-controll">
	<DatePicker
		{...restProps}
		{value}
		onchange={handleDateChange}
		{format}
		buttons={buttons.map(b => _(b)) as TCalendarButton[]}
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
