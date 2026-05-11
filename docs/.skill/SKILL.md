Use when building, configuring, styling, or modifying SVAR Svelte Gantt / @wx/svelte-gantt timelines, grids, task editors, toolbars, context menus, tooltips, scales, links, and Gantt data actions.

## Package

```js
import {
	Gantt,
	ContextMenu,
	HeaderMenu,
	Toolbar,
	Tooltip,
	Editor,
	Willow,
	WillowDark,
	version,
	defaultEditorItems,
	defaultToolbarButtons,
	defaultMenuOptions,
	defaultColumns,
	defaultTaskTypes,
	getEditorItems,
	getToolbarButtons,
	getMenuOptions,
	registerScaleUnit,
	registerEditorItem,
} from "@wx/svelte-gantt";
```

## Components

-   `Gantt` - main grid plus timeline chart; `bind:this` exposes the Gantt API object from source.
-   `Toolbar` - Gantt-aware wrapper around `@wx/svelte-toolbar`; accepts `api` and optional `items`.
-   `ContextMenu` - Gantt-aware wrapper around `@wx/svelte-menu` context menu; resolves tasks from Gantt `data-id`.
-   `Editor` - Gantt-aware wrapper around `@wx/svelte-editor`; opens for `activeTask` / `show-editor`.
-   `Tooltip` - wraps a Gantt and displays task text or a custom content component from `data-tooltip-id`.
-   `HeaderMenu` - wraps `@wx/svelte-grid` header menu and passes `api.getTable()` to it.
-   `Willow`, `WillowDark` - theme wrappers; each accepts `fonts?: boolean` and optional children.

## Supported functionality

### Gantt Data

-   `tasks` is an array of task objects; common fields are `id`, `text`, `start`, `end`, `duration`, `progress`, `parent`, `type`, `open`, `details`, `data`, `unscheduled`, `segments`, `base_start`, `base_end`, `base_duration`, `rollup`.
-   `links` is an array of dependency links with `id`, `source`, `target`, `type`, optional `lag`.
-   link `type` values are `s2s`, `s2e`, `e2s`, `e2e`.
-   task `type` defaults are `task`, `summary`, `milestone`; custom types are supported through `taskTypes`.
-   milestone tasks are normalized with `duration = 0` and no `end`.
-   summary task dates are calculated from children when `start` / `end` are missing.
-   `parseTaskDates(tasks, { durationUnit, splitTasks, calendar })` runs inside `Gantt` and mutates task date fields unless `_export` is set.

Common data objects:

```js
const tasks = [
	{
		id: 1,
		text: "Project",
		type: "summary",
		parent: 0,
		open: true,
	},
	{
		id: 10,
		text: "Task",
		type: "task",
		parent: 1,
		start: new Date(2026, 3, 2),
		duration: 3,
		progress: 40,
	},
	{
		id: 11,
		text: "Milestone",
		type: "milestone",
		parent: 1,
		start: new Date(2026, 3, 8),
	},
];

const links = [{ id: 1, source: 10, target: 11, type: "e2s" }];
```

### Gantt Config

-   default scales: `[{ unit: "month", step: 1, format: "%F %Y" }, { unit: "day", step: 1, format: "%j" }]`.
-   `scales` rows accept `unit`, `step`, `format?: string | (date, next) => string`, `css?: (date) => string`.
-   `start`, `end`, and `autoScale` control timeline bounds; `autoScale` includes tasks, markers, baselines, `projectStart`, and `projectEnd`.
-   `zoom` accepts `true` or `IZoomConfig`; chart zoom is handled by Ctrl/Command + wheel and emits `zoom-scale`.
-   `columns` defaults to `defaultColumns`; `columns={false}` hides the grid and resizer.
-   the `text` column is rendered with the built-in `TextCell`; `add-task` uses `ActionCell`, is removed in `readonly`, and moves to the first column in compact chart mode.
-   `cellWidth`, `cellHeight`, `scaleHeight` control timeline width, row height, and scale row height.
-   `lengthUnit` controls chart math; `durationUnit` controls task duration calculation and is `"day"` or `"hour"`.
-   `cellBorders` is `"column"` or `"full"`.
-   `readonly` disables task drag, progress editing, link editing, grid add column behavior, and editor opening from double click.
-   `selected` and `activeTask` are config inputs, not `$bindable()` props; read or change live selection through `api.getReactiveState()` and `api.exec("select-task", ...)`.
-   `highlightTime(date, unit)` can return a CSS class for timescale cells and chart background cells when min unit is `day` or `hour`.
-   compact mode is driven by a `ResizeObserver` on `document.body`; width `<= 650` switches the layout to grid/chart modes.

