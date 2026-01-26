<script>
	import { getContext } from "svelte";

	import { locate, locateID } from "@svar-ui/lib-dom";
	import { getID } from "../../helpers/locate";
	import Links from "./Links.svelte";
	import { Button } from "@svar-ui/svelte-core";
	import { isSegmentMoveAllowed, extendDragOptions } from "@svar-ui/gantt-store";

	let { readonly, taskTemplate } = $props();

	const api = getContext("gantt-store");

	import BarSegments from "./BarSegments.svelte";

	const {
		_tasks: rTasks,
		_links: rLinks,
		area,
		_scales: scales,
		taskTypes,
		baselines,
		_selected: selected,
		_scrollTask: scrollTask,
		criticalPath,
		tasks: tree,
		schedule,
		splitTasks,
		summary,
	} = api.getReactiveState();

	// let tasks = $derived($rTasks.slice($area.start, $area.end));
	// FIXME:SVELTE5
	let tasks = $derived(
		$rTasks.slice($area.start, $area.end).map(a => ({ ...a }))
	);

	let lengthUnitWidth = $derived($scales.lengthUnitWidth);
	let ignoreNextClick = false;

	// link creation
	let linkFrom = $state();
	// task moving
	let taskMove = $state(null);
	let progressFrom = null;

	let selectedLinkId = $state(null);
	let selectedLink = $derived(
		selectedLinkId && {
			...$rLinks.find(link => link.id === selectedLinkId),
		}
	);

	let touched = $state();
	let touchTimer;

	function mousedown(e) {
		if (e.button !== 0) return;

		const node = locate(e);
		if (!node) return;

		down(node, e);
	}

	function touchstart(e) {
		const node = locate(e);
		if (node) {
			touchTimer = setTimeout(() => {
				touched = true;
				down(node, e.touches[0]);
			}, 300);
		}
	}

	function down(node, point) {
		const { clientX } = point;
		const id = getID(node);
		const task = api.getTask(id);
		const css = point.target.classList;
		if (point.target.closest(".wx-delete-button")) return;
		if (!readonly) {
			if (css.contains("wx-progress-marker")) {
				const { progress } = api.getTask(id);
				progressFrom = {
					id,
					x: clientX,
					progress,
					dx: 0,
					node,
					marker: point.target,
				};
				point.target.classList.add("wx-progress-in-drag");
			} else {
				const mode = getMoveMode(node, point, task) || "move";

				taskMove = {
					id,
					mode,
					x: clientX,
					dx: 0,
					l: task.$x,
					w: task.$w,
				};

				if ($splitTasks && task.segments?.length) {
					const segNode = locate(point, "data-segment");
					if (segNode) {
						taskMove.segmentIndex = segNode.dataset["segment"] * 1;
						extendDragOptions(task, taskMove);
					}
				}
			}
			startDrag();
		}
	}

	function getMoveMode(node, e, task) {
		if (e.target.classList.contains("wx-line")) return "";
		if (!task) task = api.getTask(getID(node));
		if (task.type === "milestone" || task.type === "summary") return "";

		const segmentNode = locate(e, "data-segment");
		if (segmentNode) node = segmentNode;

		const { left, width } = node.getBoundingClientRect();
		const p = (e.clientX - left) / width;
		let delta = 0.2 / (width > 200 ? width / 200 : 1);
		if (p < delta) return "start";
		if (p > 1 - delta) return "end";
		return "";
	}

	function touchmove(e) {
		if (touched) {
			e.preventDefault();
			move(e, e.touches[0]);
		} else if (touchTimer) {
			clearTimeout(touchTimer);
			touchTimer = null;
		}
	}

	function mousemove(e) {
		move(e, e);
	}

	function move(e, point) {
		const { clientX } = point;

		if (!readonly) {
			if (progressFrom) {
				const { node, x, id } = progressFrom;
				const dx = (progressFrom.dx = clientX - x);

				const diff = Math.round((dx / node.offsetWidth) * 100);
				let progress = progressFrom.progress + diff;
				progressFrom.value = progress = Math.min(
					Math.max(0, progress),
					100
				);

				api.exec("update-task", {
					id,
					task: { progress },
					inProgress: true,
				});
			} else if (taskMove) {
				onSelectLink(null);
				const { mode, l, w, x, id, start, segment, index } = taskMove;
				const task = api.getTask(id);
				const dx = clientX - x;
				const minWidth = Math.round(lengthUnitWidth) || 1;
				if (
					(!start && Math.abs(dx) < 20) ||
					(mode === "start" && w - dx < minWidth) ||
					(mode === "end" && w + dx < minWidth) ||
					(mode === "move" &&
						((dx < 0 && l + dx < 0) ||
							(dx > 0 && l + w + dx > totalWidth))) ||
					(taskMove.segment && !isSegmentMoveAllowed(task, taskMove))
				)
					return;

				taskMove.dx = dx;

				let left, width;
				if (mode === "start") {
					left = l + dx;
					width = w - dx;
				} else if (mode === "end") {
					left = l;
					width = w + dx;
				} else if (mode === "move") {
					left = l + dx;
					width = w;
				}

				api.exec("drag-task", {
					id,
					width: width,
					left: left,
					inProgress: true,
					start,
					...(segment && { segmentIndex: index }),
				});

				//dnd may be blocked, check positions
				if (
					!taskMove.start &&
					((mode === "move" && task.$x == l) ||
						(mode !== "move" && task.$w == w))
				) {
					ignoreNextClick = true;
					return up();
				}
				taskMove.start = true;
			} else {
				const taskNode = locate(e);
				if (taskNode) {
					const task = api.getTask(getID(taskNode));
					const segNode = locate(e, "data-segment");
					const barNode = segNode || taskNode;
					const mode = getMoveMode(barNode, point, task);
					barNode.style.cursor =
						mode && !readonly ? "col-resize" : "pointer";
				}
			}
		}
	}

	function mouseup() {
		up();
	}

	function touchend() {
		touched = null;
		if (touchTimer) {
			clearTimeout(touchTimer);
			touchTimer = null;
		}

		up();
	}

	function up() {
		if (progressFrom) {
			const { dx, id, marker, value } = progressFrom;
			progressFrom = null;
			if (typeof value != "undefined" && dx)
				api.exec("update-task", {
					id,
					task: { progress: value },
					inProgress: false,
				});
			marker.classList.remove("wx-progress-in-drag");

			ignoreNextClick = true;
			endDrag();
		} else if (taskMove) {
			const { id, mode, dx, l, w, start, segment, index } = taskMove;
			taskMove = null;
			if (start) {
				const diff = Math.round(dx / lengthUnitWidth);

				if (!diff) {
					// restore node and link position
					api.exec("drag-task", {
						id,
						width: w,
						left: l,
						inProgress: false,
						...(segment && { segmentIndex: index }),
					});
				} else {
					let update = {};
					let task = api.getTask(id);
					if (segment) task = task.segments[index];

					if (mode === "move") {
						update.start = task.start;
						update.end = task.end;
					} else update[mode] = task[mode];

					api.exec("update-task", {
						id,
						diff,
						task: update,
						...(segment && { segmentIndex: index }),
					});
				}
				ignoreNextClick = true;
			}

			endDrag();
		}
	}

	function startDrag() {
		document.body.style.userSelect = "none";
	}
	function endDrag() {
		document.body.style.userSelect = "";
	}

	function onDblClick(e) {
		if (!readonly) {
			const id = locateID(e.target);
			if (id && !e.target.classList.contains("wx-link")) {
				const segmentIndex = locateID(e.target, "data-segment");
				api.exec("show-editor", {
					id,
					...(segmentIndex !== null && { segmentIndex }),
				});
			}
		}
	}
	function onClick(e) {
		if (ignoreNextClick) {
			ignoreNextClick = false;
			return;
		}

		const id = locateID(e.target);
		if (id) {
			const css = e.target.classList;
			if (css.contains("wx-link")) {
				const toStart = css.contains("wx-left");
				if (!linkFrom) {
					linkFrom = { id, start: toStart };
					return;
				}

				if (linkFrom.id !== id && !alreadyLinked(id, toStart)) {
					api.exec("add-link", {
						link: {
							source: linkFrom.id,
							target: id,
							type: getLinkType(linkFrom.start, toStart),
						},
					});
				}
			} else if (css.contains("wx-delete-button-icon")) {
				api.exec("delete-link", { id: selectedLinkId });
				selectedLinkId = null;
			} else {
				let segmentIndex;
				const segmentNode = locate(e, "data-segment");
				if (segmentNode) segmentIndex = segmentNode.dataset.segment * 1;
				api.exec("select-task", {
					id,
					toggle: e.ctrlKey || e.metaKey,
					range: e.shiftKey,
					segmentIndex,
				});
			}
		}
		removeLinkMarker();
	}

	function taskStyle(task) {
		return `left:${task.$x}px;top:${task.$y}px;width:${task.$w}px;height:${task.$h}px;`;
	}

	function baselineStyle(task) {
		return `left:${task.$x_base}px;top:${task.$y_base}px;width:${task.$w_base}px;height:${task.$h_base}px;`;
	}

	function contextmenu(ev) {
		if (touched || touchTimer) {
			ev.preventDefault();
			return false;
		}
	}

	const types = ["e2s", "s2s", "e2e", "s2e"];
	function getLinkType(fromStart, toStart) {
		return types[(fromStart ? 1 : 0) + (toStart ? 0 : 2)];
	}

	function alreadyLinked(target, toStart) {
		const source = linkFrom.id;
		const fromStart = linkFrom.start;

		if (target === source) return true;

		return $rLinks.find(l => {
			return (
				l.target == target &&
				l.source == source &&
				l.type === getLinkType(fromStart, toStart)
			);
		});
	}

	function removeLinkMarker() {
		if (linkFrom) {
			linkFrom = null;
		}
	}

	function onSelectLink(id) {
		selectedLinkId = id;
	}

	const taskTypeIds = $derived($taskTypes.map(t => t.id));
	function taskTypeCss(type) {
		let css = taskTypeIds.includes(type) ? type : "task";
		if (!["task", "milestone", "summary"].includes(type)) {
			css = `task ${css}`;
		}
		return css;
	}

	function forward(ev) {
		api.exec(ev.action, ev.data);
	}

	let totalWidth = $state(0);

	// focus selected
	let container = $state();
	const hasFocus = $derived(
		$selected.length &&
			container &&
			container.contains(document.activeElement)
	);
	const focused = $derived(hasFocus && $selected[$selected.length - 1].id);
	scrollTask.subscribe(value => {
		if (hasFocus && value) {
			const { id } = value;
			const node = container.querySelector(`.wx-bar[data-id='${id}']`);
			if (node) node.focus();
		}
	});

	const isTaskCritical = taskId => {
		return criticalPath && $tree.byId(taskId).$critical;
	};
	function isLinkMarkerVisible(id) {
		if ($schedule.auto) {
			const summaryIds = $tree.getSummaryId(id, true);
			const linkFromSummaryIds = $tree.getSummaryId(linkFrom.id, true);
			return (
				linkFrom?.id &&
				!(
					Array.isArray(summaryIds) ? summaryIds : [summaryIds]
				).includes(linkFrom.id) &&
				!(
					Array.isArray(linkFromSummaryIds)
						? linkFromSummaryIds
						: [linkFromSummaryIds]
				).includes(id)
			);
		}
		return linkFrom;
	}
