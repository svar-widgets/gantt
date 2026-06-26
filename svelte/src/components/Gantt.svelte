<script>
	// svelte core
	import { setContext } from "svelte";
	import { writable } from "svelte/store";

	// locales
	import { locale as l } from "@svar-ui/lib-dom";
	import { en } from "@svar-ui/gantt-locales";
	import { en as coreEn } from "@svar-ui/core-locales";

	// stores
	import { EventBusRouter } from "@svar-ui/lib-state";
	import {
		DataStore,
		getDefaultColumns,
		getDefaultGridWidth,
		defaultTaskTypes,
		normalizeZoom,
	} from "@svar-ui/gantt-store";
	import { getContext } from "svelte";

	//views
	import Layout from "./Layout.svelte";

	// helpers
	import {
		prepareScales,
		prepareFormats,
		prepareColumns,
		prepareZoom,
	} from "../helpers/prepareConfig.js";

	let {
		taskTemplate = null,
		markers = [],
		taskTypes = defaultTaskTypes,
		tasks = [],
		selected = [],
		activeTask = null,
		links = [],
		resources = null,
		assignments = [],
		scales = [
			{ unit: "month", step: 1, format: "%F %Y" },
			{ unit: "day", step: 1, format: "%j" },
		],
		columns = null,
		start = null,
		end = null,
		lengthUnit = "day",
		durationUnit = "day",
		cellWidth = 100,
		cellHeight = 38,
		scaleHeight = 36,
		gridWidth = null,
		displayMode = "all",
		readonly = false,
		cellBorders = "full",
		zoom = false,
		baselines = false,
		rollups = false,
		highlightTime = null,
		init = null,
		autoScale = true,
		unscheduledTasks = false,
		criticalPath = null,
		schedule = { type: "forward" },
		projectStart = null,
		projectEnd = null,
		calendar = null,
		calendars = [],
		undo = false,
		splitTasks = false,
		summary = null,
		slack = false,
		groupBy = null,
		wbs = false,
		...restProps
	} = $props();

	// init stores
	const dataStore = new DataStore(writable);

	// locale and formats
	// uses same logic as the Locale component
	const words = { ...coreEn, ...en };
	let locale = getContext("wx-i18n");
	if (!locale) locale = l(words);
	else locale = locale.extend(words, true);
	setContext("wx-i18n", locale);

	// prepare configuration objects
	const { calendar: lCalendar } = locale.getRaw();

	// default column set (incl. auto-added resources/wbs columns) drives the
	// default grid width when none is provided by the user
	let defaultGridColumns = $derived(
		getDefaultColumns({ resources: !!resources, wbs })
	);
	let resolvedGridWidth = $derived(
		gridWidth ?? getDefaultGridWidth(defaultGridColumns)
	);

	let normalizedConfig = $derived.by(() => {
		let config = {
			zoom: prepareZoom(zoom, lCalendar),
			scales: prepareScales(scales, lCalendar),
			columns: prepareColumns(columns ?? defaultGridColumns, lCalendar),
			links,
			cellWidth,
		};
		if (config.zoom) {
			config = {
				...config,
				...normalizeZoom(
					config.zoom,
					prepareFormats(lCalendar, locale.getGroup("gantt")),
					config.scales,
					cellWidth
				),
			};
		}
		return config;
	});

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

	let tableAPI = $state();
	let ganttWidth = $state();
	const COMPACT_WIDTH = 650;
	let compactMode = $derived(ganttWidth <= COMPACT_WIDTH);

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
		getResource = id => dataStore.getResource(id),
		serialize = config => dataStore.serialize(config),
		getTable = waitRender =>
			waitRender
				? new Promise(res => setTimeout(() => res(tableAPI), 1))
				: tableAPI,
		getHistory = () => dataStore.getHistory(),
		getCalendar = id => dataStore.getCalendar(id),
		getTaskCalendar = task => dataStore.getTaskCalendar(task),
		getResourceCalendar = resource =>
			dataStore.getResourceCalendar(resource),
		getTaskResources = id => dataStore.getTaskResources(id),
		getResourceTasks = id => dataStore.getResourceTasks(id);

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
		getResource,
		serialize,
		getHistory,
		getCalendar,
		getTaskResources,
		getResourceTasks,
		getTaskCalendar,
	};

	// common API available in components
	setContext("gantt-store", {
		getReactiveState: dataStore.getReactive.bind(dataStore),
		getState: dataStore.getState.bind(dataStore),
		exec: firstInRoute.exec.bind(firstInRoute),
		getTask: dataStore.getTask.bind(dataStore),
		getTaskCalendar: dataStore.getTaskCalendar.bind(dataStore),
		getResourceCalendar: dataStore.getResourceCalendar.bind(dataStore),
		getCalendar: dataStore.getCalendar.bind(dataStore),
		getTaskResources: dataStore.getTaskResources.bind(dataStore),
		getHistory: dataStore.getHistory.bind(dataStore),
	});

	let init_once = true;
	const reinitStore = () => {
		dataStore.init({
			tasks,
			links: normalizedConfig.links,
			resources,
			assignments,
			start,
			columns: normalizedConfig.columns,
			end,
			lengthUnit,
			cellWidth: normalizedConfig.cellWidth,
			cellHeight,
			scaleHeight,
			scales: normalizedConfig.scales,
			taskTypes,
			zoom: normalizedConfig.zoom,
			selected,
			activeTask,
			baselines,
			rollups: rollups === true ? { type: "closest" } : rollups,
			autoScale,
			unscheduledTasks,
			markers,
			durationUnit,
			criticalPath,
			schedule,
			projectStart,
			projectEnd,
			calendar,
			calendars,
			slack,
			undo,
			_weekStart: lCalendar.weekStart,
			splitTasks,
			summary,
			groupBy,
			highlightTime,
			wbs,
			displayMode,
			gridWidth: resolvedGridWidth,
			cellBorders,
			_compactMode: compactMode,
		});

		if (init_once && init) {
			init(api);
			init_once = false;
		}
	};

	reinitStore();
	$effect(reinitStore);
</script>

<Layout {taskTemplate} {readonly} bind:tableAPI bind:ganttWidth />