Common config objects:

```js
const columns = [
	{ id: "text", header: "Task name", flexgrow: 1, editor: "text" },
	{
		id: "start",
		header: "Start date",
		align: "center",
		editor: "datepicker",
	},
	{ id: "duration", header: "Duration", width: 100, align: "center" },
	{ id: "add-task", header: "Add task", width: 50, align: "center" },
];

const scales = [
	{ unit: "month", step: 1, format: "%F %Y" },
	{ unit: "week", step: 1, format: "Week %w" },
	{
		unit: "day",
		step: 1,
		format: "%j",
		css: date => (date.getDay() === 0 ? "wx-weekend" : ""),
	},
];

const zoom = {
	level: 2,
	minCellWidth: 40,
	maxCellWidth: 180,
};
```

### Pro And Advanced Config

-   `baselines` shows `base_start` / `base_end` / `base_duration`.
-   `rollups` accepts `true` or `{ type: "all" | "closest" }`; tasks with `rollup: true` are drawn on summary rows.
-   `markers` is an array of `{ start: Date, text?: string, css?: string }`.
-   `criticalPath={{ type: "strict" | "flexible" }}` marks critical tasks and links.
-   `schedule={{ type?: "forward", auto?: boolean }}` enables scheduling behavior; `projectStart` and `projectEnd` provide bounds.
-   `calendar` accepts a `Calendar` from `@wx/gantt-store`; Gantt then creates default weekend highlighting when `calendar` is set.
-   `undo` enables history state plus `undo` / `redo` actions and toolbar buttons.
-   `splitTasks` enables task `segments` editing, split toolbar/menu actions, and segment-aware editor/context-menu targets.
-   `summary={{ autoProgress?: boolean, autoConvert?: boolean }}` controls summary progress and summary type conversion behavior.
-   `slack` shows task slack visuals.
-   `unscheduledTasks` enables task `unscheduled` support and editor scheduling controls.
-   `api.exec("export-data", config)` supports `format: "pdf" | "png" | "xlsx" | "mspx"` through `IExportConfig`.
-   `api.exec("import-data", { data, format: "mspx" })` imports MS Project XML.

### API And Events

`Gantt` exposes this API from source through `bind:this` or `init(api)`:

-   state: `getState()`, `getReactiveState()`, `getStores()`
-   events/actions: `exec(action, data)`, `on(action, callback, config?)`, `intercept(action, callback, config?)`, `detach(tag)`, `setNext(eventBusOrProvider)`
-   task/table helpers: `getTask(id)`, `getTable(waitRender?)`, `serialize()`, `getHistory()`

Component callback props are generated from action names by removing hyphens and prefixing `on`:

-   `add-task` -> `onaddtask`
-   `update-task` -> `onupdatetask`
-   `select-task` -> `onselecttask`
-   custom `taskTemplate` action `"custom-click"` -> `oncustomclick`

Source routes actions through `DataStore` first, then calls the matching component callback prop if present.

Common actions:

