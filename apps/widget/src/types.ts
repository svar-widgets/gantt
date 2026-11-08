import type { Component } from "svelte";
import type { IColumnConfig as ITableColumn } from "@svar-ui/svelte-grid";
import type {
	IApi,
	IGanttColumn,
	IGanttTask,
	ILink,
	IResource,
	IResourceHistogramTooltip,
	ISCurveTooltip,
	ITask,
	TID,
	TMethodsConfig,
} from "@svar-ui/gantt-store";

export interface ILocatedTask {
	id: TID;
	node: Element;
}

export interface IColumnConfig extends Omit<IGanttColumn, "header" | "editor"> {
	cell?: ITableColumn["cell"];
	header?: ITableColumn["header"];
	editor?: ITableColumn["editor"] | false;
}

export interface IGanttAction {
	action: string;
	data: { [key: string]: any };
}

export interface ITaskTemplateProps {
	data: IGanttTask;
	api: IInnerApi;
	onaction: (ev: IGanttAction) => void;
}

export type ITooltipContentData =
	| { task: ITask; segmentIndex: number | null; violated?: boolean }
	| { constraint: ITask; violated?: boolean }
	| { link: ILink }
	| { rollup: ITask }
	| { resource: IResource }
	| { histogram: IResourceHistogramTooltip }
	| { sCurve: ISCurveTooltip }
	| { deadline: ITask };

export interface ITooltipContentProps {
	api: IApi;
	data: ITooltipContentData;
}

/* get component events from store actions */
type RemoveHyphen<S extends string> = S extends `${infer Head}-${infer Tail}`
	? `${Head}${RemoveHyphen<Tail>}`
	: S;

type EventName<K extends string> = `on${RemoveHyphen<K>}`;

export type GanttActions<T extends Record<string, any> = TMethodsConfig> = {
	[K in keyof T as EventName<K & string>]?: (ev: T[K]) => void;
} & {
	[key: `on${string}`]: ((ev?: any) => void) | undefined;
};

export type TEditorTableColumn = ITableColumn & {
	align?: "left" | "right" | "center";
};

export type TCellComponent = Component<any>;

export interface IEditorAction {
	action: string;
	data: { [key: string]: any };
}

export interface IEditorSectionChange {
	view: "links" | "segments" | "resources";
	event: IEditorAction & { id: TID };
	values?: { [key: string]: any };
}

export type IInnerApi = Pick<
	IApi,
	| "getReactiveState"
	| "getState"
	| "exec"
	| "on"
	| "detach"
	| "getTask"
	| "getTaskCalendar"
	| "getResourceCalendar"
	| "getCalendar"
	| "getTaskResources"
	| "getHistory"
	| "getLinkValidator"
>;
