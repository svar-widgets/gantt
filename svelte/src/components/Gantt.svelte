<script>
	// svelte core
	import { setContext, untrack } from "svelte";
	import { writable } from "svelte/store";

	// locales
	import { locale as l } from "@svar-ui/lib-dom";
	import { en } from "@svar-ui/gantt-locales";
	import { en as coreEn } from "@svar-ui/core-locales";

	// stores
	import { EventBusRouter } from "@svar-ui/lib-state";
	import {
		DataStore,
		defaultColumns,
		defaultTaskTypes,
		parseTaskDates,
		normalizeZoom,
		normalizeLinks,
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
		scales = [
			{ unit: "month", step: 1, format: "%F %Y" },
			{ unit: "day", step: 1, format: "%j" },
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
		criticalPath = null,
		schedule = { type: "forward" },
		projectStart = null,
		projectEnd = null,
		calendar = null,
		undo = false,
		splitTasks = false,
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

	let normalizedConfig = $derived.by(() => {
		let config = {
			zoom: prepareZoom(zoom, lCalendar),
			scales: prepareScales(scales, lCalendar),
			columns: prepareColumns(columns, lCalendar),
			links: normalizeLinks(links),
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

	$effect.pre(() => {
		tasks, durationUnit, calendar;
		untrack(() =>
			parseTaskDates(tasks, { durationUnit, splitTasks, calendar })
		);
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
				: tableAPI,
		getHistory = () => dataStore.getHistory();

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
		getHistory,
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
			links: normalizedConfig.links,
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
			autoScale,
			unscheduledTasks,
			markers,
			durationUnit,
			criticalPath,
			schedule,
			projectStart,
			projectEnd,
			calendar,
			undo,
			_weekStart: lCalendar.weekStart,
			splitTasks,
		});

		if (init_once && init) {
			init(api);
			init_once = false;
		}
	};

	reinitStore();
	$effect(reinitStore);

	$effect(() => {
		if (calendar && tasks) {
			highlightTime = (day, unit) => {
				if (unit == "day" && !calendar.getDayHours(day))
					return "wx-weekend";
				if (unit == "hour" && !calendar.getDayHours(day))
					return "wx-weekend";
				return "";
			};
		}
	});
</script>

<Layout {taskTemplate} {readonly} {cellBorders} {highlightTime} bind:tableAPI />
