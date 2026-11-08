<script lang="ts">
	import { getContext, setContext, type Snippet } from "svelte";
	import { ContextMenu as BaseContextMenu } from "@svar-ui/svelte-menu";
	import type {
		IMenuOption,
		IMenuOptionClick,
		TMenuFilter,
		TMenuResolver,
	} from "@svar-ui/svelte-menu";
	import type {
		IApi,
		IOptionConfig,
		IParsedTask,
		ITask,
		TID,
	} from "@svar-ui/gantt-store";
	import {
		handleAction,
		getMenuOptions,
		isHandledAction,
		isPlaceholder,
	} from "@svar-ui/gantt-store";

	import { locale, locateID, locate } from "@svar-ui/lib-dom";
	import type { ILocale, TPosition } from "@svar-ui/lib-dom";
	import { en } from "@svar-ui/gantt-locales";
	import { en as coreEn } from "@svar-ui/core-locales";

	type TOption = IMenuOption & Pick<IOptionConfig, "isDisabled" | "isHidden">;
	type TActive = TID | { id: TID; segmentIndex: number } | null;
	type TTaskCheck = Extract<
		NonNullable<IOptionConfig["isDisabled"]>,
		(task: IParsedTask, ...rest: any[]) => boolean
	>;

	type Props = {
		options?: IMenuOption[];
		api?: IApi | null;
		resolver?: TMenuResolver | null;
		filter?: TMenuFilter | null;
		at?: TPosition;
		children?: Snippet;
		onclick?: (ev: IMenuOptionClick) => void;
		css?: string;
	};

	let {
		options = [],
		api = null,
		resolver = null,
		filter = null,
		at = "point",
		children,
		onclick,
		css,
	}: Props = $props();

	let activeId: TActive = null;
	// set locale
	let l = getContext<ILocale | undefined>("wx-i18n");
	if (!l) {
		l = locale({ ...en, ...coreEn });
		setContext("wx-i18n", l);
	}
	const _ = l.getGroup("gantt");

	let reactiveState = $derived(api?.getReactiveState());
	let { taskTypes, selected, _selected, splitTasks, summary, groupBy } =
		$derived(reactiveState || ({} as NonNullable<typeof reactiveState>));

	let config = $derived({
		splitTasks: $splitTasks,
		taskTypes: $taskTypes,
		summary: $summary,
		group: !!$groupBy?.field,
	});

	const tasks = $derived($_selected ?? []);

	const fullOptions = $derived(getMenuOptions(config));

	const customOptions = $derived(options.length ? options : null);
	const localizedOptions = $derived(
		applyLocale(customOptions ?? fullOptions)
	);

	function cloneMenuItems(items: TOption[]): TOption[] {
		return items.map(op => {
			const copy = { ...op };
			if (op.data) copy.data = cloneMenuItems(op.data);
			return copy;
		});
	}

	function applyLocale(options: TOption[]): TOption[] {
		return options.map(op => {
			op = { ...op };
			if (op.text) op.text = _(op.text);
			if (op.subtext) op.subtext = _(op.subtext);
			if (op.data) op.data = applyLocale(op.data);
			return op;
		});
	}

	function buildOptions() {
		if (!api) return [];
		const items = cloneMenuItems(localizedOptions);
		const setDisabled = (data: TOption[]) => {
			data.forEach(item => {
				if (item.isDisabled) {
					item.disabled = tasks.some(task =>
						(item.isDisabled as TTaskCheck)(
							task as IParsedTask,
							api.getState(),
							api.getTaskCalendar(task),
							activeId!
						)
					);
				}
				if (item.data) setDisabled(item.data);
			});
		};
		setDisabled(items);
		return items;
	}

	function itemResolver(id: TID, ev: MouseEvent) {
		if (
			locate(
				ev.target as Element,
				"data-menu-ignore"
			)?.classList.contains("wx-resource-load") ||
			isPlaceholder(id)
		)
			return null;

		let task: ITask | null = id ? api!.getTask(id) : null;
		if (resolver) {
			const result = resolver(id, ev);
			task = result === true ? task : result;
		}
		if (task) {
			const segmentIndex = locateID(ev.target as Element, "data-segment");
			if (segmentIndex !== null)
				activeId = {
					id: task.id!,
					segmentIndex: segmentIndex as number,
				};
			else activeId = task.id!;

			if (!$selected!.includes(task.id!)) {
				api!.exec("select-task", { id: task.id! });
			}

			menuOptions = buildOptions();
		}

		return task;
	}

	function menuAction(ev: IMenuOptionClick) {
		const action = ev.action;
		if (action) {
			const isAction = isHandledAction(fullOptions, action.id!);
			if (isAction) handleAction(api, action.id as string, activeId, _);
			onclick?.(ev);
		}
	}

	function filterMenu(item: TOption) {
		if (!api) return true;
		let result = filter ? tasks.every(task => filter(item, task)) : true;

		if (result) {
			if (item.isHidden)
				result = !tasks.some(task =>
					item.isHidden!(
						task as IParsedTask,
						api.getState(),
						activeId!
					)
				);
		}
		return result;
	}

	let subscribed = false;
	$effect(() => {
		if (api && !subscribed) {
			subscribed = true;
			api.on("scroll-chart", () => menu!.show(null));
			api.on("drag-task", () => menu!.show(null));
		}
	});

	// built imperatively before the menu opens, not derived from the store (avoids rebuild churn on every store tick)
	let menuOptions = $state<TOption[]>([]);

	let menu = $state<ReturnType<typeof BaseContextMenu>>();
	export function show(ev?: MouseEvent | null, obj?: any) {
		menuOptions = buildOptions();
		menu!.show(ev!, obj);
	}
</script>

<BaseContextMenu
	filter={filterMenu}
	options={menuOptions}
	dataKey={"id"}
	resolver={itemResolver}
	onclick={menuAction}
	{css}
	{at}
	bind:this={menu}
/>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	style="display: contents"
	oncontextmenu={menu!.show}
	data-menu-ignore="true"
>
	{@render children?.()}
</div>

<style>
	:global(.wx-menu .wx-option.wx-disabled) {
		pointer-events: none;
	}
	:global(.wx-menu .wx-option.wx-disabled .wx-value),
	:global(.wx-menu .wx-option.wx-disabled .wx-icon) {
		color: var(--wx-color-font-disabled);
	}
</style>
