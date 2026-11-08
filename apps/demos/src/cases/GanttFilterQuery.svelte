<script lang="ts">
	import { getContext } from "svelte";
	import {
		FilterQuery,
		createFilter,
		getQueryString,
		getOptionsMap,
	} from "@svar-ui/svelte-filter";
	import type {
		FilterQueryEvent,
		IField,
		IFilterSet,
	} from "@svar-ui/svelte-filter";
	import { Gantt } from "@svar-ui/svelte-gantt";
	import { getData } from "../data";
	import type { IDemoHelpers } from "../types";
	import type { IApi, ITask } from "@svar-ui/svelte-gantt";

	const helpers = getContext<IDemoHelpers>("wx-helpers");

	const { tasks, links } = getData();
	let textValue = $state("Progress: < 20");

	let api = $state<IApi>();
	let filter = $state<((task: ITask) => boolean) | null>();

	$effect(() => {
		if (api && filter !== undefined) api.exec("filter-tasks", { filter });
	});

	let options = getOptionsMap(tasks);

	let fields: IField[] = [
		{ id: "text", label: "Text", type: "text" },
		{ id: "details", label: "Description", type: "text" },
		{ id: "type", label: "Type", type: "text" },
		{ id: "duration", label: "Duration", type: "number" },
		{ id: "start", label: "Start Date", type: "date" },
		{ id: "end", label: "End Date", type: "date" },
		{ id: "progress", label: "Progress", type: "number" },
	];

	async function handleFilter({
		value,
		error,
		text,
		startProgress,
		endProgress,
	}: FilterQueryEvent) {
		if (text) {
			error = null;
			try {
				startProgress();
				value = await text2filter(text, fields);
				textValue = value
					? getQueryString(value as IFilterSet).query
					: "";
			} catch (e) {
				error = e as FilterQueryEvent["error"];
			} finally {
				endProgress();
			}
		}

		if (error) {
			helpers.showNotice({
				text: error.message,
				type: "danger",
			});

			if ((error as { code?: string }).code !== "NO_DATA") return;
		}
		filter = createFilter(value as IFilterSet, {}, fields);
	}

	const url =
		"https://master--svar-filter-natural-text--dev.webix.io/text-to-json";
	async function text2filter(text: string, fields: IField[]) {
		const response = await fetch(url, {
			method: "POST",
			body: JSON.stringify({ text, fields }),
		});
		const json = await response.json();
		if (!response.ok) {
			helpers.showNotice({
				text: json.error || "Request failed",
				type: "danger",
			});
			return null;
		}
		return json;
	}
</script>

<div style="padding: 20px;">
	<h4>Filter Gantt tasks with FilterQuery in AI-powered mode</h4>
	<FilterQuery
		value={textValue}
		placeholder="e.g., Text: contains test or Duration: >5"
		{fields}
		{options}
		onchange={handleFilter}
	/>
	<p class="hint">
		Type filter conditions using query syntax or natural language. Examples:
	</p>
	<ul class="examples">
		<li>Duration: &gt;10</li>
		<li>StartDate: &gt;= 2026-03-01</li>
		<li>Text: contains test</li>
		<li>Almost complete</li>
	</ul>
	<div style="height: 550px; border: var(--wx-gantt-border)">
		<Gantt {tasks} {links} bind:this={api} />
	</div>
</div>

<style>
	.examples {
		margin: 0;
		padding-left: 20px;
		font-size: 13px;
	}
	.examples li {
		margin: 4px 0;
	}
</style>
