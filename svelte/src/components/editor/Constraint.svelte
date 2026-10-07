<script>
	import { getContext } from "svelte";
	import { RichSelect } from "@svar-ui/svelte-core";
	import { defaultConstraintTypes } from "@svar-ui/gantt-store";
	import DateTimePicker from "./DateTimePicker.svelte";

	let { value, onchange, task, config } = $props();

	const _ = getContext("wx-i18n").getGroup("gantt");

	const NONE = "none";

	const options = [
		{ id: NONE, label: _("None") },
		...defaultConstraintTypes.map(t => ({ ...t, label: _(t.label) })),
	];

	const finishSide = type =>
		type === "fnlt" || type === "fnet" || type === "mfo";

	let type = $derived(value?.type ?? NONE);

	// a milestone has a single start date
	function defaultDate(next) {
		if (finishSide(next) && task?.type !== "milestone")
			return task?.end ?? task?.start;
		return task?.start;
	}

	function handleTypeChange(ev) {
		const next = ev.value;
		if (next === NONE) return onchange?.({ value: null });

		const keep = value?.date && finishSide(next) === finishSide(type);
		onchange?.({
			value: { type: next, date: keep ? value.date : defaultDate(next) },
		});
	}

	function handleDateChange(ev) {
		if (type === NONE || !ev.value) return;
		onchange?.({ value: { type, date: ev.value } });
	}
</script>

<div class="wx-constraint-editor">
	<RichSelect {options} value={type} onchange={handleTypeChange} />
	{#if type !== NONE}
		<DateTimePicker
			value={value?.date}
			onchange={handleDateChange}
			format={config?.format}
		/>
	{/if}
</div>

<style>
	.wx-constraint-editor {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
</style>
