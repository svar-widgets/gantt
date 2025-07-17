import type { IDataMethodsConfig } from "./DataStore";
import type { DataArray, TID } from "wx-lib-state";
import type GanttDataTree from "./GanttDataTree";

export type TMethodsConfig = IDataMethodsConfig;
export type { GanttDataTree, TID };

export interface IActionConfig<T = any> {
	data?: T;
	noSave?: boolean;
}
export type TLinkType = "s2s" | "s2e" | "e2s" | "e2e";

export type TTaskType = "task" | "summary" | "milestone";

export type TEditorType = "text" | "combo" | "datepicker" | "richselect";
export interface IColumnEditor {
	type: TEditorType;
	config?: {
		template?: (v: any) => string;
		cell?: any;
		options?: any[];
		buttons?: boolean | string[];
	};
}
export type TEditorHandler = (
	row?: ITask,
	column?: any
) => TEditorType | IColumnEditor | null;

export interface ILink {
	id: TID;
	type: TLinkType;
	source: TID;
	target: TID;
}

export interface ITask {
	start?: Date;
	id: TID;
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
	parent: TID;
	data: IParsedTask[];
	$level: number;
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
	level: number;
	minCellWidth?: number;
	maxCellWidth?: number;
	levels?: Array<IScaleLevel>;
}

export interface IScaleLevel {
	minCellWidth: number;
	maxCellWidth: number;
	scales: GanttScale[];
}

export interface IMarker {
	start: Date;
	text?: string;
	css?: string;
	left?: number;
}

export interface IDataConfig {
	selected?: TID[];
	activeTask?: TID;
	tasks: ITask[];
	links: ILink[];
	start: Date;
	end: Date;
	lengthUnit: string;
	cellWidth: number;
	cellHeight: number;
	scaleHeight: number;
	scales: any[];
	columns: GanttColumn[];
	scrollLeft: number;
	scrollTop: number;
	area: IVisibleArea;
	taskTypes?: ITaskType[];
	baselines?: boolean;
	zoom: boolean | IZoomConfig;
	highlightTime?: (date: Date, unit: "day" | "hour") => string;
	_cellWidth?: number;
	_sort?: TSort[];
	autoScale?: boolean;
	unscheduledTasks?: boolean;
	markers?: IMarker[];
	durationUnit: "day" | "hour";
	_scrollTask?: TScrollTask;
}

export interface IData {
	selected: TID[];
	_selected: ITask[];
	activeTask: TID;
	_activeTask: ITask;
	tasks: GanttDataTree;
	_tasks: IParsedTask[];
	links: DataArray<ILink>;
	_links: IGanttLink[];
	start: Date;
	_start: Date;
	end: Date;
	_end: Date;
	lengthUnit: string;
	cellWidth: number;
	cellHeight: number;
	scaleHeight: number;
	scales: GanttScale[];
	_scales: GanttScaleData;
	columns: GanttColumn[];
	scrollTop: number;
	scrollLeft: number;
	area: IVisibleArea;
	taskTypes?: ITaskType[];
	baselines?: boolean;
	zoom: IZoomConfig;
	highlightTime?: (date: Date, unit: "day" | "hour") => string;
	_cellWidth?: number;
	_sort?: TSort[];
	_scaleDate?: Date;
	_zoomOffset?: number;
	autoScale?: boolean;
	markers?: IMarker[];
	_markers?: IMarker[];
	unscheduledTasks?: boolean;
	durationUnit: "day" | "hour";
	_scrollTask?: TScrollTask;
}

export interface DataHash {
	[key: string]: any;
}

// scales

export type GanttScale = {
	unit: string;
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
	lengthUnit: string;
	minUnit: string;
	lengthUnitWidth: number;
	diff: {
		(a: Date, b: Date, lengthUnit?: string, unitSize?: boolean): number;
	};
};

export type GanttColumn = {
	width?: number;
	align?: "left" | "right" | "center";
	flexgrow?: number;
	resize?: boolean;
	header:
		| string
		| {
				cell?: string;
				css?: string;
				text: string;
		  };
	id: string;
	action?: string;
	template?: { (b: any, row: any): string };
	sort?: boolean;
	cell?: any;
	editor?: TEditorType | IColumnEditor | TEditorHandler;
	options?: DataHash[];
};

export interface IGanttTask extends IParsedTask {
	end: Date;
	duration: number;

	unscheduled?: boolean;

	$x: number;
	$y: number;
	$h: number;
	$w: number;

	$x_base?: number;
	$w_base?: number;

	$reorder?: boolean;
}

export interface IGanttLink extends ILink {
	id: TID;
	$p: string;
}

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