```js
api.exec("add-task", {
	task: { text: "New task", type: "task" },
	target: 10,
	mode: "after",
	show: true,
});

api.exec("update-task", {
	id: 10,
	task: { text: "Updated", progress: 75 },
});

api.exec("select-task", {
	id: 10,
	toggle: false,
	range: false,
	show: "xy",
	focus: "grid",
});

api.exec("move-task", { id: 10, target: 1, mode: "child" });
api.exec("filter-tasks", {
	filter: task => task.text?.includes("API"),
	open: true,
});
api.exec("scroll-chart", { date: new Date(2026, 4, 1) });
```

Use `api.intercept(action, cb)` to block or replace built-in behavior; returning `false` blocks the action. Use `api.setNext(provider)` to forward data changes to a provider such as `RestDataProvider`.

### Saving

-   `RestDataProvider` from `@wx/gantt-data-provider` persists data changes to a REST backend.
-   Wire it once with `api.setNext(provider)` in `init`; the provider then forwards every data action (`add-task`, `update-task`, `delete-task`, `move-task`, `add-link`, `update-link`, `delete-link`, etc.) emitted on the event bus as the matching REST call. No per-action save handlers needed.
-   Initial load uses `provider.getData()`; lazy branches use `provider.getData(id)` inside `request-data` and dispatch back through `provide-data`.
-   Optional `{ batchURL }` constructor option batches concurrent writes into a single endpoint.

```js
import { RestDataProvider } from "@wx/gantt-data-provider";

const provider = new RestDataProvider("/api/gantt");

function init(api) {
	api.setNext(provider); // forwards all task/link mutations to REST
}
```

### Toolbar

-   `Toolbar` source props are `api = null` and `items = []`.
-   default items come from `getToolbarButtons({ undo: $undo, splitTasks: $splitTasks })`.
-   default handled ids are wired through `handleAction(api, item.id, null, _)`.
-   custom item `handler` functions are preserved only when the id is not one of the handled default action ids.
-   if no task is selected, default toolbar keeps only targetless items such as `add-task` and history controls.
-   `undo` adds `undo` and `redo`; `splitTasks` adds `split-task`.

Default toolbar ids:

```js
[
	"add-task",
	"edit-task",
	"delete-task",
	"move-task:up",
	"move-task:down",
	"copy-task",
	"cut-task",
	"paste-task",
	"indent-task:add",
	"indent-task:remove",
];
```

### Context Menu

-   `ContextMenu` source props are `options`, `api`, `resolver`, `filter`, `at = "point"`, `children`, `onclick`, `css`.
-   the wrapper passes `dataKey="id"` to `@wx/svelte-menu`; Gantt grid rows and bars expose `data-id`.
-   built-in menu options are from `getMenuOptions({ splitTasks, taskTypes, summary })`.
-   right-clicking a task selects it when it is not already selected.
-   `resolver(id, event)` can return `true` to use the default task, return a replacement context object, or return a falsy value to prevent task resolution.
-   `filter(option, task)` is applied across selected tasks; built-in `isHidden` and `isDisabled` are also applied.
-   wrapper `onclick` receives the menu event used in demos as `{ context, action }`.
-   built-in handled `action.id` values are executed through `handleAction(api, action.id, activeId, _)` before user `onclick`.
-   with `splitTasks`, segment targets use `{ id, segmentIndex }` internally for edit/delete/split actions.

Default menu ids:

```js
[
	"add-task:child",
	"add-task:before",
	"add-task:after",
	"convert-task:<taskType>",
	"edit-task",
	"cut-task",
	"copy-task",
	"paste-task",
	"move-task:up",
	"move-task:down",
	"indent-task:add",
	"indent-task:remove",
	"delete-task",
];
```

### Editor

