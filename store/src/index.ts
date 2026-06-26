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
export { handleAction, isHandledAction } from "./helpers/actionHandlers";
export { calculateArea } from "./helpers/area";
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
export {
	defaultColumns,
	getDefaultColumns,
	getDefaultGridWidth,
	getResourceColumns,
	normalizeResourceColumns,
} from "./columns";
export { defaultTaskTypes } from "./taskTypes";
export { prepareEditTask, parseTaskDates } from "./normalizeDates";
export { normalizeZoom } from "./scales";
export { isSegmentMoveAllowed, extendDragOptions } from "./tasks";

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
	IConfig,
	IZoomConfig,
	IGanttColumn,
	TMethodsConfig,
	IGanttTask,
	IMarker,
	IScheduleConfig,
	ICriticalPathConfig,
	IScaleConfig,
	ICalendarRule,
	CalendarConfig,
} from "./types";

import { CalendarConfig } from "./types";
import { isCommunity } from "./package";
import { Calendar } from "./schedule-types";

export function createCalendar(config?: CalendarConfig) {
	if (isCommunity()) return null;
	return new Calendar(config);
}
