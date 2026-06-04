import type { Component, ComponentProps } from "svelte";
import { ContextMenu as BaseContextMenu } from "@svar-ui/svelte-menu";
import { Toolbar as BaseToolbar } from "@svar-ui/svelte-toolbar";
import { Editor as BaseEditor } from "@svar-ui/svelte-editor";
import { Tooltip as BaseTooltip } from "@svar-ui/svelte-core";
import {
	HeaderMenu as BaseHeaderMenu,
	IColumnConfig as ITableColumn,
} from "@svar-ui/svelte-grid";

import type {
	TMethodsConfig,
	IApi,
	IConfig,
	ITask,
	ILink,
	IResource,
	IGanttColumn,
	IResourceColumn,
	IResourceLoad,
} from "@svar-ui/gantt-store";

export * from "@svar-ui/gantt-store";
export { registerEditorItem } from "@svar-ui/svelte-editor";

export interface IColumnConfig extends Omit<IGanttColumn, "header"> {
	cell?: ITableColumn["cell"];
	header?: ITableColumn["header"];
	editor?: ITableColumn["editor"];
}

export declare const Gantt: Component<
	{
		columns?: false | IColumnConfig[];
		taskTemplate?: Component<{
			data: ITask;
			api: IApi;
			onaction: (ev: {
				action: string;
				data: { [key: string]: any };
			}) => void;
		}>;
		readonly?: boolean;
		init?: (api: IApi) => void;
	} & IConfig &
		GanttActions<TMethodsConfig>
>;

export declare const HeaderMenu: Component<
	ComponentProps<typeof BaseHeaderMenu> & {
		api?: IApi;
	}
>;

export declare const ContextMenu: Component<
	ComponentProps<typeof BaseContextMenu> & {
		api?: IApi;
	}
>;

export declare const Toolbar: Component<
	ComponentProps<typeof BaseToolbar> & {
		api?: IApi;
	}
>;

export declare const Editor: Component<
	ComponentProps<typeof BaseEditor> & {
		api?: IApi;
	}
>;

type TooltipContentData =
	| { task: ITask; segmentIndex: number | null }
	| { link: ILink }
	| { rollup: ITask }
	| { resource: IResource };

export declare const Tooltip: Component<
	Omit<ComponentProps<typeof BaseTooltip>, "content"> & {
		content?: Component<{
			api: IApi;
			data: TooltipContentData;
		}>;
		api?: IApi;
		children?: () => any;
	}
>;

export declare const ResourceLoad: Component<{
	api?: IApi;
	columns?: IResourceColumn[];
	mode?: "grid" | "chart";
	template?: (load: IResourceLoad) => string;
}>;

export declare const Material: Component<{
	fonts?: boolean;
	children?: () => any;
}>;

export declare const Willow: Component<{
	fonts?: boolean;
	children?: () => any;
}>;

export declare const WillowDark: Component<{
	fonts?: boolean;
	children?: () => any;
}>;

/* get component events from store actions*/
type RemoveHyphen<S extends string> = S extends `${infer Head}-${infer Tail}`
	? `${Head}${RemoveHyphen<Tail>}`
	: S;

type EventName<K extends string> = `on${RemoveHyphen<K>}`;

export type GanttActions<TMethodsConfig extends Record<string, any>> = {
	[K in keyof TMethodsConfig as EventName<K & string>]?: (
		ev: TMethodsConfig[K]
	) => void;
} & {
	[key: `on${string}`]: (ev?: any) => void;
};
