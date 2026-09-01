<script>
	import { getContext, setContext } from "svelte";
	import { ContextMenu } from "@svar-ui/svelte-menu";
	import {
		handleAction,
		getMenuOptions,
		isHandledAction,
	} from "@svar-ui/gantt-store";

	import { locale, locateID, locate } from "@svar-ui/lib-dom";
	import { en } from "@svar-ui/gantt-locales";
	import { en as coreEn } from "@svar-ui/core-locales";

	let {
		options = [],
		api = null,
		resolver = null,
		filter = null,
		at = "point",
		children,
		onclick,
		css,
	} = $props();

	let activeId = null;
	// set locale
	let l = getContext("wx-i18n");
	if (!l) {
		l = locale({ ...en, ...coreEn });
		setContext("wx-i18n", l);
	}
	const _ = l.getGroup("gantt");

	let state = $derived(api?.getReactiveState());
	let { taskTypes, selected, _selected, splitTasks, summary, groupBy } =
		$derived(state || {});

	let config = $derived({
		splitTasks: $splitTasks,
		taskTypes: $taskTypes,
		summary: $summary,
		group: !!$groupBy?.field,
	});

	const tasks = $derived($_selected ?? []);

	const fullOptions = $derived(getMenuOptions(config));

	const customOptions = $derived(options.length ? options : null);
	const localizedOptions = $derived(
		applyLocale(customOptions ?? fullOptions)
	);

	function cloneMenuItems(items) {
		return items.map(op => {
			const copy = { ...op };
			if (op.data) copy.data = cloneMenuItems(op.data);
			return copy;
		});
	}

	function applyLocale(options) {
		return options.map(op => {
			op = { ...op };
			if (op.text) op.text = _(op.text);
			if (op.subtext) op.subtext = _(op.subtext);
			if (op.data) op.data = applyLocale(op.data);
			return op;
		});
	}

	function buildOptions() {
		if (!api) return [];
		const items = cloneMenuItems(localizedOptions);
		const setDisabled = data => {
			data.forEach(item => {
				if (item.isDisabled) {
					item.disabled = tasks.some(task =>
						item.isDisabled(
							task,
							api.getState(),
							api.getTaskCalendar(task),
							activeId
						)
					);
				}
				if (item.data) setDisabled(item.data);
			});
		};
		setDisabled(items);
		return items;
	}

	function itemResolver(id, ev) {
		if (
			locate(ev.target, "data-menu-ignore")?.classList.contains(
				"wx-resource-load"
			)
		)
			return null;

		let task = id ? api.getTask(id) : null;
		if (resolver) {
			const result = resolver(id, ev);
			task = result === true ? task : result;
		}
		if (task) {
			const segmentIndex = locateID(ev.target, "data-segment");
			if (segmentIndex !== null) activeId = { id: task.id, segmentIndex };
			else activeId = task.id;

			if (!$selected.includes(task.id)) {
				api.exec("select-task", { id: task.id });
			}

			menuOptions = buildOptions();
		}

		return task;
	}

	function menuAction(ev) {
		const action = ev.action;
		if (action) {
			const isAction = isHandledAction(fullOptions, action.id);
			if (isAction) handleAction(api, action.id, activeId, _);
			onclick && onclick(ev);
		}
	}

	function filterMenu(item) {
		if (!api) return true;
		let result = filter ? tasks.every(task => filter(item, task)) : true;

		if (result) {
			if (item.isHidden)
				result = !tasks.some(task =>
					item.isHidden(task, api.getState(), activeId)
				);
		}
		return result;
	}

	let subscribed = false;
	$effect(() => {
		if (api && !subscribed) {
			subscribed = true;
			api.on("scroll-chart", () => menu.show());
			api.on("drag-task", () => menu.show());
		}
	});

	// built imperatively before the menu opens, not derived from the store (avoids rebuild churn on every store tick)
	let menuOptions = $state([]);

	let menu = $state();
	export function show(ev, obj) {
		menuOptions = buildOptions();
		menu.show(ev, obj);
	}
</script>

<ContextMenu
	filter={filterMenu}
	options={menuOptions}
	dataKey={"id"}
	resolver={itemResolver}
	onclick={menuAction}
	{css}
	{at}
	bind:this={menu}
/>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<span oncontextmenu={menu.show} data-menu-ignore="true">
	{@render children?.()}
</span>

<style>
	:global(.wx-menu .wx-option.wx-disabled) {
		pointer-events: none;
	}
	:global(.wx-menu .wx-option.wx-disabled .wx-value),
	:global(.wx-menu .wx-option.wx-disabled .wx-icon) {
		color: var(--wx-color-font-disabled);
	}
</style>
