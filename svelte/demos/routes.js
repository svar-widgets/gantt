import BasicInit from "./cases/BasicInit.svelte";
import GanttProvider from "./cases/GanttProvider.svelte";
import GanttBatchProvider from "./cases/GanttBatchProvider.svelte";
import GanttBackend from "./cases/GanttBackend.svelte";
import GanttScales from "./cases/GanttScales.svelte";
import GanttGrid from "./cases/GanttGrid.svelte";
import GanttNoGrid from "./cases/GanttNoGrid.svelte";
import GanttFixedColumns from "./cases/GanttFixedColumns.svelte";
import GanttFlexColumns from "./cases/GanttFlexColumns.svelte";
import GanttReadOnly from "./cases/GanttReadOnly.svelte";
import GanttPreventActions from "./cases/GanttPreventActions.svelte";
import GanttFormControls from "./cases/GanttFormControls.svelte";
import GanttForm from "./cases/GanttForm.svelte";
import GanttSizes from "./cases/GanttSizes.svelte";
import GanttMultiple from "./cases/GanttMultiple.svelte";
import GanttPerformance from "./cases/GanttPerformance.svelte";


import GanttTooltips from "./cases/GanttTooltips.svelte";
import GanttToolbar from "./cases/GanttToolbar.svelte";
import GanttToolbarCustom from "./cases/GanttToolbarCustom.svelte";
import GanttToolbarButtons from "./cases/GanttToolbarButtons.svelte";
import GanttText from "./cases/GanttText.svelte";
import GanttLocale from "./cases/GanttLocale.svelte";
import GanttStartEnd from "./cases/GanttStartEnd.svelte";
import GanttFullscreen from "./cases/GanttFullscreen.svelte";
import GanttZoom from "./cases/GanttZoom.svelte";
import GanttCustomZoom from "./cases/GanttCustomZoom.svelte";
import GanttLengthUnit from "./cases/GanttLengthUnit.svelte";
import GanttTaskTypes from "./cases/GanttTaskTypes.svelte";
import GanttBaseline from "./cases/GanttBaseline.svelte";
import ChartCellBorders from "./cases/ChartBorders.svelte";
import ContextMenu from "./cases/ContextMenu.svelte";
import ContextMenuHandler from "./cases/ContextMenuHandler.svelte";
//import DropDownMenu from "./cases/DropDownMenu.svelte";
import ContextMenuOptions from "./cases/ContextMenuOptions.svelte";
import GanttHolidays from "./cases/GanttHolidays.svelte";
import GanttSort from "./cases/GanttSort.svelte";
import GanttCustomSort from "./cases/GanttCustomSort.svelte";
import GanttSummariesProgress from "./cases/GanttSummariesProgress.svelte";
import GanttSummariesNoDrag from "./cases/GanttSummariesNoDrag.svelte";
import GanttSummariesConvert from "./cases/GanttSummariesConvert.svelte";

export const links = [
	["/base/:skin", "Basic Gantt", BasicInit],

	["/sizes/:skin", "Scale / cell sizes", GanttSizes],
	["/cell-borders/:skin", "Chart cell borders", ChartCellBorders],
	["/scales/:skin", "Custom scales", GanttScales],
	["/start-end/:skin", "Start/end dates", GanttStartEnd],


	["/holidays/:skin", "Holidays", GanttHolidays],
	["/baseline/:skin", "Baselines", GanttBaseline],
	["/templates/:skin", "Custom text", GanttText],
	["/tooltips/:skin", "Tooltips", GanttTooltips],

	["/task-types/:skin", "Task types", GanttTaskTypes],
	[
		"/summary-progress/:skin",
		"Summary tasks with auto progress",
		GanttSummariesProgress,
	],
	[
		"/summary-no-drag/:skin",
		"No drag for summary tasks",
		GanttSummariesNoDrag,
	],
	[
		"/summary-convert/:skin",
		"Auto convert to summary tasks",
		GanttSummariesConvert,
	],

	["/zoom/:skin", "Zoom", GanttZoom],
	["/custom-zoom/:skin", "Custom Zoom", GanttCustomZoom],
	["/length-unit/:skin", "Length unit (rounding)", GanttLengthUnit],

	["/no-grid/:skin", "No grid", GanttNoGrid],
	[
		"/grid-fill-space-columns/:skin",
		"Flexible grid columns",
		GanttFlexColumns,
	],
	["/grid-fixed-columns/:skin", "Fixed grid columns", GanttFixedColumns],
	["/grid-custom-columns/:skin", "Custom grid columns", GanttGrid],

	["/toolbar/:skin", "Toolbar", GanttToolbar],
	["/toolbar-buttons/:skin", "Toolbar: limited buttons", GanttToolbarButtons],
	["/toolbar-custom/:skin", "Toolbar: custom buttons", GanttToolbarCustom],
	["/context-menu/:skin", "Context menu", ContextMenu],
	[
		"/menu-handler/:skin",
		"Context menu: limiting options",
		ContextMenuHandler,
	],
	//["/outer-menu/:skin", "Dropdown menu", DropDownMenu],
	["/menu-options/:skin", "Context menu: custom options", ContextMenuOptions],
	[
		"/custom-form-controls/:skin",
		"Editor: custom controls",
		GanttFormControls,
	],
	["/custom-edit-form/:skin", "Custom editor", GanttForm],

	["/locale/:skin", "Locales", GanttLocale],
	["/fullscreen/:skin", "Fullscreen", GanttFullscreen],
	["/readonly/:skin", "Readonly mode", GanttReadOnly],

	["/prevent-actions/:skin", "Preventing actions", GanttPreventActions],
	["/gantt-multiple/:skin", "Many Gantts per page", GanttMultiple],
	["/performance/:skin", "Performance", GanttPerformance],

	["/sorting/:skin", "Custom sorting", GanttSort],
	["/sorting-api/:skin", "Sort by API", GanttCustomSort],

	["/backend/:skin", "Backend data", GanttBackend],
	["/backend-provider/:skin", "Saving to backend", GanttProvider],
	[
		"/backend-provider-batch/:skin",
		"Saving to backend (batch)",
		GanttBatchProvider,
	],
];
