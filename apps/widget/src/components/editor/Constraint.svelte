<script lang="ts">
	import { getContext } from "svelte";
	import { RichSelect } from "@svar-ui/svelte-core";
	import type { ILocale } from "@svar-ui/lib-dom";
	import { defaultConstraintTypes } from "@svar-ui/gantt-store";
	import type { Constraint, ITask } from "@svar-ui/gantt-store";
	import DateTimePicker from "./DateTimePicker.svelte";

	type TConstraintType = Constraint["type"];

	type Props = {
		value?: Constraint | null;
		onchange?: (ev: { value: Constraint | null }) => void;
		task?: ITask;
		config?: { format?: string };
	};

	let { value, onchange, task, config }: Props = $props();

	const _ = getContext<ILocale>("wx-i18n").getGroup("gantt");

	const NONE = "none";

	const options = [
		{ id: NONE, label: _("None") },
		...defaultConstraintTypes.map(t => ({ ...t, label: _(t.label) })),
	];

	const finishSide = (type: string) =>
		type === "fnlt" || type === "fnet" || type === "mfo";

	let type = $derived(value?.type ?? NONE);

	// a milestone has a single start date
	function defaultDate(next: TConstraintType) {
		if (finishSide(next) && task?.type !== "milestone")
			return task?.end ?? task?.start;
		return task?.start;
	}

	function handleTypeChange(ev: { value: string | number }) {
		const next = ev.value as TConstraintType | typeof NONE;
		if (next === NONE) return onchange?.({ value: null });

		const keep = value?.date && finishSide(next) === finishSide(type);
		onchange?.({
			value: {
				type: next,
				date: keep ? value!.date : defaultDate(next)!,
			},
		});
	}

	function handleDateChange(ev: { value: Date | null | undefined }) {
		if (type === NONE || !ev.value) return;
		onchange?.({
			value: { type: type as TConstraintType, date: ev.value },
		});
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
