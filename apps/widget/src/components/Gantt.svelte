<script lang="ts">
	// svelte core
	import { setContext, type Component } from "svelte";
	import { writable } from "svelte/store";
	import type { IApi as ITableApi } from "@svar-ui/svelte-grid";

	// locales
	import { locale as l } from "@svar-ui/lib-dom";
	import type { ILocale } from "@svar-ui/lib-dom";
	import { en } from "@svar-ui/gantt-locales";
	import { en as coreEn } from "@svar-ui/core-locales";

	// stores
	import { EventBusRouter } from "@svar-ui/lib-state";
	import {
		DataStore,
		getDefaultColumns,
		defaultTaskTypes,
		normalizeZoom,
	} from "@svar-ui/gantt-store";
	import type {
		IApi,
		IConfig,
		IDataConfig,
		IResource,
		ISummaryConfig,
	} from "@svar-ui/gantt-store";
	import { getContext } from "svelte";
	import type {
		GanttActions,
		IColumnConfig,
		IInnerApi,
		ITaskTemplateProps,
	} from "../types";

	//views
	import Layout from "./Layout.svelte";

	// helpers
	import {
		prepareScales,
		prepareFormats,
		prepareColumns,
		prepareZoom,
	} from "../helpers/prepareConfig";

	type TNullable =
		| "activeTask"
		| "start"
		| "end"
		| "resources"
		| "gridWidth"
		| "subGridWidth"
		| "projectStart"
		| "projectEnd"
		| "calendar"
		| "summary"
		| "highlightTime";

	type Props = Omit<IConfig, "columns" | TNullable> & {
		columns?: false | IColumnConfig[] | null;
		taskTemplate?: Component<ITaskTemplateProps> | null;
		readonly?: boolean;
		init?: ((api: IApi) => void) | null;
		start?: Date | null;
		end?: Date | null;
		resources?: IResource[] | null;
		gridWidth?: number | null;
		subGridWidth?: number | null;
		projectStart?: Date | null;
		projectEnd?: Date | null;
		calendar?: IConfig["calendar"] | null;
		summary?: ISummaryConfig | null;
		highlightTime?: IConfig["highlightTime"] | null;
		activeTask?: IConfig["activeTask"] | null;
	} & GanttActions;

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
		inclusiveEnd = false,
		cellWidth = 100,
		cellHeight = 38,
		scaleHeight = 36,
		gridWidth = null,
		subGridWidth = null,
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
		inactiveTasks = false,
		placeholderRow = false,
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
		deadlines = false,
		progressLine = false,
		sCurve = false,
		...restProps
	}: Props = $props();

	// init stores
	const dataStore = new DataStore(writable);

	// locale and formats
	// uses same logic as the Locale component
	const words = { ...coreEn, ...en };
	let locale = getContext<ILocale | undefined>("wx-i18n");
	if (!locale) locale = l(words);
	else locale = locale.extend(words, true);
	setContext("wx-i18n", locale);

	// prepare configuration objects
	const { calendar: lCalendar } = locale.getRaw() as Record<string, any>;

	// default column set (incl. auto-added resources/wbs columns)
	let defaultGridColumns = $derived(
		getDefaultColumns({ resources: !!resources, wbs })
	);

	let normalizedConfig = $derived.by(() => {
		let config: Record<string, any> = {
			zoom: prepareZoom(zoom, lCalendar),
			scales: prepareScales(scales, lCalendar),
			columns: prepareColumns(
				(columns ?? defaultGridColumns) as IColumnConfig[],
				lCalendar
			),
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
	let lastInRoute: any = new EventBusRouter((a: string, b: any) => {
		const name = "on" + a.replace(dash, "");
		const handlers = restProps as Record<
			string,
			((ev: any) => void) | undefined
		>;
		handlers[name]?.(b);
	});
	firstInRoute.setNext(lastInRoute);

	let tableAPI = $state<ITableApi>();
	let subGridTableAPI = $state<ITableApi>();

	// public API
	export const // state
		getState: IApi["getState"] = dataStore.getState.bind(dataStore),
		getReactiveState: IApi["getReactiveState"] = dataStore.getReactive.bind(
			dataStore
		) as IApi["getReactiveState"],
		getStores: IApi["getStores"] = () => ({ data: dataStore }),
		// events
		exec: IApi["exec"] = firstInRoute.exec as IApi["exec"],
		setNext: IApi["setNext"] = ev =>
			(lastInRoute = lastInRoute.setNext(ev)),
		intercept: IApi["intercept"] = firstInRoute.intercept.bind(
			firstInRoute
		) as IApi["intercept"],
		on: IApi["on"] = firstInRoute.on.bind(firstInRoute) as IApi["on"],
		detach: IApi["detach"] = firstInRoute.detach.bind(
			firstInRoute
		) as IApi["detach"],
		//specific
		getTask: IApi["getTask"] = id => dataStore.getTask(id),
		getResource: IApi["getResource"] = id => dataStore.getResource(id),
		serialize: IApi["serialize"] = config => dataStore.serialize(config),
		getTable: IApi["getTable"] = (waitRender, section = "grid") => {
			const getTableAPI = () =>
				section === "subGrid" ? subGridTableAPI! : tableAPI!;
			return waitRender
				? new Promise(res => setTimeout(() => res(getTableAPI()), 1))
				: getTableAPI();
		},
		getHistory: IApi["getHistory"] = () => dataStore.getHistory(),
		getCalendar: IApi["getCalendar"] = id => dataStore.getCalendar(id),
		getTaskCalendar: IApi["getTaskCalendar"] = task =>
			dataStore.getTaskCalendar(task),
		getResourceCalendar: IApi["getResourceCalendar"] = resource =>
			dataStore.getResourceCalendar(resource),
		getTaskResources: IApi["getTaskResources"] = id =>
			dataStore.getTaskResources(id),
		getResourceTasks: IApi["getResourceTasks"] = id =>
			dataStore.getResourceTasks(id),
		getLinkValidator: IApi["getLinkValidator"] = () =>
			dataStore.getLinkValidator();

	const api: IApi = {
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
		getResourceCalendar,
		getLinkValidator,
	};

	// common API available in components
	setContext<IInnerApi>("gantt-store", {
		getReactiveState: dataStore.getReactive.bind(
			dataStore
		) as IApi["getReactiveState"],
		getState: dataStore.getState.bind(dataStore),
		exec: firstInRoute.exec.bind(firstInRoute) as IApi["exec"],
		on: firstInRoute.on.bind(firstInRoute) as IApi["on"],
		detach: firstInRoute.detach.bind(firstInRoute) as IApi["detach"],
		getTask: dataStore.getTask.bind(dataStore),
		getTaskCalendar: dataStore.getTaskCalendar.bind(dataStore),
		getResourceCalendar: dataStore.getResourceCalendar.bind(dataStore),
		getCalendar: dataStore.getCalendar.bind(dataStore),
		getTaskResources: dataStore.getTaskResources.bind(dataStore),
		getHistory: dataStore.getHistory.bind(dataStore),
		getLinkValidator: dataStore.getLinkValidator.bind(dataStore),
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
			inactiveTasks,
			placeholderRow: placeholderRow && !readonly,
			markers,
			durationUnit,
			inclusiveEnd,
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
			deadlines,
			summary,
			groupBy,
			highlightTime,
			wbs,
			progressLine,
			cellBorders,
			sCurve,
			displayMode,
			...(gridWidth != null ? { gridWidth } : {}),
			...(subGridWidth != null ? { subGridWidth } : {}),
		} as Partial<IDataConfig>);

		if (init_once && init) {
			init(api);
			init_once = false;
		}
	};

	reinitStore();
	$effect(reinitStore);
</script>

<Layout {taskTemplate} {readonly} bind:tableAPI bind:subGridTableAPI />