-   `Editor` source props are `api`, `items = []`, `css = ""`, `layout = "default"`, `readonly = false`, `placement = "sidebar"`, `bottomBar = true`, `topBar = true`, `autoSave = true`, `focus = false`, `hotkeys = {}`.
-   editor renders only when `api.getReactiveState()._activeTask` exists.
-   default items come from `getEditorItems({ unscheduledTasks, rollups, summary, taskTypes })`.
-   built-in editor comps registered by the wrapper: `select`, `date`, `twostate`, `slider`, `counter`, `links`, `checkbox`.
-   `registerEditorItem(name, Component)` registers custom comps for `items`.
-   item `key` is the task field; editor values are task objects keyed by those `key` values.
-   `autoSave={true}` saves valid changes on field change; `autoSave={false}` stores local values and saves from a `save` top/bottom bar action.
-   saved task payload removes `links` and `data`; `duration` may be removed when no duration editor is present.
-   `links` editor changes are batched in the wrapper and saved through link actions.
-   default `topBar={true}` in editable mode creates close/spacer/delete buttons, plus save when `autoSave={false}`.

Default editor keys:

```js
["text", "details", "type", "start", "end", "duration", "progress", "links"];
```

### Tooltip

-   `Tooltip` source props are `api`, `content`, `children`.
-   default tooltip text is the task `text`, or segment `text` when `data-segment` is present.
-   custom `content` component receives `{ data }`; source also passes `segmentIndex` for split-task segments.
-   direct tooltip override can use a DOM `data-tooltip` attribute; placement hint uses `data-tooltip-at="left"`.
-   tooltip lookup is debounced by 300ms.

### Header Menu

-   `HeaderMenu` source props are `api`, `columns`, `children`.
-   wrapper calls `api?.getTable()` and passes that table API to `@wx/svelte-grid` `HeaderMenu`.
-   use it when the grid table API is needed for column visibility/menu behavior.

## Public Types

```ts
import type { Component, ComponentProps } from "svelte";
import { ContextMenu as BaseContextMenu } from "@wx/svelte-menu";
import { Toolbar as BaseToolbar } from "@wx/svelte-toolbar";
import { Editor as BaseEditor } from "@wx/svelte-editor";
import {
	HeaderMenu as BaseHeaderMenu,
	IColumnConfig as ITableColumn,
} from "@wx/svelte-grid";

import type {
	TMethodsConfig,
	IApi,
	IConfig,
	ITask,
	IGanttColumn,
} from "@wx/gantt-store";

export * from "@wx/gantt-store";
export { registerEditorItem } from "@wx/svelte-editor";

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
		cellBorders?: "column" | "full";
		highlightTime?: (date: Date, unit: "day" | "hour") => string;
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

export declare const Tooltip: Component<{
	content?: Component<{
		data: ITask;
	}>;
	api?: IApi;
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
```

## Styling

Main hooks:

-   root/layout: `.wx-gantt`, `.wx-pseudo-rows`, `.wx-stuck`, `.wx-layout`, `.wx-content`
-   grid: `.wx-table-container`, `.wx-table`, `.wx-grid`, `.wx-header`, `.wx-body`, `.wx-row`, `.wx-cell`, `.wx-action`, `.wx-toggle-icon`, `.wx-action-icon`
-   chart: `.wx-chart`, `.wx-scale`, `.wx-area`, `.wx-bars`, `.wx-bar`, `.wx-task`, `.wx-summary`, `.wx-milestone`, `.wx-content`, `.wx-text-out`
-   custom task types: built-ins render as `.wx-task`, `.wx-summary`, `.wx-milestone`; custom task types render as `.wx-task.<customType>`
-   task state: `.wx-selected`, `.wx-critical`, `.wx-reorder-task`, `.wx-split`, `.wx-touch`
-   progress/links: `.wx-progress-wrapper`, `.wx-progress-percent`, `.wx-progress-marker`, `.wx-link`, `.wx-line`, `.wx-line-selected`, `.wx-delete-link`
-   split/rollup/baseline/slack: `.wx-segments`, `.wx-segment`, `.wx-rollup`, `.wx-task-rollup`, `.wx-summary-rollup`, `.wx-milestone-rollup`, `.wx-baseline`, `.wx-slack`, `.wx-slack-task`
-   scales/markers/holidays: `.wx-scale`, `.wx-row`, `.wx-cell`, `.wx-weekend`, `.wx-markers`, `.wx-marker`
-   companion components: `.wx-gantt-editor`, `.wx-gantt-tooltip`, `.wx-gantt-tooltip-text`, `.wx-tooltip-area`, `.wx-menu`, `.wx-option`
-   resizer/display controls: `.wx-resizer`, `.wx-resizer-display-all`, `.wx-resizer-display-grid`, `.wx-resizer-display-chart`, `.wx-button-expand-left`, `.wx-button-expand-right`

