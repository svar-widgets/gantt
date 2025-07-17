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
import GanttEditor from "./cases/GanttEditor.svelte";
import GanttEditorConfig from "./cases/GanttEditorConfig.svelte";
import GanttEditorCustomControls from "./cases/GanttEditorCustomControls.svelte";
import GanttEditorComments from "./cases/GanttEditorComments.svelte";
import GanttEditorTasks from "./cases/GanttEditorTasks.svelte";
import GanttScaleUnit from "./cases/GanttScaleUnit.svelte";
import GanttDurationUnitHour from "./cases/GanttDurationUnitHour.svelte";
import GanttDurationUnitChanges from "./cases/GanttDurationUnitChanges.svelte";
import GanttMinScaleUnit from "./cases/GanttMinScaleUnit.svelte";
import HeaderMenu from "./cases/GridHeaderMenu.svelte";
import GridInlineEditors from "./cases/GridInlineEditors.svelte";
import GanttEditorReadonly from "./cases/GanttEditorReadonly.svelte";
import GanttEditorValidation from "./cases/GanttEditorValidation.svelte";

export const links = [
	["/base/:skin", "Basic Gantt", BasicInit, "BasicInit"],

	["/sizes/:skin", "Scale / cell sizes", GanttSizes, "GanttSizes"],
	[
		"/cell-borders/:skin",
		"Chart cell borders",
		ChartCellBorders,
		"ChartCellBorders",
	],
	["/scales/:skin", "Custom scales", GanttScales, "GanttScales"],
	["/start-end/:skin", "Start/end dates", GanttStartEnd, "GanttStartEnd"],
	[
		"/custom-scale/:skin",
		"Custom scale unit",
		GanttScaleUnit,
		"GanttScaleUnit",
	],
	[
		"/custom-min-scale/:skin",
		"Custom minimal scale unit",
		GanttMinScaleUnit,
		"GanttMinScaleUnit",
	],

	["/holidays/:skin", "Holidays", GanttHolidays, "GanttHolidays"],

	["/templates/:skin", "Custom text", GanttText, "GanttText"],
	["/tooltips/:skin", "Tooltips", GanttTooltips, "GanttTooltips"],

	["/task-types/:skin", "Task types", GanttTaskTypes, "GanttTaskTypes"],
	[
		"/summary-progress/:skin",
		"Summary tasks with auto progress",
		GanttSummariesProgress,
		"GanttSummariesProgress",
	],
	[
		"/summary-no-drag/:skin",
		"No drag for summary tasks",
		GanttSummariesNoDrag,
		"GanttSummariesNoDrag",
	],
	[
		"/summary-convert/:skin",
		"Auto convert to summary tasks",
		GanttSummariesConvert,
		"GanttSummariesConvert",
	],

	["/zoom/:skin", "Zoom", GanttZoom, "GanttZoom"],
	["/custom-zoom/:skin", "Custom Zoom", GanttCustomZoom, "GanttCustomZoom"],
	[
		"/length-unit/:skin",
		"Length unit (rounding)",
		GanttLengthUnit,
		"GanttLengthUnit",
	],
	[
		"/duration-unit/:skin",
		"Duration unit: hour",
		GanttDurationUnitHour,
		"GanttDurationUnitHour",
	],
	[
		"/duration-changes/:skin",
		"Duration unit: changes",
		GanttDurationUnitChanges,
		"GanttDurationUnitChanges",
	],
	["/no-grid/:skin", "No grid", GanttNoGrid, "GanttNoGrid"],
	[
		"/grid-fill-space-columns/:skin",
		"Flexible grid columns",
		GanttFlexColumns,
		"GanttFlexColumns",
	],
	[
		"/grid-fixed-columns/:skin",
		"Fixed grid columns",
		GanttFixedColumns,
		"GanttFixedColumns",
	],
	[
		"/grid-custom-columns/:skin",
		"Custom grid columns",
		GanttGrid,
		"GanttGrid",
	],
	[
		"/grid-inline-editors/:skin",
		"Grid inline editors",
		GridInlineEditors,
		"GridInlineEditors",
	],

	["/toolbar/:skin", "Toolbar", GanttToolbar, "GanttToolbar"],
	[
		"/toolbar-buttons/:skin",
		"Toolbar: limited buttons",
		GanttToolbarButtons,
		"GanttToolbarButtons",
	],
	[
		"/toolbar-custom/:skin",
		"Toolbar: custom buttons",
		GanttToolbarCustom,
		"GanttToolbarCustom",
	],
	["/context-menu/:skin", "Context menu", ContextMenu, "ContextMenu"],
	[
		"/menu-handler/:skin",
		"Context menu: limiting options",
		ContextMenuHandler,
		"ContextMenuHandler",
	],
	//["/outer-menu/:skin", "Dropdown menu", DropDownMenu, "DropDownMenu"],
	[
		"/menu-options/:skin",
		"Context menu: custom options",
		ContextMenuOptions,
		"ContextMenuOptions",
	],
	[
		"/header-menu/:skin",
		"Header menu: hiding columns",
		HeaderMenu,
		"HeaderMenu",
	],
	["/custom-edit-form/:skin", "Custom editor", GanttForm, "GanttForm"],
	["/locale/:skin", "Locales", GanttLocale, "GanttLocale"],
	["/fullscreen/:skin", "Fullscreen", GanttFullscreen, "GanttFullscreen"],
	["/readonly/:skin", "Readonly mode", GanttReadOnly, "GanttReadOnly"],

	[
		"/prevent-actions/:skin",
		"Preventing actions",
		GanttPreventActions,
		"GanttPreventActions",
	],
	[
		"/gantt-multiple/:skin",
		"Many Gantts per page",
		GanttMultiple,
		"GanttMultiple",
	],
	["/performance/:skin", "Performance", GanttPerformance, "GanttPerformance"],

	["/sorting/:skin", "Custom sorting", GanttSort, "GanttSort"],
	["/sorting-api/:skin", "Sort by API", GanttCustomSort, "GanttCustomSort"],

	["/backend/:skin", "Backend data", GanttBackend, "GanttBackend"],
	[
		"/backend-provider/:skin",
		"Saving to backend",
		GanttProvider,
		"GanttProvider",
	],
	[
		"/backend-provider-batch/:skin",
		"Saving to backend (batch)",
		GanttBatchProvider,
		"GanttBatchProvider",
	],
	["/editor/:skin", "Editor", GanttEditor, "GanttEditor"],
	[
		"/editor-config/:skin",
		"Editor: custom settings",
		GanttEditorConfig,
		"GanttEditorConfig",
	],
	[
		"/editor-custom-controls/:skin",
		"Editor: custom controls",
		GanttEditorCustomControls,
		"GanttEditorCustomControls",
	],
	[
		"/editor-comments/:skin",
		"Editor: custom comments",
		GanttEditorComments,
		"GanttEditorComments",
	],
	[
		"/editor-tasks/:skin",
		"Editor: custom tasks",
		GanttEditorTasks,
		"GanttEditorTasks",
	],
	["/editor-readonly/:skin", "Editor: readonly", GanttEditorReadonly],
	["/editor-validation/:skin", "Editor: validation", GanttEditorValidation],
];
