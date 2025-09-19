import type { IDataMethodsConfig } from "./DataStore";
import type {
	DataArray,
	TID,
	IEventBus,
	IPublicWritable,
	IEventConfig,
} from "@svar-ui/lib-state";
import type GanttDataTree from "./GanttDataTree";
import type DataStore from "./DataStore";
import type { IApi as ITableApi, IColumn } from "@svar-ui/grid-store";

export type TMethodsConfig = IDataMethodsConfig;
export type { GanttDataTree, TID };

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

export interface ILink {
	id?: TID;
	type: TLinkType;
	source: TID;
	target: TID;
}

export interface IGanttLink extends ILink {
	id: TID;
	$p: string;
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

	open?: boolean;
	text?: string;
	details?: string;
	progress?: number;
	type?: TTaskType;
	parent?: TID;
	unscheduled?: boolean;

	[key: string]: any;
}

export interface IParsedTask extends ITask {
	id: TID;
	parent?: TID;
	data?: IParsedTask[];
	$level: number;
}

export interface IGanttTask extends IParsedTask {
	$x: number;
	$y: number;
	$h: number;
	$w: number;

	$x_base?: number;
	$w_base?: number;

	$reorder?: boolean;
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

export interface IConfig {
	tasks?: ITask[];
	links?: any[];
	taskTypes?: ITaskType[];
	selected?: TID[];
	activeTask?: TID;
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
}

export interface IProConfig extends IConfig {
	unscheduledTasks?: boolean;
	baselines?: boolean;
	markers?: IMarker[];
}

export interface IDataConfig extends IProConfig {
	scrollLeft: number;
	scrollTop: number;
	area: IVisibleArea;
	_cellWidth?: number;
	_sort?: TSort[];
	_scrollTask?: TScrollTask;
}

export interface IData extends Omit<IDataConfig, "tasks" | "links"> {
	zoom?: IZoomConfig;
	tasks: GanttDataTree;
	links: DataArray<ILink>;

	_tasks: IParsedTask[];
	_links: IGanttLink[];
	_selected?: ITask[];
	_activeTask?: ITask;
	_start?: Date;
	_end?: Date;
	_scales?: GanttScaleData;
	_markers?: IMarker[];

	_scaleDate?: Date;
	_zoomOffset?: number;
}

export interface DataHash {
	[key: string]: any;
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
	resize?: boolean;
	header?: IColumn["header"];
	id?: string;
	template?: IColumn["template"];
	sort?: boolean;
	cell?: any;
	editor?: IColumn["editor"];
	options?: IColumn["options"];
};

export type TCommonShape = {
	id?: TID;
	key: string;
	label?: string;
	labelTemplate?: (value: any) => string;
	config?: Record<string, any>;
	[key: string]: any;
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

export type TEditorShape =
	| TTextFieldShape
	| TCounterShape
	| TComboFieldShape
	| TSliderShape
	| TDateFieldShape
	| TRadioShape
	| ILinksShape
	| ITwoStateShape;

export type ITaskType = {
	id: TID;
	label: string;
};

export type TSort = {
	key: string;
	order?: "asc" | "desc";
};
export type TSortValue = string | number | Date;

export type TScrollTask = { id: TID; mode?: "x" | "y" | "xy" | boolean };

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
	serialize: () => ITask[];
}
