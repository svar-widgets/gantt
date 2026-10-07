import type { IDataMethodsConfig } from "./DataStore";
import type {
	DataArray,
	TID,
	IEventBus,
	IPublicWritable,
	IEventConfig,
	DataTree,
} from "@svar-ui/lib-state";
import type GanttDataTree from "./GanttDataTree";
import { Day } from "date-fns";
import type DataStore from "./DataStore";
import type {
	IApi as ITableApi,
	IColumn,
	IFilterValues,
} from "@svar-ui/grid-store";

import type {
	TaskSlackInfo,
	ICalendarRule,
	CalendarConfig,
	ICalendar,
	Constraint,
	Conflict,
	InvalidLinkReason,
} from "./schedule-types";
export type {
	TaskSlackInfo,
	ICalendarRule,
	CalendarConfig,
	ICalendar,
	Constraint,
	Conflict,
	InvalidLinkReason,
};

// A resolved task calendar. In resource mode it can be a composite, which
// reports whether its members share any working time; plain calendars leave
// the flag unset.
export type ITaskCalendar = ICalendar & { noWorkingTime?: boolean };

export type TMethodsConfig = IDataMethodsConfig;
export type { GanttDataTree, TID };

export interface IConflict {
	type: "link" | "constraint";
	task: TID; // Violated task (`target`)
	link?: TID;
	required: Date; //  Start that clears the conflict (`requiredStart`)
}

export interface IConflictReportRow extends IConflict {
	id: string;
	typeKey: string | null;
}

export interface IConflictsIndex {
	rows: IConflictReportRow[];
	constraints: Set<TID>;
	links: Set<TID>;
}

export interface IExportConfig {
	url?: string;
	format?: "pdf" | "png" | "xlsx" | "mspx";
	fileName?: string;
	styles?: string;
	ganttConfig?: Record<string, any>;
	pdf?: {
		fitSize?: boolean;
		size?:
			| "auto"
			| string
			| {
					width: number;
					height: number;
			  };
		landscape?: boolean;
		styles?: string;
		margins?: {
			top?: number;
			bottom?: number;
			left?: number;
			right?: number;
		};
		header?: string;
		footer?: string;
		scale?: number;
	};
	png?: {
		fitSize?: boolean;
		size?:
			| "auto"
			| string
			| {
					width: number;
					height: number;
			  };
		landscape?: boolean;
		styles?: string;
	};
	excel?: {
		sheetNames?: string[];
		visual?: boolean;
		dateFormat?: string;
		columns?: IGanttColumn[];
		indent?: "native" | "spaces";
	};
}

export interface IActionConfig<T = any> {
	data?: T;
	noSave?: boolean;
}
export type TLinkType = "s2s" | "s2e" | "e2s" | "e2e";
export type TTaskType = "task" | "summary" | "milestone" | string;
export type TLengthUnit =
	| "minute"
	| "hour"
	| "day"
	| "week"
	| "month"
	| "quarter"
	| "year"
	| string;
export type TDurationUnit = "day" | "hour";

export type TSerializeData = {
	tasks: Partial<ITask>[];
	links: ILink[];
	assignments: IAssignment[];
	resources: IParsedResource[];
	tree: GanttDataTree;
	calendars: GanttCalendarConfig[];
};
export type TDataName = keyof TSerializeData;

export type TSortFunction = (a: IDataHash, b: IDataHash) => 1 | -1 | 0;
export type TDisplayPanel = "grid" | "chart" | "subGrid";
export type TDisplayMode = "all" | "grid" | "chart";
export type TDisplayModeConfig = TDisplayMode | TDisplayPanel[];
export type TCellBorders = "column" | "full";

export type TCalendarGetter = (task: Partial<ITask>) => ICalendar | undefined;
export interface ILink {
	id?: TID;
	type: TLinkType;
	source: TID;
	target: TID;
	lag?: number;
}

export interface IResource {
	id?: TID;
	name?: string;
	avatar?: string;
	color?: string;
	role?: string;
	calendar?: TID;
	parent?: TID;
	data?: IResource[];
	open?: boolean;
	[key: string]: any;
}

export interface IAssignment {
	id?: TID;
	task: TID;
	resource: TID;
	units?: number;
	[key: string]: any;
}

export type TResourceAssignment = IAssignment &
	IResource & {
		assignmentId: TID;
	};

export interface IDataAssignment {
	byTask: Record<TID, IAssignment[]>;
	byResource: Record<TID, IAssignment[]>;
}

