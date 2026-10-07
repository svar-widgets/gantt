import type {
	GanttScaleCell,
	GanttScaleData,
	IApi,
	IComputedResource,
	IData,
	IHistogramBar,
	IHistogramColumn,
	IHistogramColumnPosition,
	IResourceHistogramConfig,
	IResourceHistogramTooltip,
	IResourceLoad,
} from "./types";


interface IResourceLoadColumn {
	id: string;
	width: number;
	date: Date;
	unit: string;
	getter: (row: IComputedResource) => IResourceLoad | null;
	template: (value: IResourceLoad | null) => string;
	cell: any;
}

interface IResourceHistogramColumn extends IHistogramColumn {
	unit: string;
	cell: any;
	getter: (row: IComputedResource) => { hours: number; capacity: number };
}


export function getHistogramBars(
	resource: IComputedResource,
	column: IHistogramColumn
): IHistogramBar[] {
	let result: IHistogramBar[] = [];
	return result;
}

export function getHistogramCapacityPath(
	resource: IComputedResource,
	columns: IHistogramColumnPosition[],
	cellHeight: number
): string {
	let result = "";
	return result;
}

export function getResourceLoadColumns(
	scales: GanttScaleData | null | undefined,
	LoadCell: any,
	template?: (value: IResourceLoad) => string
): IResourceLoadColumn[] {
	let result: IResourceLoadColumn[] = [];
	return result;
}

export function getResourceHistogramColumns(
	scales: GanttScaleData | null | undefined,
	HistogramCell: any,
	config?: IResourceHistogramConfig
): IResourceHistogramColumn[] {
	let result: IResourceHistogramColumn[] = [];
	return result;
}

export function resolveResourceHistogramBar(
	api: IApi,
	target: EventTarget | null
): IResourceHistogramTooltip | null {
	let result: IResourceHistogramTooltip | null = null;


	return result;
}
