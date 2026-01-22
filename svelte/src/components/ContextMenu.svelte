<script>
	import { getContext, setContext } from "svelte";
	import { ContextMenu } from "@svar-ui/svelte-menu";
	import {
		handleAction,
		getMenuOptions,
		isHandledAction,
	} from "@svar-ui/gantt-store";

	import { locale, locateID } from "@svar-ui/lib-dom";
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
	const _ = getContext("wx-i18n").getGroup("gantt");

	let state = $derived(api?.getReactiveState());
	let { taskTypes, selected, _selected, splitTasks, summary } = $derived(
		state || {}
	);

	let config = $derived({
		splitTasks: $splitTasks,
		taskTypes: $taskTypes,
		summary: $summary,
	});

	const fullOptions = $derived(getMenuOptions(config));

	function getOptions() {
		const finalOptions = options.length ? options : getMenuOptions(config);

		return applyLocale(finalOptions);
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

	function itemResolver(id, ev) {
		let task = id ? api.getTask(id) : null;
		if (resolver) {
			const result = resolver(id, ev);
			task = result === true ? task : result;
		}
		if (task) {
			//resolver runs earlier than $derived for cOptions
			const segmentIndex = locateID(ev.target, "data-segment");
			if (segmentIndex !== null) activeId = { id: task.id, segmentIndex };
			else activeId = task.id;

			if (!$selected.includes(task.id)) {
				api.exec("select-task", { id: task.id });
			}
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

	function filterMenu(item, task) {
		// for single selection from resolver _selected are empty
		// due to setAsyncState causing _selected to lag
		const tasks = $_selected.length ? $_selected : task ? [task] : [];

		let result = filter ? tasks.every(task => filter(item, task)) : true;

		if (result) {
			if (item.isHidden)
				result = !tasks.some(task =>
					item.isHidden(task, api.getState(), activeId)
				);
			if (item.isDisabled) {
				const disabled = tasks.some(task =>
					item.isDisabled(task, api.getState(), activeId)
				);
				item.disabled = disabled;
			}
		}
		return result;
	}

	const cOptions = $derived.by(() => {
		api.on("scroll-chart", () => menu.show());
		api.on("drag-task", () => menu.show());

		return getOptions();
	});

	let menu = $state();
	export function show(ev, obj) {
		menu.show(ev, obj);
	}
</script>

<ContextMenu
	filter={filterMenu}
	options={cOptions}
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
