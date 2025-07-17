<script>
	// svelte core
	import { setContext } from "svelte";
	import { writable } from "svelte/store";

	// locales
	import { Locale } from "wx-svelte-core";
	import { en } from "wx-gantt-locales";

	// stores
	import { EventBusRouter } from "wx-lib-state";
	import {
		DataStore,
		defaultColumns,
		defaultTaskTypes,
	} from "wx-gantt-store";

	//views
	import Layout from "./Layout.svelte";

	let {
		taskTemplate = null,
		markers = [],
		taskTypes = defaultTaskTypes,
		tasks = [],
		selected = [],
		activeTask = null,
		links = [],
		scales = [
			{ unit: "month", step: 1, format: "MMMM yyy" },
			{ unit: "day", step: 1, format: "d" },
		],
		columns = defaultColumns,
		start = null,
		end = null,
		lengthUnit = "day",
		durationUnit = "day",
		cellWidth = 100,
		cellHeight = 38,
		scaleHeight = 36,
		readonly = false,
		cellBorders = "full",
		zoom = false,
		baselines = false,
		highlightTime = null,
		init = null,
		autoScale = true,
		unscheduledTasks = false,
		tableAPI = null,
		...restProps
	} = $props();

	// init stores
	const dataStore = new DataStore(writable);

	// define event route
	let firstInRoute = dataStore.in;

	const dash = /-/g;
	let lastInRoute = new EventBusRouter((a, b) => {
		const name = "on" + a.replace(dash, "");
		if (restProps[name]) {
			restProps[name](b);
		}
	});
	firstInRoute.setNext(lastInRoute);

	// public API
	export const // state
		getState = dataStore.getState.bind(dataStore),
		getReactiveState = dataStore.getReactive.bind(dataStore),
		getStores = () => ({ data: dataStore }),
		// events
		exec = firstInRoute.exec,
		setNext = ev => (lastInRoute = lastInRoute.setNext(ev)),
		intercept = firstInRoute.intercept.bind(firstInRoute),
		on = firstInRoute.on.bind(firstInRoute),
		detach = firstInRoute.detach.bind(firstInRoute),
		//specific
		getTask = id => dataStore.getTask(id),
		serialize = () => dataStore.serialize(),
		getTable = waitRender =>
			waitRender
				? new Promise(res => setTimeout(() => res(tableAPI), 1))
				: tableAPI;

	const api = {
		getState,
		getReactiveState,
		getStores,
		exec,
		setNext,
		intercept,
		on,
		detach,
		getTable,
		getTask,
		serialize,
	};

	// common API available in components
	setContext("gantt-store", {
		getReactiveState: dataStore.getReactive.bind(dataStore),
		exec: firstInRoute.exec.bind(firstInRoute),
		getTask: dataStore.getTask.bind(dataStore),
	});

	let init_once = true;
	const reinitStore = () => {
		dataStore.init({
			tasks,
			links,
			start,
			columns,
			end,
			lengthUnit,
			cellWidth,
			cellHeight,
			scaleHeight,
			scales,
			taskTypes,
			zoom,
			selected,
			activeTask,
			baselines,
			autoScale,
			unscheduledTasks,
			markers,
			durationUnit,
		});

		if (init_once && init) {
			init(api);
			init_once = false;
		}
	};

	reinitStore();
	$effect(reinitStore);
</script>

<Locale words={en} optional={true}>
	<Layout
		{taskTemplate}
		{readonly}
		{cellBorders}
		{highlightTime}
		bind:tableAPI
	/>
</Locale>
