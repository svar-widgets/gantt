import LocalData from "./cases/LocalData.svelte";
import Base from "./cases/Base.svelte";
import CriticalPath from "./cases/CriticalPath.svelte";
import CrossingLinks from "./cases/CrossingLinks.svelte";
import AutoSchedule from "./cases/AutoSchedule.svelte";
import WBS from "./cases/WBS.svelte";
import GanttFilterReinit from "./cases/GanttFilterReinit.svelte";
import GanttVirtualScales from "./cases/GanttVirtualScales.svelte";
import ResourceLoadCalendar2 from "./cases/ProResourceLoadCalendar2.svelte";
import ResourceLoadColumns from "./cases/ProResourceLoadColumns.svelte";
import ResourceLoadGridless from "./cases/ProResourceLoadGridless.svelte";
import ResourceLoadMultipleCalendars2 from "./cases/ProResourceLoadMultipleCalendars2.svelte";
import ResourceHistogramAggregate from "./cases/ProResourceHistogramAggregate.svelte";
import ResourceScale from "./cases/ProResourceScale.svelte";
import ResourceScaleDates from "./cases/ProResourceScaleDates.svelte";
import MultipleCalendarsGrouped from "./cases/MultipleCalendarsGrouped.svelte";
import UnscheduledTasks from "./cases/UnscheduledTasks.svelte";
import PlaceholderRow from "./cases/PlaceholderRow.svelte";
import InclusiveEnd from "./cases/ProInclusiveEnd.svelte";

export const links = [
	["/local-data", "", LocalData],
	["/base", "", Base],
	["/wbs", "", WBS],
	["/critical-path", "", CriticalPath],
	["/crossing-links", "", CrossingLinks],
	["/autoschedule", "", AutoSchedule],
	["/filtering-reinit", "", GanttFilterReinit],
	["/virtual-scales", "", GanttVirtualScales],
	["/resource-load-calendar-2", "", ResourceLoadCalendar2],
	["/resource-load-columns", "", ResourceLoadColumns],
	["/resource-load-gridless", "", ResourceLoadGridless],
	["/resource-load-multiple-calendars-2", "", ResourceLoadMultipleCalendars2],
	["/resource-histogram-aggregate", "", ResourceHistogramAggregate],
	["/resource-scale", "", ResourceScale],
	["/resource-scale-dates", "", ResourceScaleDates],
	["/multiple-calendars-grouped", "", MultipleCalendarsGrouped],
	["/unscheduled-tasks", "", UnscheduledTasks],
	["/placeholder-row", "", PlaceholderRow],
	["/inclusive-end-full", "", InclusiveEnd],
];
