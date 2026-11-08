<script lang="ts">
	// svelte core
	import { getContext, type Component } from "svelte";
	import { hotkeys } from "@svar-ui/grid-store";
	import type { IApi as ITableApi } from "@svar-ui/svelte-grid";
	import { toggleGridChart, toggleChartSubGrid } from "@svar-ui/gantt-store";
	import type { TColumnSection, TDisplayPanel } from "@svar-ui/gantt-store";
	import type { IInnerApi, ITaskTemplateProps } from "../types";

	// views
	import Grid from "./grid/Grid.svelte";
	import Chart from "./chart/Chart.svelte";
	import Resizer from "./Resizer.svelte";

	import { getResizerUi } from "../helpers/resizer";

	type Props = {
		taskTemplate?: Component<ITaskTemplateProps> | null;
		readonly?: boolean;
		tableAPI?: ITableApi;
		subGridTableAPI?: ITableApi;
	};

	let {
		taskTemplate,
		readonly,
		tableAPI = $bindable(),
		subGridTableAPI = $bindable(),
	}: Props = $props();

	let ganttWidth = $state<number>();

	const api = getContext<IInnerApi>("gantt-store");

	const {
		_tasks: rTasks,
		_scales: rScales,
		cellHeight: rCellHeight,
		_columns: rColumns,
		scrollTop: rScrollTop,
		undo,
		_columnsWidth,
		gridWidth,
		subGridWidth,
		_displayPanels,
		_compactMode,
	} = api.getReactiveState();

	const hasSubGrid = $derived($rColumns!.some(c => c.section === "subGrid"));
	let drag = $state<{
		section: TColumnSection;
		panels: TDisplayPanel[];
	} | null>(null);
	const layoutPanels = $derived(drag?.panels ?? $_displayPanels);
	const subGridVisible = $derived($_displayPanels!.includes("subGrid"));
	const chartVisible = $derived($_displayPanels!.includes("chart"));
	const showSubGridResizer = $derived(
		hasSubGrid && (chartVisible || drag?.section === "subGrid")
	);
	// 4px per resizer; the subGrid one is shown only next to the chart
	const resizerWidth = $derived(hasSubGrid && chartVisible ? 8 : 4);
	const effectiveSubGridWidth = $derived(subGridVisible ? $subGridWidth! : 0);

	const gridChartResizerUi = $derived(
		getResizerUi("gridChart", layoutPanels!, $_compactMode)
	);

	const subGridResizerUi = $derived(
		getResizerUi("subGrid", layoutPanels!, $_compactMode)
	);

	let ganttHeight = $state<number>();
	let innerWidth = $state<number>();

	const scrollSize = $derived(ganttWidth! - innerWidth!);

	const fullWidth = $derived($rScales!.width);
	const fullHeight = $derived($rTasks!.length * $rCellHeight!);
	const scrollHeight = $derived($rScales!.height + fullHeight + scrollSize);

	function startDrag(section: TColumnSection) {
		drag = { section, panels: [...$_displayPanels!] };
	}

	function resizeGrid(
		section: TColumnSection,
		width: number,
		commit?: boolean
	) {
		api.exec("resize-grid", { width, section, inProgress: !commit });
		if (commit) drag = null;
	}

	function onExpandStart() {
		api.exec("set-display-mode", {
			mode: toggleGridChart($_displayPanels!, "start", $_compactMode),
		});
	}
	function onExpandEnd() {
		api.exec("set-display-mode", {
			mode: toggleGridChart($_displayPanels!, "end", $_compactMode),
		});
	}

	function toggleSubGridStart() {
		api.exec("set-display-mode", {
			mode: toggleChartSubGrid($_displayPanels!, "start", $_compactMode),
		});
	}
	function toggleSubGridEnd() {
		api.exec("set-display-mode", {
			mode: toggleChartSubGrid($_displayPanels!, "end", $_compactMode),
		});
	}

	$effect(() => {
		if (ganttWidth == null || drag) return;

		const width =
			ganttHeight != null && chartVisible
				? ganttWidth -
					$_columnsWidth! -
					effectiveSubGridWidth -
					resizerWidth -
					scrollSize
				: 0;
		const height = ganttHeight != null ? ganttHeight - $rScales!.height : 0;

		api.exec("resize-chart", {
			width,
			height,
			scrollSize,
			ganttWidth,
		});
	});

	// scroll
	let ganttDiv = $state<HTMLElement>();

	function onScroll() {
		api.exec("scroll-chart", {
			top: ganttDiv!.scrollTop,
		});
	}
	//[FIXME] don't use this effect it in react
	function syncScroll() {
		if (ganttDiv && $rScrollTop !== ganttDiv.scrollTop)
			ganttDiv.scrollTop = $rScrollTop!;
	}

	$effect(() => {
		void $rScrollTop;
		syncScroll();
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="wx-gantt"
	bind:this={ganttDiv}
	bind:offsetHeight={ganttHeight}
	bind:offsetWidth={ganttWidth}
	onscroll={onScroll}
>
	<div
		class="wx-pseudo-rows"
		style="height:{scrollHeight}px;width:100%;"
		bind:offsetWidth={innerWidth}
	>
		<div
			class="wx-stuck"
			style="height:{ganttHeight}px;width:{innerWidth}px;"
		>
			<div
				tabindex="0"
				class="wx-layout"
				use:hotkeys={{
					keys: {
						"ctrl+c": true,
						"ctrl+v": true,
						"ctrl+x": true,
						"ctrl+d": true,
						backspace: true,
						"ctrl+z": $undo!,
						"ctrl+y": $undo!,
					},
					exec: ev => {
						if (!ev.isInput) api.exec("hotkey", ev);
					},
				}}
			>
				{#if $rColumns!.length}
					<Grid {readonly} bind:tableAPI />
					<Resizer
						side="left"
						panelWidth={$gridWidth}
						{...gridChartResizerUi}
						onResizeStart={() => startDrag("grid")}
						onResize={(width: number) => resizeGrid("grid", width)}
						onResizeEnd={(width: number) =>
							resizeGrid("grid", width, true)}
						{onExpandStart}
						{onExpandEnd}
					/>
				{/if}

				<div class="wx-content" class:wx-content-visible={chartVisible}>
					<Chart {readonly} {fullWidth} {fullHeight} {taskTemplate} />
				</div>

				{#if hasSubGrid && showSubGridResizer}
					<!-- Mounted only while chart is open; grid+subGrid uses grid/chart resizer -->
					<Resizer
						side="right"
						panelWidth={$subGridWidth}
						resizeInvert
						{...subGridResizerUi}
						onResizeStart={() => startDrag("subGrid")}
						onResize={(width: number) =>
							resizeGrid("subGrid", width)}
						onResizeEnd={(width: number) =>
							resizeGrid("subGrid", width, true)}
						onExpandStart={toggleSubGridStart}
						onExpandEnd={toggleSubGridEnd}
					/>
				{/if}
				{#if hasSubGrid && subGridVisible}
					<Grid
						section="subGrid"
						{readonly}
						bind:tableAPI={subGridTableAPI}
					/>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.wx-gantt {
		height: 100%;
		width: 100%;
		overflow-y: auto;
	}
	.wx-pseudo-rows {
		width: 100%;
		height: auto;
		min-height: 100%;
	}
	.wx-stuck {
		position: sticky;
		top: 0;
		height: 100%;
		width: 100%;
		max-height: 100%;
	}
	.wx-layout {
		position: relative;
		display: flex;
		max-height: 100%;
		max-width: 100%;
		background-color: var(--wx-background);
		overflow: hidden;
		outline: none;
		height: 100%;
	}

	.wx-content {
		position: relative;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		/* Keep Chart mounted when hidden without claiming layout space */
		flex: 0 0 0;
		width: 0;
		min-width: 0;
	}

	.wx-content-visible {
		/* basis 0 so chart content width cannot crush resizers */
		flex: 1 1 0;
		width: auto;
		min-width: 0;
	}
</style>