export interface IResourceLoad {
	percent: number;
	hours: number;
}

export interface IParsedResource extends IResource {
	id: TID;
	parent: TID;
	$level: number;
	data?: IParsedResource[];
}

export interface IResourceDataTree extends DataTree<IParsedResource> {
	sort(conf: TSort[], columns?: IResourceColumn[]): void;
}

export interface IComputedResource extends IParsedResource {
	data?: IComputedResource[];
	$load: Record<string, IResourceLoad>;
	$capacity: Record<string, number>;
	$capacityTotal: number;
	$fullDay: number;
	$total: number;
	$overloaded: boolean;
	$unitLoad?: Record<string, IResourceLoad>;
	$unitCapacity?: Record<string, number>;
}

export interface IHistogramColumn {
	id: string;
	width: number;
	date: Date;
	end?: Date;
	pxPerDayThreshold: number;
	overloadHeadroom?: number;
}

export interface IResourceHistogramConfig {
	overloadHeadroom?: number;
	capacityLine?: boolean;
}

export interface IResourceHistogramTooltip {
	resource: IComputedResource;
	start: Date;
	end: Date;
	hours: number;
	capacity: number;
	days: number;
}

export interface IHistogramColumnPosition {
	column: IHistogramColumn;
	left: number;
}

export interface IHistogramBar {
	key: string;
	start: Date;
	end?: Date;
	hours: number;
	capacity: number;
	ceiling: number;
	width: number;
	days: number;
	overloaded: boolean;
}

export interface IResourceColumn {
	id: string;
	header?: string;
	width?: number;
	flexgrow?: number;
	align?: "left" | "right" | "center";
	resize?: boolean;
	sort?: boolean | TSortFunction;
	cell?: any;
	getter?: (obj: IComputedResource) => any;
	template?: IColumn["template"];
	[key: string]: any;
}

export interface IGanttLink extends ILink {
	id: TID;
	$p: string;
	$pl: number;
	$x1: number;
	$x2: number;
	$y1: number;
	$y2: number;
	critical?: boolean;
}

export interface ITask {
	start?: Date;
	id?: TID;
	end?: Date;
	duration?: number;
	data?: ITask[];

	base_start?: Date;
	base_end?: Date;
	base_duration?: number;

	deadline?: Date;

	rollup?: boolean;
	open?: boolean;
	text?: string;
	details?: string;
	progress?: number;
	type?: TTaskType;
	parent?: TID;
	calendar?: TID;
	skipResourceCalendars?: boolean;
	unscheduled?: boolean;
	manual?: boolean;
	inactive?: boolean;
	segments?: Partial<ITask>[];
	constraint?: Constraint | null;

	[key: string]: any;
}

export interface IParsedTask extends ITask {
	id: TID;
	parent: TID;
	data?: IParsedTask[];
	$level: number;
	$wbs?: string;
	$noWorkingTime?: boolean;
	$placeholder?: boolean;
}

export interface IGanttTask extends IParsedTask {
	$x: number;
	$y: number;
	$h: number;
	$w: number;

	$x_base?: number;
	$w_base?: number;

	$x_rollup?: number;
	$h_rollup?: number;
	$y_rollup_relative?: number;
	$w_rollup?: number;

	$x_deadline?: number;
	$overdue?: boolean;

	$reorder?: boolean;
	critical?: boolean;
	slack?: TaskSlackInfo;
	$visibleSlack?: number;
	$x_slack?: number;
	$w_slack?: number;

	$x_constraint?: number;
}

export type TDispatch = <A extends keyof TMethodsConfig>(
	action: A,
	data: TMethodsConfig[A]
) => void;

export interface IMethodsHash {
	[key: string]: any;
}

export type TSortConfig = {
	key: string;
	order: string;
	index?: number;
};

export interface IVisibleArea {
	from: number;
	start: number;
	end: number;
	to?: number;
}

export interface IZoomConfig {
	level?: number;
	minCellWidth?: number;
	maxCellWidth?: number;
	levels?: Array<IScaleLevel>;
}

export interface IScaleLevel {
	minCellWidth: number;
	maxCellWidth: number;
	scales: IScaleConfig[];
}

export interface IMarker {
	start: Date;
	text?: string;
	css?: string;
	left?: number;
}

export interface IProgressLineData {
	statusX: number;
	statusDate: Date;
}

export type TSCurveType = "scheduled" | "earned" | "baseline";
export type TSCurveMetric = "duration" | "progress";

