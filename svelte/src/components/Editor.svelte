<script>
	import { getContext, setContext } from "svelte";
	import { Editor, registerEditorItem } from "@svar-ui/svelte-editor";
	import { Locale } from "@svar-ui/svelte-core";
	import { getEditorItems, prepareEditTask } from "@svar-ui/gantt-store";
	import { dateToString, locale } from "@svar-ui/lib-dom";
	import { en } from "@svar-ui/gantt-locales";
	import { en as coreEn } from "@svar-ui/core-locales";

	import { RichSelect, Slider, Counter, TwoState } from "@svar-ui/svelte-core";
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
		bottomBar = true,
		topBar = true,
		autoSave = true,
		focus = false,
		hotkeys = {},
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
	let unscheduledTasks = $derived(state?.unscheduledTasks);
	let summary = $derived(state?.summary);
	let links = $derived(state?.links);
	let segmentIndex = $derived(state?.splitTasks && $taskId?.segmentIndex);
	let taskTypes = $derived(state?.taskTypes);
	let isSegment = $derived(segmentIndex || segmentIndex === 0);

	let baseItems = $derived(
		getEditorItems({
			unscheduledTasks: $unscheduledTasks,
			summary: $summary,
			taskTypes: $taskTypes,
		})
	);
	let undo = $derived(state?.undo);

	let linksActionsMap = $state({});
	let inProgress = $state(null);

	let editorValues = $state();
	let editorErrors = $state(null);

	let task = $derived.by(() => {
		if (!$activeTask) return null;
		let data;
		if (isSegment && $activeTask.segments)
			data = { ...$activeTask.segments[segmentIndex] };
		else data = { ...$activeTask };

		if (readonly) {
			// preserve parent to differentiate between segment and task
			let values = { parent: data.parent };
			baseItems.forEach(({ key, comp }) => {
				if (comp !== "links") {
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
		linksActionsMap = {};
		editorErrors = null;
		inProgress = null;
	});

	const editorItems = $derived.by(() => {
		let eItems = items.length ? items : baseItems;
		eItems = prepareEditorItems(eItems, editorValues);
		if (!editorValues) return eItems;
		return eItems.filter(
			item =>
				!item.isHidden || !item.isHidden(editorValues, api.getState())
		);
	});

	const editorKeys = $derived(editorItems.map(i => i.key));

	function prepareEditorItems(items, task) {
		return items.map(a => {
			const item = { ...a };
			if (a.config) item.config = { ...item.config };
			if (item.comp === "links" && api) {
				item.api = api;
				item.autoSave = autoSave;
				item.onlinkschange = handleLinksChange;
			}
			if (item.comp === "select" && item.key === "type") {
				const options = item.options ?? [];
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

			if (task) {
				if (item.isDisabled && item.isDisabled(task, api.getState())) {
					item.disabled = true;
				} else delete item.disabled;
			}
			return item;
		});
	}

	function handleLinksChange({ id, action, data }) {
		linksActionsMap[id] = { action, data };
	}

	function saveLinks() {
		for (let link in linksActionsMap) {
			if ($links.byId(link)) {
				const { action, data } = linksActionsMap[link];
				api.exec(action, data);
			}
		}
	}

	function deleteTask() {
		const id = $taskId.id || $taskId;
		if (isSegment) {
			if ($activeTask.segments) {
				const segments = $activeTask.segments.filter(
					(s, index) => index !== segmentIndex
				);
				api.exec("update-task", {
					id,
					task: { segments },
				});
			}
		} else {
			api.exec("delete-task", { id });
		}
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

		prepareEditTask(task, api.getState(), key);
		if (!input) inProgress = false;
		return task;
	}

	function handleSave(ev) {
		if (!autoSave) save(ev.values);
	}

	function handleValidation(check) {
		// get all errors after onchange action
		editorErrors = check.errors;
	}

	function save(values) {
		values = {
			...values,
			unscheduled:
				$unscheduledTasks &&
				values.unscheduled &&
				values.type !== "summary",
		};
		delete values.links;
		delete values.data;

		if (
			editorKeys.indexOf("duration") === -1 ||
			(values.segments && !values.duration)
		)
			delete values.duration;

		const data = {
			id: $taskId.id || $taskId,
			task: values,
			...(isSegment && { segmentIndex }),
		};
		if (autoSave && inProgress) data.inProgress = inProgress;

		api.exec("update-task", data);

		if (!autoSave) saveLinks();
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
			onvalidation={handleValidation}
			onchange={handleChange}
			hotkeys={hotkeys && { ...defaultHotkeys, ...hotkeys }}
		/>
	</Locale>
{/if}

<style>
	:global(.wx-sidearea .wx-gantt-editor) {
		width: 450px;
	}
	:global(.wx-sidearea .wx-gantt-editor.wx-full-screen) {
		width: 100%;
	}
</style>