Layout defaults:

-   the host container must provide height; `.wx-gantt` uses `height: 100%; width: 100%; overflow-y: auto`.
-   `.wx-layout` is a flex row with hidden overflow.
-   `.wx-table-container` uses `flex: 0 0 <grid width>` and `height: 100%`.
-   `.wx-chart` uses `flex: 1 1 auto` with horizontal scrolling.
-   `.wx-scale` is sticky at the top of the chart.
-   `columns={false}` removes grid and resizer; otherwise grid and chart are split by the resizer.

Important CSS variables:

-   bars: `--wx-gantt-bar-font`, `--wx-gantt-bar-border-radius`, `--wx-gantt-bar-shadow`
-   tasks: `--wx-gantt-task-color`, `--wx-gantt-task-fill-color`, `--wx-gantt-task-font-color`, `--wx-gantt-task-border`, `--wx-gantt-task-border-color`
-   summaries/milestones: `--wx-gantt-summary-color`, `--wx-gantt-summary-fill-color`, `--wx-gantt-summary-font-color`, `--wx-gantt-milestone-color`, `--wx-gantt-milestone-border-radius`
-   critical/slack: `--wx-gantt-critical-color`, `--wx-gantt-task-critical-color`, `--wx-gantt-task-critical-fill-color`, `--wx-gantt-task-slack-color`, `--wx-gantt-task-slack-border-color`
-   links: `--wx-gantt-link-color`, `--wx-gantt-link-color-hovered`, `--wx-gantt-link-critical-color`, `--wx-gantt-link-critical-color-hovered`, `--wx-gantt-link-marker-background`, `--wx-gantt-link-marker-color`
-   grid/scale: `--wx-gantt-border`, `--wx-gantt-select-color`, `--wx-grid-body-font`, `--wx-grid-header-font`, `--wx-timescale-font`, `--wx-timescale-border`, `--wx-timescale-shadow`
-   markers/tooltips: `--wx-gantt-marker-color`, `--wx-gantt-marker-font`, `--wx-gantt-marker-font-color`, `--wx-tooltip-background`, `--wx-tooltip-font`, `--wx-tooltip-font-color`

```svelte
<script>
	import { Gantt, Willow } from "@wx/svelte-gantt";
</script>

<div class="gantt-shell">
	<Willow>
		<Gantt {tasks} {links} />
	</Willow>
</div>

<style>
	.gantt-shell {
		height: 100%;
	}

	.gantt-shell .wx-gantt .wx-bar.wx-task.urgent {
		background-color: #f49a82;
		border: 1px solid #f45e36;
	}

	.gantt-shell .wx-gantt .wx-bar.wx-task.urgent .wx-progress-percent {
		background-color: #f45e36;
	}

	.gantt-shell .wx-gantt .my-marker {
		background-color: rgba(255, 84, 84, 0.77);
	}
</style>
```

## Recipes

### Basic Gantt With Theme

```svelte
<script>
	import { Gantt, Willow } from "@wx/svelte-gantt";

	const tasks = [
		{ id: 1, text: "Planning", type: "summary", parent: 0, open: true },
		{
			id: 10,
			text: "Research",
			type: "task",
			parent: 1,
			start: new Date(2026, 3, 2),
			duration: 3,
			progress: 50,
		},
	];
	const links = [];
</script>

<div class="gtcell">
	<Willow>
		<Gantt {tasks} {links} />
	</Willow>
</div>

<style>
	.gtcell {
		height: 100%;
	}
</style>
```