export type TSCurveLine = {
	type: TSCurveType;
	metric?: TSCurveMetric;
	css?: string;
};
export type TSCurveConfig = boolean | TSCurveLine[];

export interface ISCurveLineInfo {
	type: TSCurveType;
	metric: TSCurveMetric;
}

export interface ISCurveLineConfig extends ISCurveLineInfo {
	css?: string;
}

export type TSCurvePlan = "scheduled" | "baseline";

export interface ISCurveLine extends ISCurveLineInfo {
	series: Float64Array; // Cumulative 0..1, indexed by scale cell
}

export interface ISCurveData {
	lines: ISCurveLine[];
	start: number; // Fractional cell position where the curve begins
	end: number; // Fractional cell position where it ends
}

export interface ISCurveViewPoint {
	index: number;
	x: number;
	y: number;
}

export interface ISCurveLineView extends ISCurveLineConfig {
	line: number; // Index into ISCurveData.lines
	path: string;
	points: ISCurveViewPoint[];
}

export interface ISCurveTooltipLine extends ISCurveLineInfo {
	line: number; // Index into ISCurveData.lines
	value: number; // Percent done at the hovered cell, 0..100
}

export interface ISCurveTooltip {
	date: Date;
	hovered: ISCurveTooltipLine;
	lines: ISCurveTooltipLine[];
}

export interface IHistory {
	undo: number;
	redo: number;
}

export interface IHistoryManager {
	startBatch: () => void;
	endBatch: (discard?: boolean) => void;
	isBatching: () => boolean;
	handleUndo: () => void;
	handleRedo: () => void;
	resetHistory: () => void;
}

export interface IGroupManager {
	buildTree: () => GanttDataTree;
	updateTaskGroup: (id: TID) => void;
}

export interface ICriticalPathConfig {
	type: "strict" | "flexible";
}

export type ICriticalTasks = Partial<Record<TID, boolean>>;

type UnitFormatter = (date: Date) => string;

export interface IUnitFormats {
	[unit: string]: UnitFormatter | string;
}

export interface IScheduleConfig {
	type?: "forward";
	auto?: boolean;
	resourceCalendars?: boolean;
}

export interface ISummaryConfig {
	autoProgress?: boolean;
	autoConvert?: boolean;
}

export interface IGroupByConfig {
	field: string;
	taskHierarchy?: boolean;
	resourceHierarchy?: boolean;
	multipleResources?: boolean;
	ungrouped?: false | "top" | "bottom";
	resolver?: (task: ITask) => any;
}

export interface GanttCalendarConfig extends CalendarConfig {
	id: TID;
	css?: string;
}

export interface IConfig {
	tasks?: ITask[];
	links?: any[];
	resources?: IResource[];
	assignments?: IAssignment[];
	taskTypes?: ITaskType[];
	selected?: TID[];
	activeTask?: TID | { id: TID; segmentIndex: number };
	scales?: IScaleConfig[];
	columns?: false | IGanttColumn[];
	start?: Date;
	end?: Date;
	lengthUnit?: TLengthUnit;
	durationUnit?: TDurationUnit;
	inclusiveEnd?: boolean;
	cellWidth?: number;
	cellHeight?: number;
	scaleHeight?: number;
	zoom?: boolean | IZoomConfig;
	autoScale?: boolean;
	schedule?: IScheduleConfig;
	undo?: boolean;
	unscheduledTasks?: boolean;
	inactiveTasks?: boolean;
	placeholderRow?: boolean;
	baselines?: boolean;
	rollups?: boolean | { type: "all" | "closest" };
	markers?: IMarker[];
	criticalPath?: ICriticalPathConfig | null;
	projectStart?: Date;
	projectEnd?: Date;
	calendars?: GanttCalendarConfig[];
	calendar?: true | CalendarConfig | TID;
	splitTasks?: boolean;
	summary?: ISummaryConfig;
	slack?: boolean;
	groupBy?: string | IGroupByConfig | null;
	wbs?: boolean;
	highlightTime?: (date: Date, unit: TDurationUnit) => string;
	displayMode?: TDisplayModeConfig;
	gridWidth?: number;
	subGridWidth?: number;
	cellBorders?: TCellBorders;
	deadlines?: boolean;
	progressLine?: boolean | Date | null;
	sCurve?: TSCurveConfig | null;
}

