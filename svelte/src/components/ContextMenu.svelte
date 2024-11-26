<script>
	import { createEventDispatcher, getContext, setContext } from "svelte";
	import { ContextMenu } from "wx-svelte-menu";
	import { handleAction, defaultMenuOptions } from "wx-gantt-store";

	import { locale } from "wx-lib-dom";
	import { en } from "wx-gantt-locales";
	import { en as coreEn } from "wx-core-locales";

	let {
		options = [...defaultMenuOptions],
		api = null,
		resolver = null,
		filter = null,
		handler = $bindable(() => {}),
		at = "point",
		children,
	} = $props();

	const dispatch = createEventDispatcher();

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
			const isSelected = $rSelected.includes(task.id);

			if (!isSelected) {
				// Manually set selectedTask for single select due to setAsyncState
				// in handler causing _selected to lag
				selectedTasks = [task];
				api.exec("select-task", { id: task.id });
			}
			activeId = task.id;
		}

		return task;
	}
	function scrollHandler() {
		handler();
	}

	function menuAction(ev) {
		const action = ev.action;
		if (action) {
			handleAction(api, action.id, activeId, _);
			dispatch("click", ev);
		}
	}

	function filterMenu(item, task) {
		let result = filter ? filter(item, task) : true;
		if (item.check && result) {
			const isDisabled = selectedTasks.some(
				task => !item.check(task, $rTasks)
			);

			item.css = isDisabled ? "disabled" : "";
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

			api.on("scroll-chart", () => scrollHandler());
			api.on("drag-task", () => {
				handler();
			});

			return getOptions();
		}

		return null;
	});

	let selectedTasks = $derived($rSelectedTasks || []);
	let menu = $state();
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
	:global(.menu .item.disabled) {
		pointer-events: none;
	}
	:global(.menu .item.disabled .value),
	:global(.menu .item.disabled .icon) {
		color: var(--wx-color-font-disabled);
	}
</style>
