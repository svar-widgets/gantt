import type { IDataMethodsConfig } from "./DataStore";
import type {
	DataArray,
	TID,
	IEventBus,
	IPublicWritable,
	IEventConfig,
} from "@svar-ui/lib-state";
import type GanttDataTree from "./GanttDataTree";
import { Day } from "date-fns";
import type DataStore from "./DataStore";
import type { IApi as ITableApi, IColumn, IFilterValues } from "@svar-ui/grid-store";

import type {
	TaskSlackInfo,
	ICalendarRule,
	CalendarConfig,
	ICalendar,
} from "./schedule-types";
export type { TaskSlackInfo, ICalendarRule, CalendarConfig, ICalendar };
import ResourceDataTree from "./pro/ResourceDataTree";

export type TMethodsConfig = IDataMethodsConfig;
export type { GanttDataTree, TID };

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
export type TDisplayMode = "all" | "grid" | "chart";
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

export interface IComputedResource extends IParsedResource {
	data?: IComputedResource[];
	$load: Record<string, IResourceLoad>;
	$total: number;
	$overloaded: boolean;
	$unitLoad?: Record<string, IResourceLoad>;
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

	rollup?: boolean;
	open?: boolean;
	text?: string;
	details?: string;
	progress?: number;
	type?: TTaskType;
	parent?: TID;
	calendar?: TID;
	unscheduled?: boolean;
	segments?: Partial<ITask>[];

	[key: string]: any;
}

export interface IParsedTask extends ITask {
	id: TID;
	parent: TID;
	data?: IParsedTask[];
	$level: number;
	$wbs?: string;
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

	$reorder?: boolean;
	critical?: boolean;
	slack?: TaskSlackInfo;
	$visibleSlack?: number;
	$x_slack?: number;
	$w_slack?: number;
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

export interface IHistory {
	undo: number;
	redo: number;
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
	columns?: IGanttColumn[];
	start?: Date;
	end?: Date;
	lengthUnit?: TLengthUnit;
	durationUnit?: TDurationUnit;
	cellWidth?: number;
	cellHeight?: number;
	scaleHeight?: number;
	zoom?: boolean | IZoomConfig;
	autoScale?: boolean;
	schedule?: IScheduleConfig;
	undo?: boolean;
	unscheduledTasks?: boolean;
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
	displayMode?: TDisplayMode;
	gridWidth?: number;
	cellBorders?: TCellBorders;
}

export interface IDataConfig extends IConfig {
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
	_calendars?: Record<TID, ICalendar>;
	_compactMode: boolean;
	_columnsWidth?: number;
	_gridCollapseThreshold?: number;
}

export interface IData
	extends Omit<IDataConfig, TDataName | "rollups" | "groupBy"> {
	rollups?: false | { type: "all" | "closest" };
	zoom?: IZoomConfig;
	tasks: GanttDataTree;
	links: DataArray<ILink>;
	resources?: ResourceDataTree;
	assignments?: DataArray<IAssignment>;
	calendars?: GanttCalendarConfig[];

	tree: GanttDataTree;
	_tasks: IParsedTask[];
	_tasksPatch?: boolean | null;
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
	_scaleMinUnit?: TLengthUnit;
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
	css: string;
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

export type IGanttColumn = {
	width?: number;
	align?: "left" | "right" | "center";
	flexgrow?: number;
	hidden?: boolean;
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
	options: { id: TID; label: string }[];
};

export type TComboFieldShape = TCommonShape & {
	comp: "combo" | "select" | "multiselect";
	options?: { id: any; label: string }[];
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
	| ITabs;

export type ITaskType = {
	id: TID;
	label: string;
};

export type TSort = {
	key: string;
	order?: "asc" | "desc";
};
export type TSortValue = string | number | Date;

export type TFilterHandler = (task: any) => boolean;
export type TScrollMode = "x" | "y" | "xy" | boolean;
export type TFocusTask = {
	id: TID;
	column?: boolean;
};

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
	getTable: (waitRender?: boolean) => Promise<ITableApi> | ITableApi;
	getTask: (id: TID) => ITask;
	getResource: (id: TID) => IResource;
	serialize: (config?: {
		data?: keyof TSerializeData;
	}) => TSerializeData[keyof TSerializeData] | null;
	getCalendar: (id?: TID) => ICalendar | undefined;
	getTaskResources: (id: TID) => TResourceAssignment[];
	getResourceTasks: (id: TID) => ITask[];
}