export interface IDataConfig extends IConfig {
	displayMode: TDisplayPanel[];
	gridWidth: number;
	_displayPanels: TDisplayPanel[];
	scrollLeft: number;
	scrollTop: number;
	area: IVisibleArea;
	xArea: IVisibleArea;
	history?: IHistory;
	filterValues?: IFilterValues;
	focusTask?: TFocusTask;
	_cellWidth?: number;
	_sort?: TSort[];
	_resourceSort?: TSort[];
	_weekStart?: Day;
	_markers?: IMarker[];
	_rollups?: {
		[key: TID]: Array<ITask>;
	};
	_resources?: IComputedResource[];
	_isFiltered?: boolean;
	tree?: [];
	_chartWidth?: number;
	_chartHeight?: number;
	_scrollSize?: number;
	_calendar?: ICalendar;
	_calendars?: Map<TID, ICalendar>;
	_composites?: Map<string, ICalendar>;
	_compactMode: boolean;
	_containerWidth: number | null;
	_columnsWidth?: number;
	_gridCollapseThreshold?: number;
	_progressLine?: IProgressLineData | null;
	_progressLinePoints?: string | null;
	_sCurve?: ISCurveData | null;
	_sCurvePoints?: ISCurveLineView[] | null;
	conflicts?: IConflict[];
	_conflicts?: IConflictsIndex | null;
	showConflicts?: boolean;
}

export interface IData extends Omit<IDataConfig, TDataName> {
	columns?: IGanttColumn[];
	_columns?: IGanttColumn[];
	rollups?: false | { type: "all" | "closest" };
	zoom?: IZoomConfig;
	tasks: GanttDataTree;
	links: DataArray<ILink>;
	resources?: IResourceDataTree;
	assignments?: DataArray<IAssignment>;
	calendars?: GanttCalendarConfig[];

	tree: GanttDataTree;
	_tasks: IParsedTask[];
	_rollups: {
		[key: TID]: Array<ITask>;
	};
	_links: IGanttLink[];
	_linksIndex: Map<number, IGanttLink[]>;
	_visibleLinks: IGanttLink[];
	_assignments?: IDataAssignment;
	_selected?: ITask[];
	_activeTask?: ITask;
	_start?: Date;
	_end?: Date;
	_scales?: GanttScaleData;
	_scaleDate?: Date;
	_zoomOffset?: number;
	_weekStart?: Day;
	_isFiltered?: boolean;
	_headerLength?: number;
	_chartWidth?: number;
	_chartHeight?: number;
	_scrollSize?: number;
	_columnsWidth?: number;
	groupBy?: IGroupByConfig;
	_gridCollapseThreshold?: number;
	_progressLine?: IProgressLineData | null;
	_progressLinePoints?: string | null;
	conflicts: IConflict[];
}

export interface IDataHash<T = any> {
	[key: string]: T;
}

// scales

export type IScaleConfig = {
	unit: TLengthUnit;
	step: number;
	format?: { (date: Date, next?: Date): string } | string;
	css?: { (date: Date): string };
};

export type GanttScaleCell = {
	width: number;
	value: string;
	date: Date;
	key: string;
	css: string;
	unit: TLengthUnit;
};

export type GanttScaleRow = {
	cells: GanttScaleCell[];
	height: number;
	add: any;
};

export type GanttScaleData = {
	rows: GanttScaleRow[];
	width: number;
	height: number;
	start: Date;
	end: Date;
	lengthUnit: TLengthUnit;
	minUnit: string;
	lengthUnitWidth: number;
	diff: {
		(
			a: Date,
			b: Date,
			lengthUnit?: TLengthUnit,
			unitSize?: boolean
		): number;
	};
};

export type GanttScaleUnit = {
	start: (date: Date) => Date;
	end: (date: Date) => Date;
	isSame: (date1: Date, date2: Date) => boolean;
	add: (date: Date, num: number) => Date;
	diff?: (date1: Date, date2: Date) => number;
	smallerCount?: {
		[key: TLengthUnit]: number | ((date: Date) => number);
	};
	biggerCount?: {
		[key: TLengthUnit]: number | ((date: Date) => number);
	};
};

export type TColumnSection = "grid" | "subGrid";

export type IGanttColumn = {
	width?: number;
	align?: "left" | "right" | "center";
	flexgrow?: number;
	hidden?: boolean;
	section?: TColumnSection;
	resize?: boolean;
	header?: IColumn["header"];
	id?: string;
	template?: IColumn["template"];
	_template?: IColumn["template"];
	sort?: boolean | TSortFunction;
	cell?: any;
	editor?: IColumn["editor"];
	options?: IColumn["options"];
	getter?: (obj: IDataHash) => any;
	setter?: (obj: IDataHash, value: any) => void;
};