### Toolbar, Context Menu, And Editor

```svelte
<script>
	import { Gantt, Toolbar, ContextMenu, Editor } from "@wx/svelte-gantt";

	let api = $state();
</script>

<Toolbar {api} />

<div class="gtcell">
	<ContextMenu {api}>
		<Gantt bind:this={api} {tasks} {links} {scales} undo />
	</ContextMenu>
	<Editor {api} />
</div>

<style>
	.gtcell {
		height: calc(100% - 50px);
		border-top: var(--wx-gantt-border);
	}
</style>
```

### Initialize API And Handle Actions

```svelte
<script>
	import { Gantt, Editor } from "@wx/svelte-gantt";

	let api = $state();

	function init(ganttApi) {
		api = ganttApi;

		api.on("add-task", ({ id }) => {
			api.exec("show-editor", { id });
		});

		api.intercept("sort-tasks", ev => {
			return ev.key === "text";
		});
	}
</script>

<Gantt
	{init}
	{tasks}
	{links}
	onupdatetask={ev => console.log(ev.id, ev.task)}
/>
<Editor {api} />
```

### Custom Columns And Inline Editors

```svelte
<script>
	import { Gantt } from "@wx/svelte-gantt";
	import AvatarCell from "./AvatarCell.svelte";

	const columns = [
		{ id: "text", header: "Task name", width: 220, editor: "text" },
		{ id: "assigned", header: "Assigned", width: 160, cell: AvatarCell },
		{
			id: "start",
			header: ["Start date", { filter: { type: "datepicker" } }],
			align: "center",
			width: 130,
			editor: "datepicker",
		},
		{ id: "add-task", header: "Add task", width: 50, align: "center" },
	];
</script>

<Gantt {tasks} {links} {columns} cellHeight={40} />
```

### Custom Task Content And Custom Event

```svelte
<!-- TaskContent.svelte -->
<script>
	let { data, onaction } = $props();

	function toggle(ev) {
		ev.stopPropagation();
		onaction({
			action: "custom-click",
			data: { id: data.id, clicked: !data.clicked },
		});
	}
</script>

<button onclick={toggle}>{data.clicked ? "Clicked" : "Click"}</button>
```

```svelte
<script>
	import { Gantt } from "@wx/svelte-gantt";
	import TaskContent from "./TaskContent.svelte";

	let api = $state();
</script>

<Gantt
	bind:this={api}
	{tasks}
	{links}
	taskTemplate={TaskContent}
	oncustomclick={ev =>
		api.exec("update-task", {
			id: ev.id,
			task: { clicked: ev.clicked },
		})}
/>
```

### Custom Editor Items

```svelte
<script>
	import {
		Gantt,
		Editor,
		getEditorItems,
		registerEditorItem,
		defaultTaskTypes,
	} from "@wx/svelte-gantt";
	import { RadioButtonGroup } from "@wx/svelte-core";

	registerEditorItem("radio", RadioButtonGroup);

	const base = getEditorItems();
	const items = base.map(item =>
		item.key === "type"
			? {
					key: "type",
					comp: "radio",
					label: "Type",
					options: defaultTaskTypes.map(type => ({
						...type,
						value: type.id,
					})),
					config: { type: "inline" },
				}
			: item
	);

	let api = $state();
</script>

<Gantt bind:this={api} {tasks} {links} />
<Editor {api} {items} placement="modal" autoSave={false} />
```

### Custom Menu Options

