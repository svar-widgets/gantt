import BasicInit from "./cases/BasicInit.svelte";
import GanttProvider from "./cases/GanttProvider.svelte";
import GanttBatchProvider from "./cases/GanttBatchProvider.svelte";
import GanttBackend from "./cases/GanttBackend.svelte";
import GanttExcelImport from "./cases/GanttExcelImport.svelte";
import GanttScales from "./cases/GanttScales.svelte";
import GanttGrid from "./cases/GanttGrid.svelte";
import GanttNoGrid from "./cases/GanttNoGrid.svelte";
import GanttFlexColumns from "./cases/GanttFlexColumns.svelte";
import GanttReadOnly from "./cases/GanttReadOnly.svelte";
import GanttPreventActions from "./cases/GanttPreventActions.svelte";
import GanttForm from "./cases/GanttForm.svelte";
import GanttSizes from "./cases/GanttSizes.svelte";
import GanttMultiple from "./cases/GanttMultiple.svelte";
import GanttPerformance from "./cases/GanttPerformance.svelte";
import GanttDisplayMode from "./cases/GanttDisplayMode.svelte";


import GanttTooltips from "./cases/GanttTooltips.svelte";
import GanttToolbar from "./cases/GanttToolbar.svelte";
import GanttToolbarCustom from "./cases/GanttToolbarCustom.svelte";
import GanttToolbarButtons from "./cases/GanttToolbarButtons.svelte";
import GanttText from "./cases/GanttText.svelte";
import GanttLocale from "./cases/GanttLocale.svelte";
import GanttStartEnd from "./cases/GanttStartEnd.svelte";
import GanttScaleDate from "./cases/GanttScaleDate.svelte";
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
import GanttFilter from "./cases/GanttFilter.svelte";
import GanttFilterInline from "./cases/GanttFilterInline.svelte";
import GanttFilterBuilder from "./cases/GanttFilterBuilder.svelte";
import GanttFilterQuery from "./cases/GanttFilterQuery.svelte";
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
	["/performance/:skin", "Performance", GanttPerformance, "GanttPerformance"],

	{ group: "Timeline" },
	["/sizes/:skin", "Scale / cell sizes", GanttSizes, "GanttSizes"],
	[
		"/cell-borders/:skin",
		"Chart cell borders",
		ChartCellBorders,
		"ChartBorders",
	],
	["/start-end/:skin", "Start/end dates", GanttStartEnd, "GanttStartEnd"],
	["/scroll-date/:skin", "Scroll to date", GanttScaleDate, "GanttScaleDate"],
	["/scales/:skin", "Custom scales", GanttScales, "GanttScales"],
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
	["/zoom/:skin", "Zoom", GanttZoom, "GanttZoom"],
	["/custom-zoom/:skin", "Custom Zoom", GanttCustomZoom, "GanttCustomZoom"],
	["/holidays/:skin", "Holidays", GanttHolidays, "GanttHolidays"],

	{ group: "Grid" },
	[
		"/grid-fill-space-columns/:skin",
		"Flexible grid columns",
		GanttFlexColumns,
		"GanttFlexColumns",
	],
	[
		"/grid-custom-columns/:skin",
		"Custom column content",
		GanttGrid,
		"GanttGrid",
	],
	[
		"/display-mode/:skin",
		"Grid width and display",
		GanttDisplayMode,
		"GanttDisplayMode",
	],
	["/no-grid/:skin", "No grid", GanttNoGrid, "GanttNoGrid"],
	[
		"/header-menu/:skin",
		"Header menu to hide columns",
		HeaderMenu,
		"GridHeaderMenu",
	],
	// #endif
	{ group: "Tasks" },
	["/task-types/:skin", "Task types", GanttTaskTypes, "GanttTaskTypes"],
	["/templates/:skin", "Custom text", GanttText, "GanttText"],
	["/tooltips/:skin", "Tooltips", GanttTooltips, "GanttTooltips"],

	{ group: "Data operations" },
	[
		"/prevent-actions/:skin",
		"Prevent default UI actions",
		GanttPreventActions,
		"GanttPreventActions",
	],
	[
		"/grid-inline-editors/:skin",
		"Edit tasks in grid",
		GridInlineEditors,
		"GridInlineEditors",
	],
	["/readonly/:skin", "Readonly", GanttReadOnly, "GanttReadOnly"],
	[
		"/filtering/:skin",
		"Filter tasks in grid",
		GanttFilterInline,
		"GanttFilterInline",
	],
	[
		"/filtering-api/:skin",
		"External filter controls",
		GanttFilter,
		"GanttFilter",
	],
	[
		"/filtering-builder/:skin",
		"Integration with Filter Builder",
		GanttFilterBuilder,
		"GanttFilterBuilder",
	],
	[
		"/filtering-query/:skin",
		"Integration with Filter Query",
		GanttFilterQuery,
		"GanttFilterQuery",
	],
	["/sorting/:skin", "External sort controls", GanttSort, "GanttSort"],
	["/sorting-api/:skin", "Sort by API", GanttCustomSort, "GanttCustomSort"],

	{ group: "Scheduling" },


	{ group: "Load & Save" },
	["/backend/:skin", "Load from backend", GanttBackend, "GanttBackend"],
	[
		"/backend-provider/:skin",
		"Save to backend",
		GanttProvider,
		"GanttProvider",
	],
	[
		"/backend-provider-batch/:skin",
		"Save to backend: batch request",
		GanttBatchProvider,
		"GanttBatchProvider",
	],
	[
		"/excel-import/:skin",
		"Import from Excel / CSV",
		GanttExcelImport,
		"GanttExcelImport",
	],

	{ group: "UI / Layout" },
	["/toolbar/:skin", "Toolbar: basic", GanttToolbar, "GanttToolbar"],
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
	["/context-menu/:skin", "Context menu: basic", ContextMenu, "ContextMenu"],
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
	["/editor/:skin", "Editor: basic", GanttEditor, "GanttEditor"],
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
	[
		"/editor-readonly/:skin",
		"Editor: readonly",
		GanttEditorReadonly,
		"GanttEditorReadonly",
	],
	[
		"/editor-validation/:skin",
		"Editor: validation",
		GanttEditorValidation,
		"GanttEditorValidation",
	],
	["/custom-edit-form/:skin", "Custom edit dialog", GanttForm, "GanttForm"],

	{ group: "Appearance" },
	[
		"/gantt-multiple/:skin",
		"Many Gantts per page",
		GanttMultiple,
		"GanttMultiple",
	],
	["/fullscreen/:skin", "Fullscreen", GanttFullscreen, "GanttFullscreen"],
	["/locale/:skin", "Locales", GanttLocale, "GanttLocale"],
];