export type TCommonShape = {
	id?: TID;
	key: string;
	label?: string;
	labelTemplate?: (value: any) => string;
	config?: Record<string, any>;
	[key: string]: any;
	isHidden?: (task: Partial<ITask>, state: IData) => boolean;
	isDisabled?: (task: Partial<ITask>, state: IData) => boolean;
};

export type TTextFieldShape = TCommonShape & {
	comp: "text" | "textarea";
};

export type TCounterShape = TCommonShape & {
	comp: "counter";
};

export type TRadioShape = TCommonShape & {
	comp: "radio";
	options: IOption[];
};

export type TComboFieldShape = TCommonShape & {
	comp: "combo" | "select" | "multiselect";
	options?: IOption<any>[];
};

export type TCheckboxShape = TCommonShape & {
	comp: "checkbox";
};

export type TSliderShape = TCommonShape & {
	comp: "slider";
};

export type TDateFieldShape = TCommonShape & {
	comp: "date";
	time?: boolean;
};

export type ILinksShape = TCommonShape & {
	comp: "links";
};

export type ITwoStateShape = TCommonShape & {
	comp: "twostate";
};
export type IResources = TCommonShape & {
	comp: "resources";
};
export type ITabs = TCommonShape & {
	comp: "tabs";
};
export type ISegments = TCommonShape & {
	comp: "segments";
};

export type IConstraintShape = TCommonShape & {
	comp: "constraint";
};

export type TEditorItem =
	| TTextFieldShape
	| TCounterShape
	| TComboFieldShape
	| TSliderShape
	| TDateFieldShape
	| TRadioShape
	| ILinksShape
	| ITwoStateShape
	| TCheckboxShape
	| IResources
	| ISegments
	| IConstraintShape
	| ITabs;

export type IOption<T = TID> = {
	id: T;
	label: string;
};

export type ITaskType = IOption;
export type IConstraintType = IOption;

export type TSort = {
	key: string;
	order?: "asc" | "desc";
};
export type TSortValue = string | number | Date;

export type TFilterHandler = (task: any) => boolean;
export type TScrollMode = "x" | "y" | "xy" | boolean;
export type TFocusTask = {
	id: TID;
	/** Where to move focus; omitted or "chart" focuses the chart bar. */
	section?: TDisplayPanel;
};

export type TLinkDraft = Pick<ILink, "source" | "target" | "type"> & {
	id?: TID;
};
export type TLinkValidator = (link: TLinkDraft) => InvalidLinkReason | null;

export interface IApi {
	exec: <A extends keyof TMethodsConfig | (string & {})>(
		action: A,
		params?: A extends keyof TMethodsConfig ? TMethodsConfig[A] : any
	) => Promise<any>;
	on: <A extends keyof TMethodsConfig | (string & {})>(
		action: A,
		callback: (
			config: A extends keyof TMethodsConfig ? TMethodsConfig[A] : any
		) => any,
		config?: IEventConfig
	) => void;
	intercept: <A extends keyof TMethodsConfig | (string & {})>(
		action: A,
		callback: (
			config: A extends keyof TMethodsConfig ? TMethodsConfig[A] : any
		) => any,
		config?: IEventConfig
	) => void;
	detach: (tag: IEventConfig["tag"]) => void;
	getState: () => IData;
	getReactiveState: () => {
		[Key in keyof IData]: IPublicWritable<IData[Key]>;
	};
	setNext: (ev: IEventBus<TMethodsConfig>) => void;
	getStores: () => { data: DataStore };
	getTable: (
		waitRender?: boolean,
		section?: TColumnSection
	) => Promise<ITableApi> | ITableApi;
	getTask: (id: TID) => ITask;
	getResource: (id: TID) => IResource;
	serialize: (config?: {
		data?: keyof TSerializeData;
	}) => TSerializeData[keyof TSerializeData] | null;
	getCalendar: (id?: TID) => ICalendar | undefined;
	getTaskCalendar: (task: Partial<ITask>) => ITaskCalendar | undefined;
	getResourceCalendar: (
		resource: Partial<IResource>
	) => ICalendar | undefined;
	getHistory: () => IHistoryManager | null | undefined;
	getTaskResources: (id: TID) => TResourceAssignment[];
	getResourceTasks: (id: TID) => ITask[];
	getLinkValidator: () => TLinkValidator;
}
