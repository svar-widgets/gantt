<script>
	import { getContext } from "svelte";
	import { Editor, registerEditorItem } from "wx-svelte-editor";
	import { Locale } from "wx-svelte-core";
	import { defaultEditorItems, normalizeDates } from "wx-gantt-store";
	import { dateToString } from "wx-lib-dom";

	import { RichSelect, Slider, Counter, TwoState } from "wx-svelte-core";
	import Links from "./editor/Links.svelte";
	import DateTimePicker from "./editor/DateTimePicker.svelte";

	//helpers
	import { useModeObserver } from "../helpers/modeResizeObserver";

	registerEditorItem("select", RichSelect);
	registerEditorItem("date", DateTimePicker);
	registerEditorItem("twostate", TwoState);
	registerEditorItem("slider", Slider);
	registerEditorItem("counter", Counter);
	registerEditorItem("links", Links);

	const locale = getContext("wx-i18n");
	const l = locale.getRaw();
	const f = l.gantt?.dateFormat || l.formats?.dateFormat;
	const dateFormat = dateToString(f, l.calendar);
	const _ = locale.getGroup("gantt");

	let {
		api,
		items = defaultEditorItems,
		css = "",
		layout = "default",
		readonly = false,
		placement = "sidebar",
		bottomBar = true,
		topBar = true,
		autoSave = true,
		focus = false,
	} = $props();

	let normalizedTopBar = $derived.by(() => {
		if (topBar === true && !readonly) {
			const buttons = [
				{ comp: "icon", icon: "wxi-close", id: "close" },
				{ comp: "spacer" },
				{
					comp: "button",
					type: "danger",
					text: _("Delete"),
					id: "delete",
				},
			];
			if (autoSave) return { items: buttons };
			return {
				items: [
					...buttons,
					{
						comp: "button",
						type: "primary",
						text: _("Save"),
						id: "save",
					},
				],
			};
		}
		return topBar;
	});

	// resize
	let compactMode = $state(false);
	let styleCss = $derived(compactMode ? "wx-full-screen" : "");

	$effect(() => {
		const ro = useModeObserver(handleResize);
		ro.observe();

		return () => {
			ro.disconnect();
		};
	});

	function handleResize(mode) {
		compactMode = mode;
	}

	let state = $derived(api?.getReactiveState());
	let activeTask = $derived(state?._activeTask ?? null);
	let taskId = $derived(state?.activeTask ?? null);
	let unit = $derived(state?.durationUnit);
	let unscheduledTasks = $derived(state?.unscheduledTasks);

	let taskType = $state();
	let taskUnscheduled = $state();
	let linksActionsMap = $state({});

	$effect(() => {
		taskType = $activeTask?.type;
		taskUnscheduled = $activeTask?.unscheduled;
	});
	$effect(() => {
		$taskId;
		linksActionsMap = {};
	});

	let taskTypes = $derived(state?.taskTypes);
	let milestone = $derived(taskType === "milestone");
	let summary = $derived(taskType === "summary");

	const editorItems = $derived.by(() => {
		const eItems = prepareEditorItems(items, taskUnscheduled);
		return filterEditorItems(eItems);
	});

	let task = $derived.by(() => {
		if (readonly && $activeTask) {
			let values = {};
			editorItems.forEach(({ key, comp }) => {
				if (comp !== "links") {
					const value = $activeTask[key];
					if (comp === "date" && value instanceof Date) {
						values[key] = dateFormat(value);
					} else if (comp === "slider" && key === "progress") {
						values[key] = `${value}%`;
					} else {
						values[key] = value;
					}
				}
			});
			return values;
		}
		return $activeTask ? { ...$activeTask } : null;
	});

	function prepareEditorItems(items, isUnscheduled) {
		const dates = { start: 1, end: 1, duration: 1 };

		return items.map(a => {
			const item = { ...a };
			if (a.config) item.config = { ...item.config };
			if (item.comp === "links" && api) {
				item.api = api;
				item.autoSave = autoSave;
				item.onlinkschange = handleLinksChange;
			}
			if (item.comp === "select" && item.key === "type") {
				let options = item.options ?? (taskTypes ? $taskTypes : []);
				item.options = options.map(t => ({
					...t,
					label: _(t.label),
				}));
			}

			if (item.comp === "slider" && item.key === "progress") {
				item.labelTemplate = value => `${_(item.label)} ${value}%`;
			}

			if (item.label) item.label = _(item.label);
			if (item.config?.placeholder)
				item.config.placeholder = _(item.config.placeholder);

			if ($unscheduledTasks && dates[item.key]) {
				if (isUnscheduled) {
					item.disabled = true;
				} else {
					delete item.disabled;
				}
			}

			return item;
		});
	}

	function filterEditorItems(items) {
		return items.filter(({ comp, key, options }) => {
			switch (comp) {
				case "date": {
					return (
						(!milestone || (key !== "end" && key !== "base_end")) &&
						!summary
					);
				}
				case "select": {
					return options.length > 1;
				}
				case "twostate": {
					return $unscheduledTasks && !summary;
				}
				case "counter": {
					return !summary && !milestone;
				}
				case "slider": {
					return !milestone;
				}
				default:
					return true;
			}
		});
	}

	function handleLinksChange({ id, action, data }) {
		linksActionsMap[id] = { action, data };
	}

	function saveLinks() {
		for (let link in linksActionsMap) {
			const { action, data } = linksActionsMap[link];
			api.exec(action, data);
		}
	}

	function deleteTask() {
		api.exec("delete-task", { id: $taskId });
	}

	function hide() {
		api.exec("show-editor", { id: null });
	}

	function handleAction(ev) {
		const { item, changes } = ev;
		if (item.id === "delete") {
			deleteTask();
		}
		if (item.id === "save") {
			if (!changes.length) saveLinks();
			else return;
		}
		if (item.comp) hide();
	}

	function handleChange(ev) {
		let { update, key, value } = ev;

		ev.update = normalizeTask({ ...update }, key);

		if (!autoSave) {
			if (key === "type") taskType = value;
			taskUnscheduled = update.unscheduled;
		}
	}

	function normalizeTask(task, key) {
		if ($unscheduledTasks && task.type === "summary")
			task.unscheduled = false;

		normalizeDates(task, $unit, true, key);
		return task;
	}

	function handleSave(ev) {
		let { values } = ev;
		values = {
			...values,
			unscheduled:
				$unscheduledTasks &&
				values.unscheduled &&
				values.type !== "summary",
		};
		delete values.links;
		delete values.data;

		api.exec("update-task", {
			id: $taskId,
			task: values,
		});

		if (!autoSave) saveLinks();
	}
</script>

{#if task}
	<Locale>
		<Editor
			css={`wx-gantt-editor ${styleCss} ${css}`}
			items={editorItems}
			values={task}
			topBar={normalizedTopBar}
			{bottomBar}
			{placement}
			{layout}
			{readonly}
			{autoSave}
			{focus}
			onaction={handleAction}
			onsave={handleSave}
			onchange={handleChange}
		/>
	</Locale>
{/if}

<style>
	:global(.wx-sidearea .wx-gantt-editor) {
		width: 400px;
	}
	:global(.wx-sidearea .wx-gantt-editor.wx-full-screen) {
		width: 100%;
	}
</style>