</script>

<svelte:window onmouseup={mouseup} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="wx-bars"
	style="line-height: {tasks.length ? tasks[0].$h : 0}px"
	bind:offsetWidth={totalWidth}
	bind:this={container}
	oncontextmenu={contextmenu}
	onmousedown={mousedown}
	onmousemove={mousemove}
	ontouchstart={touchstart}
	ontouchmove={touchmove}
	ontouchend={touchend}
	onclick={onClick}
	ondblclick={onDblClick}
	ondragstart={() => false}
>
	<Links {onSelectLink} {selectedLink} {readonly} />
	{#each tasks as task (task.id)}
		{#if !task.$skip}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div
				class="wx-bar wx-{taskTypeCss(task.type)}"
				class:wx-touch={touched && taskMove && task.id == taskMove.id}
				class:wx-selected={linkFrom && linkFrom.id === task.id}
				class:wx-critical={isTaskCritical(task.id)}
				class:wx-reorder-task={task.$reorder}
				class:wx-split={$splitTasks && task.segments}
				style={taskStyle(task)}
				data-tooltip-id={task.id}
				data-id={task.id}
				tabindex={focused === task.id ? "0" : "-1"}
			>
				{#if !readonly}
					{#if task.id === selectedLink?.target && selectedLink?.type[2] === "s"}
						<Button
							type="danger"
							css="wx-left wx-delete-button wx-delete-link"
						>
							<i class="wxi-close wx-delete-button-icon"></i>
						</Button>
					{:else}
						<div
							class="wx-link wx-left"
							class:wx-visible={linkFrom}
							class:wx-target={!linkFrom ||
								(!alreadyLinked(task.id, true) &&
									isLinkMarkerVisible(task.id))}
							class:wx-selected={linkFrom &&
								linkFrom.id === task.id &&
								linkFrom.start}
							class:wx-critical={isTaskCritical(task.id)}
						>
							<div class="wx-inner"></div>
						</div>
					{/if}
				{/if}

				{#if task.type !== "milestone"}
					{#if task.progress && !($splitTasks && task.segments)}
						<div class="wx-progress-wrapper">
							<div
								class="wx-progress-percent"
								style="width:{task.progress}%"
							></div>
						</div>
					{/if}
					{#if !readonly && !($splitTasks && task.segments) && !(task.type == "summary" && $summary?.autoProgress)}
						<div
							class="wx-progress-marker"
							style="left:calc({task.progress}% - 10px);"
						>
							{task.progress}
						</div>
					{/if}
					{#if taskTemplate}
						{@const SvelteComponent = taskTemplate}
						<SvelteComponent data={task} {api} onaction={forward} />
					{:else if $splitTasks && task.segments}
						<BarSegments {task} type={taskTypeCss(task.type)} />
					{:else}
						<div class="wx-content">{task.text || ""}</div>
					{/if}
				{:else}
					<div class="wx-content"></div>
					{#if taskTemplate}
						{@const SvelteComponent_1 = taskTemplate}
						<SvelteComponent_1
							data={task}
							{api}
							onaction={forward}
						/>
					{:else}
						<div class="wx-text-out">{task.text}</div>
					{/if}
				{/if}

				{#if !readonly}
					{#if task.id === selectedLink?.target && selectedLink?.type[2] === "e"}
						<Button
							type="danger"
							css="wx-right wx-delete-button wx-delete-link"
						>
							<i class="wxi-close wx-delete-button-icon"></i>
						</Button>
					{:else}
						<div
							class="wx-link wx-right"
							class:wx-visible={linkFrom}
							class:wx-target={!linkFrom ||
								(!alreadyLinked(task.id, false) &&
									isLinkMarkerVisible(task.id))}
							class:wx-selected={linkFrom &&
								linkFrom.id === task.id &&
								!linkFrom.start}
							class:wx-critical={isTaskCritical(task.id)}
						>
							<div class="wx-inner"></div>
						</div>
					{/if}
				{/if}
			</div>
		{/if}
		{#if $baselines && !task.$skip_baseline}
			<div
				class="wx-baseline"
				class:wx-milestone={task.type === "milestone"}
				style={baselineStyle(task)}
			></div>
		{/if}
	{/each}
</div>

<style>
	.wx-baseline {
		position: absolute;
		background-color: #a883e4;
		border-radius: var(--wx-gantt-baseline-border-radius);
		z-index: 1;
	}
	.wx-baseline.wx-milestone {
		transform: rotate(45deg) scale(0.75);
		border-radius: var(--wx-gantt-milestone-border-radius);
	}
	.wx-bars {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.wx-bar,
	.wx-bar :global(.wx-segment) {
		pointer-events: all;
		box-sizing: border-box;
		position: absolute;
		border-radius: var(--wx-gantt-bar-border-radius);
		font: var(--wx-gantt-bar-font);
		white-space: nowrap;
		line-height: inherit;
		text-align: center;
		cursor: pointer;

		-webkit-tap-highlight-color: rgba(0, 0, 0, 0);
	}

	.wx-bar.wx-touch {
		opacity: 0.5;
	}

	.wx-bar.wx-reorder-task {
		z-index: 3;
	}
	.wx-bar :global(.wx-content) {
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.wx-task:not(.wx-split),
	.wx-task :global(.wx-segment) {
		color: var(--wx-gantt-task-font-color);
		background-color: var(--wx-gantt-task-color);
		border: var(--wx-gantt-task-border);
	}

	.wx-task.wx-selected:not(.wx-split) {
		border: 1px solid var(--wx-gantt-task-border-color);
		box-shadow: var(--wx-gantt-bar-shadow);
	}

	.wx-task:not(.wx-split):hover,
	.wx-task :global(.wx-segment:hover) {
		box-shadow: var(--wx-gantt-bar-shadow);
	}

	.wx-summary {
		color: var(--wx-gantt-summary-font-color);
		background-color: var(--wx-gantt-summary-color);
		border: var(--wx-gantt-summary-border);
	}

	.wx-summary.wx-selected {
		border: 1px solid var(--wx-gantt-summary-border-color);
		box-shadow: var(--wx-gantt-bar-shadow);
	}

	.wx-summary:hover {
		box-shadow: var(--wx-gantt-bar-shadow);
	}

	.wx-milestone .wx-content {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 2;
	}

	.wx-bar:not(.wx-milestone) :global(.wx-content) {
		position: relative;
		z-index: 2;
	}

	.wx-bars :global(.wx-text-out) {
		position: absolute;
		line-height: normal;
		display: block;
		color: var(--wx-color-font);
		pointer-events: none;
	}

	.wx-milestone {
		border-color: var(--wx-gantt-milestone-color);
	}

	.wx-milestone .wx-text-out {
		padding: 0 2px;
		left: 100%;
	}

	.wx-milestone .wx-content {
		height: 100%;
		background-color: var(--wx-gantt-milestone-color);
		transform: rotate(45deg) scale(0.75);
		border-radius: var(--wx-gantt-milestone-border-radius);
	}

	.wx-bar :global(.wx-progress-wrapper) {
		position: absolute;
		width: 100%;
		height: 100%;
		background-color: transparent;
		border-radius: var(--wx-gantt-bar-border-radius);
		overflow: hidden;
	}

	.wx-bar :global(.wx-progress-percent) {
		height: 100%;
	}

	.wx-progress-marker {
		opacity: 0;
		position: absolute;
		top: 80%;
		width: var(--wx-icon-size);
		height: var(--wx-gantt-progress-marker-height);
		background: var(--wx-gantt-progress-border-color);
		clip-path: polygon(50% 0, 100% 30%, 100% 100%, 0 100%, 0 30%);
		color: var(--wx-color-font);
		z-index: 3;
		font-size: calc(var(--wx-font-size-sm) - 2px);
		border-radius: 4px;
		cursor: ew-resize;
		text-align: center;
		line-height: 3;
	}
	.wx-progress-marker::before {
		content: "";
		display: block;
		position: absolute;
		width: calc(var(--wx-icon-size) - 2px);
		height: calc(var(--wx-gantt-progress-marker-height) - 2px);
		clip-path: polygon(50% 0, 100% 30%, 100% 100%, 0 100%, 0 30%);
		top: 1px;
		left: 1px;
		background: var(--wx-gantt-link-marker-background);
		z-index: -1;
		border-radius: 4px;
	}
	.wx-bar:hover .wx-progress-marker,
	.wx-progress-marker.wx-progress-in-drag {
		opacity: 1;
	}

	.wx-task .wx-progress-percent {
		background-color: var(--wx-gantt-task-fill-color);
	}

	.wx-summary .wx-progress-percent {
		background-color: var(--wx-gantt-summary-fill-color);
	}

	.wx-link {
		position: absolute;
		z-index: 4;
		top: 50%;
		transform: translateY(-50%);
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 1px solid var(--wx-gantt-link-marker-color);
		background-color: var(--wx-gantt-link-marker-background);
		opacity: 0;
		cursor: default;
	}

	.wx-link .wx-inner {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: 4px solid var(--wx-gantt-link-marker-color);
		pointer-events: none;
	}

	.wx-bar :global(button.wx-button.wx-delete-button) {
		position: absolute;
		z-index: 4;
		top: 50%;
		transform: translateY(-50%);
		width: 16px;
		height: 16px;
		padding: 0;
	}
	.wx-delete-button-icon {
		display: block;
		line-height: 14px;
		font-size: 10px;
	}
	.wx-bar :global(.wx-delete-button.wx-left),
	.wx-link.wx-left {
		left: -16px;
	}
	.wx-bar :global(.wx-delete-button.wx-right),
	.wx-link.wx-right {
		right: -16px;
	}
	.wx-link.wx-target:hover,
	.wx-link.wx-selected,
	.wx-bar:hover .wx-link.wx-target,
	.wx-link.wx-visible.wx-target {
		opacity: 1;
		cursor: pointer;
	}

	.wx-bar:not(.wx-split) .wx-link.wx-selected {
		border-color: inherit;
	}
	.wx-bar:not(.wx-split) .wx-link.wx-selected .wx-inner {
		border-color: inherit;
	}

	.wx-milestone .wx-link.wx-left {
		left: -16px;
	}
	.wx-milestone .wx-link.wx-right {
		right: -16px;
	}

	.wx-cut {
		opacity: 50%;
	}
	.wx-bar:not(.wx-milestone):focus {
		outline: 1px solid var(--wx-color-primary);
		outline-offset: 1px;
	}
	.wx-milestone:focus {
		outline: none;
	}
	.wx-milestone:focus .wx-content {
		outline: 1px solid var(--wx-color-primary);
		outline-offset: 1.6px;
	}
	/* critical path markers */
	.wx-task.wx-critical {
		background-color: var(--wx-gantt-task-critical-color);
	}
	.wx-task.wx-critical.wx-selected {
		border: 1px solid var(--wx-gantt-task-critical-color);
	}
	.wx-task.wx-critical .wx-progress-percent {
		background-color: var(--wx-gantt-task-critical-fill-color);
	}
	.wx-milestone.wx-critical .wx-content {
		background-color: var(--wx-gantt-critical-color);
	}
	.wx-milestone.wx-critical {
		border-color: var(--wx-gantt-critical-color);
	}
	.wx-summary.wx-critical {
		background-color: var(--wx-gantt-summary-critical-color);
	}
	.wx-summary.wx-critical .wx-progress-percent {
		background-color: var(--wx-gantt-summary-critical-fill-color);
	}
	.wx-summary.wx-critical.wx-selected {
		border: 1px solid var(--wx-gantt-summary-critical-color);
	}

	/*split tasks*/
	.wx-split.wx-selected {
		border-color: var(--wx-gantt-task-border-color);
	}
	.wx-bars .wx-split.wx-bar {
		background: transparent;
		border-color: transparent;
	}
	.wx-split .wx-link.wx-selected,
	.wx-split .wx-link.wx-selected .wx-inner {
		border-color: var(--wx-gantt-task-border-color);
	}

	.wx-critical :global(.wx-segment) {
		background-color: var(--wx-gantt-task-critical-color);
	}
	.wx-critical.wx-selected :global(.wx-segment) {
		border: 1px solid var(--wx-gantt-task-critical-color);
	}
	.wx-critical :global(.wx-segment .wx-progress-percent) {
		background-color: var(--wx-gantt-task-critical-fill-color);
	}
	.wx-critical.wx-split .wx-link.wx-selected,
	.wx-critical.wx-split .wx-link.wx-selected .wx-inner {
		border-color: var(--wx-gantt-task-critical-color);
	}
</style>