```svelte
<script>
	import {
		Gantt,
		ContextMenu,
		Editor,
		getMenuOptions,
	} from "@wx/svelte-gantt";

	let api = $state();
	const ids = ["cut-task", "copy-task", "paste-task", "delete-task"];
	const options = [
		{ id: "add-task:after", text: "Add below", icon: "wxi-plus" },
		...getMenuOptions().filter(op => ids.includes(op.id)),
		{
			id: "custom-action",
			text: "Custom action",
			icon: "wxi-empty",
			handler: () => console.log("custom action"),
		},
	];
</script>

<ContextMenu
	{api}
	{options}
	onclick={({ context, action }) => console.log(context?.id, action?.id)}
>
	<Gantt bind:this={api} {tasks} {links} />
</ContextMenu>
<Editor {api} />
```

### Scales, Zoom, Markers, And Holidays

```svelte
<script>
	import { Gantt } from "@wx/svelte-gantt";

	const scales = [
		{ unit: "year", step: 1, format: "%Y" },
		{ unit: "month", step: 1, format: "%F" },
		{ unit: "day", step: 1, format: "%j" },
	];

	const markers = [
		{ start: new Date(2026, 3, 2), text: "Start" },
		{ start: new Date(2026, 3, 8), text: "Review", css: "my-marker" },
	];

	function highlightTime(date, unit) {
		const weekend = date.getDay() === 0 || date.getDay() === 6;
		return unit === "day" && weekend ? "wx-weekend" : "";
	}
</script>

<Gantt
	{tasks}
	{links}
	{scales}
	{markers}
	{highlightTime}
	start={new Date(2026, 3, 1)}
	end={new Date(2026, 4, 1)}
	cellWidth={60}
	zoom
/>
```

### Pro Feature Bundle

```svelte
<script>
	import {
		Gantt,
		ContextMenu,
		Editor,
		Toolbar,
		Tooltip,
	} from "@wx/svelte-gantt";
	import { Calendar } from "@wx/gantt-store";
	import TooltipContent from "./TooltipContent.svelte";

	const calendar = new Calendar({
		weekHours: {
			monday: 8,
			tuesday: 8,
			wednesday: 8,
			thursday: 8,
			friday: 8,
			saturday: 0,
			sunday: 0,
		},
	});

	let api = $state();
</script>

<Toolbar {api} />
<div class="gtcell">
	<ContextMenu {api}>
		<Tooltip {api} content={TooltipContent}>
			<Gantt
				bind:this={api}
				{tasks}
				{links}
				{calendar}
				baselines
				splitTasks
				rollups={{ type: "closest" }}
				criticalPath={{ type: "flexible" }}
				summary={{ autoProgress: true }}
				undo
			/>
		</Tooltip>
	</ContextMenu>
	<Editor {api} />
</div>
```

### Server Provider And Lazy Data

```svelte
<script>
	import { Gantt, ContextMenu, Editor } from "@wx/svelte-gantt";
	import { RestDataProvider } from "@wx/gantt-data-provider";

	const provider = new RestDataProvider("/api/gantt");
	let api = $state();
	let tasks = $state([]);
	let links = $state([]);

	provider.getData().then(data => {
		tasks = data.tasks;
		links = data.links;
	});

	function init(ganttApi) {
		api = ganttApi;
		api.setNext(provider);
		api.on("request-data", ev => {
			provider.getData(ev.id).then(data => {
				api.exec("provide-data", { id: ev.id, data });
			});
		});
	}
</script>

<ContextMenu {api}>
	<Gantt {init} bind:this={api} {tasks} {links} />
</ContextMenu>
<Editor {api} />
```

## Implementation Notes

-   `Tooltip.content` is typed as receiving only `{ data }`, but source also passes `segmentIndex` for split-task segment tooltips.
-   `show-editor` public action type is `{ id: TID }`, but split-task source also passes `segmentIndex`.
-   `Gantt` mutates task objects during date normalization; clone `tasks` before passing them if caller-owned data must remain unchanged.
-   `columns` can be `false` for no grid; it is normalized to an empty column set by the store.
-   date column templates are added automatically for `start`, `end`, and `duration` unless a column has a custom `template`.
-   default `add-task` actions create `{ type: "task", text: _("New Task") }` and usually select or show the new task depending on caller.
