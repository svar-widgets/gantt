<script>
	import { getContext, setContext, untrack } from "svelte";
	import { Editor, registerEditorItem } from "@svar-ui/svelte-editor";
	import { registerToolbarItem } from "@svar-ui/svelte-toolbar";
	import { Locale, Tabs } from "@svar-ui/svelte-core";
	import {
		getEditorItems,
		prepareEditTask,
		getEditorButtons,
		filterEditorButtons,
	} from "@svar-ui/gantt-store";
	import { dateToString, locale } from "@svar-ui/lib-dom";
	import { en } from "@svar-ui/gantt-locales";
	import { en as coreEn } from "@svar-ui/core-locales";

	import {
		RichSelect,
		Slider,
		Counter,
		TwoState,
		Checkbox,
	} from "@svar-ui/svelte-core";
	import Links from "./editor/Links.svelte";
	import DateTimePicker from "./editor/DateTimePicker.svelte";
	import Resources from "./editor/Resources.svelte";
	import Segments from "./editor/Segments.svelte";

	registerEditorItem("select", RichSelect);
	registerEditorItem("date", DateTimePicker);
	registerEditorItem("twostate", TwoState);
	registerEditorItem("slider", Slider);
	registerEditorItem("counter", Counter);
	registerEditorItem("links", Links);
	registerEditorItem("checkbox", Checkbox);
	registerEditorItem("resources", Resources);
	registerEditorItem("segments", Segments);
	registerToolbarItem("tabs", Tabs);

	let l = getContext("wx-i18n");
	if (!l) {
		l = locale({ ...en, ...coreEn });
		setContext("wx-i18n", l);
	}
	const _ = l.getGroup("gantt");
	const i18nData = l.getRaw();
	const f = i18nData.gantt?.dateFormat || i18nData.formats?.dateFormat;
	const dateFormat = dateToString(f, i18nData.calendar);

	let {
		api,
		items = [],
		css = "",
		layout = "default",
		readonly = false,
		placement = "sidebar",
		bottomBar = false,
		topBar = true,
		autoSave = true,
		focus = false,
		hotkeys = {},
	} = $props();

	let state = $derived(api?.getReactiveState());

	const defBatch = "general";

	let activeTask = $derived(state?._activeTask ?? null);
	let taskId = $derived(state?.activeTask ?? null);
	let unscheduledTasks = $derived(state?.unscheduledTasks);
	let rollups = $derived(state?.rollups);
	let summary = $derived(state?.summary);
	let links = $derived(state?.links);
	let splitTasks = $derived(state?.splitTasks);
	let taskTypes = $derived(state?.taskTypes);
	let resources = $derived(state?.resources ?? null);
	let activeBatch = $state(defBatch);
	let compactMode = $derived(state?._compactMode);
	let styleCss = $derived($compactMode ? "wx-full-screen" : "");

	let baseItems = $derived(
		getEditorItems({
			unscheduledTasks: $unscheduledTasks,
			rollups: $rollups,
			summary: $summary,
			taskTypes: $taskTypes,
			resources: $resources,
			splitTasks: $splitTasks,
		})
	);
	let undo = $derived(state?.undo);

	let linksActions = $state(new Map());
	let assignmentsActions = $state(new Map());
	let segmentsActions = $state(new Map());
	let inProgress = $state(null);

	let editorValues = $state();
	let editorErrors = $state(null);

	const externalValues = {
		taskAssignments: null,
		predecessors: null,
		successors: null,
	};
	let notSavedValues = $state({ ...externalValues });

	let task = $derived.by(() => {
		if (!$activeTask) return null;
		const data = { ...$activeTask };

		if (readonly) {
			// preserve parent to differentiate between segment and task
			let values = { parent: data.parent };
			baseItems.forEach(({ key, comp }) => {
				if (comp !== "links" && comp !== "resources") {
					const value = data[key];
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
		return data || null;
	});

	$effect(() => {
		editorValues = task;
	});

	$effect(() => {
		$taskId;
		untrack(() => {
			linksActions = new Map();
			assignmentsActions = new Map();
			segmentsActions = new Map();
			editorErrors = null;
			inProgress = null;
			activeBatch = activeBatch || defBatch;
			notSavedValues = { ...externalValues };
		});
	});

	// items

	function normalizeItems(items, area = "form") {
		if (!api || !items || !Array.isArray(items)) return items;
		return items
			.filter(b => {
				if (!editorValues) return true;
				return !b.isHidden || !b.isHidden(editorValues, api.getState());
			})
			.map(b => {
				const item = { ...b };
				if (item.items && Array.isArray(item.items)) {
					item.items = normalizeItems(item.items);
					return item;
				}
				if (area === "form" && !item.batch) {
					item.batch = defBatch;
				}

				if (
					["links", "resources", "segments"].includes(item.key) &&
					api
				) {
					item.api = api;
					item.autoSave = autoSave;
					if (item.key === "resources") {
						item.taskAssignments = notSavedValues.taskAssignments;
					} else if (item.key === "links") {
						item.successors = notSavedValues.successors;
						item.predecessors = notSavedValues.predecessors;
					} else if (item.key === "segments") {
						item.segments = notSavedValues.segments;
					}
					item.onextchange = handleExternalChange;
				}
				if (item.id === "tabs") {
					item.api = api;
					item.css = "wx-gantt-tabs";
					item.value = activeBatch;
					item.onchange = item.onchange || onTabChange;
				}

				if (item.comp === "slider" && item.key === "progress") {
					item.labelTemplate = value => `${_(item.label)} ${value}%`;
				}
				if (item.text) item.text = _(item.text);
				if (item.label) item.label = _(item.label);
				if (item.options) item.options = normalizeItems(item.options);

				if (item.config) item.config = { ...item.config };
				if (item.config?.placeholder)
					item.config.placeholder = _(item.config.placeholder);

				if (
					editorValues &&
					item.isDisabled &&
					item.isDisabled(
						editorValues,
						api.getState(),
						api.getTaskCalendar(editorValues)
					)
				) {
					item.disabled = true;
				} else delete item.disabled;
				return item;
			});
	}

	const editorItems = $derived.by(() => {
		const eItems = items.length ? items : baseItems;
		return normalizeItems(eItems);
	});

	const editorBatches = $derived(new Set(editorItems.map(i => i.batch)));

	// Reset activeBatch
	// (ex. Segments removed when all segments merged/removed)
	$effect(() => {
		if (!editorBatches.has(activeBatch)) activeBatch = defBatch;
	});

	const editorKeys = $derived(editorItems.map(i => i.key));

	function normalizeBar(bar, batches, type) {
		bar = typeof bar !== "object" ? {} : { ...bar };
		if (!bar.items) {
			bar.items = getEditorButtons({
				resources: $resources,
				autoSave,
				splitTasks: $splitTasks,
			});
		}
		bar.items = filterEditorButtons(bar.items, item => {
			if (item.id === "tabs") {
				item.type = item.type || type;
				// filter options by batches and hide tabs with one tab
				item.options = item.options.filter(op => batches.has(op.id));
				if (item.options.length < 2) return false;
			}
			return true;
		});
		bar.items = normalizeItems(bar.items, "toolbar");
		if (!bar.layout) {
			const isColumn = bar.items.some(i => i.items);
			bar.layout = isColumn ? "column" : "row";
		}
		return bar;
	}

	let normalizedTopBar = $derived.by(() => {
		if (!topBar || readonly) return false;
		return normalizeBar(topBar, editorBatches, "top");
	});

	let normalizedBottomBar = $derived.by(() => {
		if (!bottomBar || readonly) return false;
		return normalizeBar(bottomBar, editorBatches, "bottom");
	});

	function handleExternalChange({ view, event, values }) {
		const { id, action, data } = event;
		let actions;
		if (view === "links") actions = linksActions;
		else if (view === "resources") actions = assignmentsActions;
		else if (view === "segments") actions = segmentsActions;
		actions.set(id, { action, data });
		Object.keys(values).forEach(key => {
			notSavedValues[key] = values[key];
		});
	}

	function saveSections() {
		for (let [linkId, value] of linksActions) {
			if ($links.byId(linkId)) {
				const { action, data } = value;
				api.exec(action, data);
			}
		}
		[assignmentsActions, segmentsActions].forEach(actions => {
			for (let [, value] of actions) {
				const { action, data } = value;
				api.exec(action, data);
			}
		});
	}

	function deleteTask() {
		api.exec("delete-task", { id: $taskId });
	}

	function hide() {
		api.exec("show-editor", { id: null });
	}

	function handleAction(ev) {
		const { item } = ev;
		if (item.id === "delete") {
			deleteTask();
		} else if (item.id === "save") {
			saveSections();
		}
		if (item.comp) hide();
	}

	function handleChange(ev) {
		let { update, key, input } = ev;

		if (input) inProgress = true;

		ev.update = normalizeTask({ ...update }, key, input);

		if (!autoSave) editorValues = ev.update;
		else if (!editorErrors && !input) {
			const item = editorItems.find(i => i.key === key);
			const v = update[key];
			const isValid = !item.validation || item.validation(v);
			if (isValid && (!item.required || v)) save(ev.update);
		}
	}

	function normalizeTask(task, key, input) {
		if ($unscheduledTasks && task.type === "summary")
			task.unscheduled = false;

		prepareEditTask(task, api.getState(), api.getTaskCalendar(task), key);
		if (!input) inProgress = false;
		return task;
	}

	function handleSave(ev) {
		if (!autoSave) save(ev.values, ev.changes);
	}

	function handleValidation(check) {
		// get all errors after onchange action
		editorErrors = check.errors;
	}

	function save(values, changes) {
		delete values.links;
		delete values.data;

		if (
			editorKeys.indexOf("duration") === -1 ||
			(values.segments && !values.duration)
		)
			delete values.duration;

		const data = {
			id: $taskId,
			task: values,
		};
		if (autoSave && inProgress) data.inProgress = inProgress;

		api.exec("update-task", data);

		// when changes is not empty, Editor calls onsave and onaction({id: "save})
		if (!autoSave && !changes?.length) saveSections();
	}

	const defaultHotkeys = $derived(
		$undo
			? {
					"ctrl+z": ev => {
						ev.preventDefault();
						api.exec("undo");
					},
					"ctrl+y": ev => {
						ev.preventDefault();
						api.exec("redo");
					},
				}
			: {}
	);

	function onTabChange(ev) {
		activeBatch = ev.value;
	}
</script>

{#if task}
	<Locale>
		<Editor
			css={`wx-gantt-editor ${styleCss} ${css}`}
			items={editorItems}
			values={task}
			topBar={normalizedTopBar}
			bottomBar={normalizedBottomBar}
			{placement}
			{layout}
			{readonly}
			{autoSave}
			{focus}
			{activeBatch}
			onaction={handleAction}
			onsave={handleSave}
			onvalidation={handleValidation}
			onchange={handleChange}
			hotkeys={hotkeys && { ...defaultHotkeys, ...hotkeys }}
		/>
	</Locale>
{/if}

<style>
	:global(.wx-sidearea .wx-gantt-editor) {
		width: 450px;
		&.wx-full-screen {
			width: 100%;
		}
	}

	:global(.wx-gantt-editor .wx-editor-toolbar) {
		margin-bottom: 4px;
		& .wx-toolbar {
			padding-left: 0;
			padding-right: 0;
			gap: 16px;
		}
		& .wx-tb-body {
			gap: 8px;
		}
		& .wx-tb-element {
			padding-left: 0;
			padding-right: 0;
		}
		/* temp: svelte-toolbar 2.6.1 stretches every .wx-tb-element under a
		   column toolbar, which also hits the ones inside row groups */
		& :global(.wx-tb-group:not(.wx-column) > .wx-tb-body > .wx-tb-element) {
			width: auto;
		}
		& .wx-gantt-tabs {
			align-self: start;
		}
		& :global(.wx-gantt-tabs .wx-tabs) {
			gap: 16px;
		}

		& :global(.wx-gantt-tabs button) {
			padding-left: 0;
			padding-right: 0;
			min-width: 40px;
		}
		& :global(.wx-gantt-tabs .wx-active:after),
		& :global(.wx-gantt-tabs button:hover:after) {
			width: 100%;
			left: 0;
		}
	}
</style>
