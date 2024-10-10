<script>
	// svelte core
	import { createEventDispatcher, setContext } from "svelte";
	import { writable } from "svelte/store";

	// locales
	import { Locale } from "wx-svelte-core";
	import { en } from "wx-gantt-locales";

	// stores
	import { EventBusRouter } from "wx-lib-state";
	import {
		DataStore,
		defaultEditorShape,
		defaultColumns,
	} from "wx-gantt-store";

	//views
	import Layout from "./Layout.svelte";

	// incoming parameters
	export let taskTemplate = null;
	export let markers = [];
	export let taskTypes = [
		{ id: "task", label: "Task" },
		{ id: "summary", label: "Summary task" },
		{ id: "milestone", label: "Milestone" },
	];
	export let tasks = [];
	export let selected = [];
	export let activeTask = null;
	export let links = [];
	export let scales = [
		{ unit: "month", step: 1, format: "MMMM yyy" },
		{ unit: "day", step: 1, format: "d" },
	];
	export let columns = defaultColumns;
	export let start = null;
	export let end = null;
	export let lengthUnit = "day";
	export let cellWidth = 100;
	export let cellHeight = 38;
	export let scaleHeight = 36;
	export let readonly = false;
	export let cellBorders = "full";
	export let editorShape = defaultEditorShape;
	export let zoom = false;
	export let baselines = false;
	export let highlightTime = null;

	export let init = null;
	const dispatch = createEventDispatcher();

	// init stores
	const dataStore = new DataStore(writable);
	$: {
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
		});
		if (init) {
			init(api);
			init = null;
		}
	}

	// define event route
	let lastInRoute = new EventBusRouter(dispatch);
	let firstInRoute = dataStore.in;

	firstInRoute.setNext(lastInRoute);

	// public API
	export const api = {
		// state
		getState: dataStore.getState.bind(dataStore),
		getReactiveState: dataStore.getReactive.bind(dataStore),
		getStores: () => ({ data: dataStore }),

		// events
		exec: firstInRoute.exec,
		setNext: ev => (lastInRoute = lastInRoute.setNext(ev)),
		intercept: firstInRoute.intercept.bind(firstInRoute),
		on: firstInRoute.on.bind(firstInRoute),
		detach: firstInRoute.detach.bind(firstInRoute),

		//specific
		getTask: id => dataStore.getTask(id),
	};

	// common API available in components
	setContext("gantt-store", {
		getReactiveState: dataStore.getReactive.bind(dataStore),
		exec: firstInRoute.exec.bind(firstInRoute),
		getTask: dataStore.getTask.bind(dataStore),
	});
</script>

<Locale words={en} optional={true}>
	<Layout
		{taskTemplate}
		{markers}
		{readonly}
		{cellBorders}
		{editorShape}
		{highlightTime}
	/>
</Locale>
