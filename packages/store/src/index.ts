export { default as DataStore } from "./DataStore";

export { grid } from "./dom/scales";
export { placeLink, normalizeLinks } from "./links";
export {
	getDiffer,
	getAdder,
	getUnitStart,
	format,
	formatDay,
	registerScaleUnit,
} from "./time";
export { toInclusiveTask, fromInclusiveTask } from "./inclusiveEnd";
export { handleAction, isHandledAction } from "./helpers/actionHandlers";
export { calculateArea } from "./helpers/area";
export {
	PLACEHOLDER_ROW_ID,
	isPlaceholder,
	getPlaceholderTask,
} from "./placeholder";
export {
	defaultToolbarButtons,
	getToolbarButtons,
} from "./helpers/toolbarButtons";
export { defaultMenuOptions, getMenuOptions } from "./helpers/menuOptions";
export {
	defaultEditorItems,
	getEditorItems,
	getEditorButtons,
	filterEditorButtons,
} from "./helpers/editorItems";
export { getSegmentProgress } from "./helpers/progress";
export { resolveSCurvePoint } from "./helpers/sCurve";
export {
	defaultColumns,
	getDefaultColumns,
	getDefaultGridWidth,
	getHeaderLength,
	getResourceColumns,
	getDateEditorButtons,
	normalizeResourceColumns,
} from "./columns";
export { toggleGridChart, toggleChartSubGrid } from "./layout/displayMode";
export { defaultTaskTypes } from "./taskTypes";
export { defaultConstraintTypes } from "./constraintTypes";
export { prepareEditTask } from "./normalizeDates";
export { normalizeZoom, calcScaleCellDate } from "./scales";
export {
	isSegmentMoveAllowed,
	extendDragOptions,
	setTaskResources,
} from "./tasks";
export {
	getHistogramBars,
	getHistogramCapacityPath,
	getResourceLoadColumns,
	getResourceHistogramColumns,
	resolveResourceHistogramBar,
} from "./resourceLoad";
export type {
	TID,
	IApi,
	ITask,
	ILink,
	IResource,
	IAssignment,
	IDataAssignment,
	IComputedResource,
	IResourceLoad,
	IResourceColumn,
	IHistogramBar,
	IHistogramColumn,
	IHistogramColumnPosition,
	IResourceHistogramConfig,
	IResourceHistogramTooltip,
	IConfig,
	IZoomConfig,
	IGanttColumn,
	TMethodsConfig,
	IGanttTask,
	IMarker,
	IScheduleConfig,
	ICriticalPathConfig,
	IScaleConfig,
	ICalendar,
	ICalendarRule,
	CalendarConfig,
	Constraint,
	IConflict,
	InvalidLinkReason,
	TLinkDraft,
	TLinkValidator,
	ITaskCalendar,
	IHistoryManager,
	TDurationUnit,
	TSCurveType,
	TSCurveMetric,
	TSCurveLine,
	TSCurveConfig,
	ISCurveTooltip,
	ISCurveTooltipLine,
	IParsedTask,
	IOption,
	IUnitFormats,
	TColumnSection,
	TDisplayPanel,
	TSort,
	IGanttLink,
	GanttScaleRow,
	GanttScaleCell,
	IConflictReportRow,
	IHistory,
	TLinkType,
	IParsedResource,
	ISummaryConfig,
	IDataConfig,
	IData,
	GanttCalendarConfig,
	ITaskType,
	IExportConfig,
	TCellBorders,
	TDisplayMode,
	TDisplayModeConfig,
	IGroupByConfig,
} from "./types";
export type { TDefaultColumnsConfig } from "./columns";
export type { IButtonConfig } from "./helpers/toolbarButtons";
export type { IOptionConfig } from "./helpers/menuOptions";
export type { TEditorItemsConfig } from "./helpers/editorItems";

import { CalendarConfig } from "./types";
import { isCommunity } from "./package";
import { Calendar } from "./schedule-types";

export function createCalendar(config?: CalendarConfig) {
	if (isCommunity()) return null;
	return new Calendar(config);
}
