<script>
	import { getContext, setContext } from "svelte";
	import { ContextMenu } from "wx-svelte-menu";
	import {
		handleAction,
		defaultMenuOptions,
		isHandledAction,
	} from "wx-gantt-store";

	import { locale } from "wx-lib-dom";
	import { en } from "wx-gantt-locales";
	import { en as coreEn } from "wx-core-locales";

	let {
		options = [...defaultMenuOptions],
		api = null,
		resolver = null,
		filter = null,
		at = "point",
		children,
		onclick,
	} = $props();

	let activeId = null;
	let rState, rTaskTypes, rSelected, rTasks, rSelectedTasks;
	// set locale
	let l = getContext("wx-i18n");
	if (!l) {
		l = locale({ ...en, ...coreEn });
		setContext("wx-i18n", l);
	}
	const _ = getContext("wx-i18n").getGroup("gantt");

	function getOptions() {
		const convertOption = options.find(o => o.id === "convert-task");
		if (convertOption) {
			convertOption.data = [];
			$rTaskTypes.forEach(t => {
				convertOption.data.push(convertOption.dataFactory(t));
			});
		}

		return applyLocale(options);
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
			rSelected = api.getReactiveState().selected;
			activeId = task.id;

			if (!$rSelected.includes(task.id)) {
				api.exec("select-task", { id: task.id });
			}
		}

		return task;
	}

	function menuAction(ev) {
		const action = ev.action;
		if (action) {
			const isAction = isHandledAction(defaultMenuOptions, action.id);
			if (isAction) handleAction(api, action.id, activeId, _);
			onclick && onclick(ev);
		}
	}

	function filterMenu(item, task) {
		// for single selection from resolver selectedTasks are empty
		// due to setAsyncState causing _selected to lag
		const tasks = selectedTasks.length ? selectedTasks : task ? [task] : [];

		let result = filter ? filter(item, task) : true;
		if (item.check && result) {
			const isDisabled = tasks.some(task => !item.check(task, $rTasks));

			item.css = isDisabled ? "wx-disabled" : "";
		}
		return result;
	}

	const cOptions = $derived.by(() => {
		if (api) {
			rState = api.getReactiveState();
			rTaskTypes = rState.taskTypes;
			rTasks = rState._tasks;
			rSelected = rState.selected;
			rSelectedTasks = rState._selected;

			api.on("scroll-chart", () => menu.show());
			api.on("drag-task", () => menu.show());

			return getOptions();
		}

		return null;
	});

	let selectedTasks = $derived($rSelectedTasks || []);

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
	{at}
	bind:this={menu}
/>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<span oncontextmenu={menu.show} data-menu-ignore="true">
	{@render children?.()}
</span>

<style>
	:global(.wx-menu .wx-item.wx-disabled) {
		pointer-events: none;
	}
	:global(.wx-menu .wx-item.wx-disabled .wx-value),
	:global(.wx-menu .wx-item.wx-disabled .wx-icon) {
		color: var(--wx-color-font-disabled);
	}
</style>
