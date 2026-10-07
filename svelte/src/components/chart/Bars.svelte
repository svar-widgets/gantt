<script>
	import { getContext } from "svelte";

	import { locate, locateID, getID, setID } from "@svar-ui/lib-dom";
	import Links from "./Links.svelte";
	import Rollups from "./Rollups.svelte";
	import BarSegments from "./BarSegments.svelte";
	import { Button } from "@svar-ui/svelte-core";
	import {
		isSegmentMoveAllowed,
		extendDragOptions,
		calcScaleCellDate,
		getDiffer,
	} from "@svar-ui/gantt-store";
	import { getUnitStart, getTaskAtRow } from "../../helpers/chart.js";

	let { readonly, taskTemplate } = $props();

	const _ = getContext("wx-i18n").getGroup("gantt");
	const api = getContext("gantt-store");

	const {
		_tasks: rTasks,
		_links: rLinks,
		area,
		_scales: scales,
		taskTypes,
		baselines,
		_selected: selected,
		rollups,
		_rollups: rRollups,
		focusTask,
		criticalPath,
		schedule,
		splitTasks,
		summary,
		slack,
		cellHeight,
		unscheduledTasks,
		inactiveTasks,
		deadlines,
		_conflicts,
		placeholderRow,
		durationUnit,
	} = api.getReactiveState();

	/** Hide constraint badge when it collides with the deadline marker. */
	const CONSTRAINT_DEADLINE_COLLISION = 48;

	let constraintViolated = $derived($_conflicts?.constraints);

	function isConstraintCompact(task) {
		if (
			typeof task.$x_constraint !== "number" ||
			typeof task.$x_deadline !== "number"
		)
			return false;
		return (
			Math.abs(task.$x_constraint - task.$x_deadline) <
			CONSTRAINT_DEADLINE_COLLISION
		);
	}

	// let tasks = $derived($rTasks.slice($area.start, $area.end));
	// FIXME:SVELTE5
	let tasks = $derived(
		$rTasks.slice($area.start, $area.end).map(a => ({ ...a }))
	);

	let lengthUnitWidth = $derived($scales.lengthUnitWidth);
	let ignoreNextClick = false;

	// link creation
	let linkFrom = $state();
	let linkValidator = null;
	// task moving
	let taskMove = $state(null);
	// task scheduling
	let taskSchedule = $state(null);
	let progressFrom = null;

	let selectedLinkId = $state(null);
	let selectedLink = $derived(
		selectedLinkId && {
			...$rLinks.find(link => link.id === selectedLinkId),
		}
	);

	// grouping tasks by "resource" duplicates tasks
	// to show a task for each assigned resource
	let hasDuplicatedIds = $derived(
		tasks.some(task => task.$id && task.$id !== task.id)
	);

	let touched = $state();
	let touchTimer;

	function mousedown(e) {
		if (e.button !== 0) return;

		const node = locate(e);
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

	function getTaskAtY(clientY, rect = container.getBoundingClientRect()) {
		return getTaskAtRow($rTasks, clientY - rect.top, $cellHeight);
	}

	function canScheduleTask(task) {
		if (!task) return false;
		if (task.$placeholder) return $placeholderRow;
		return (
			$unscheduledTasks &&
			task.unscheduled &&
			(task.type === "task" || task.type === "milestone") &&
			!task.$group
		);
	}

	function isScheduleWorkingDay(task, left) {
		const date = calcScaleCellDate(left, api.getState());
		const calendar = api.getTaskCalendar(task);
		if (calendar) return calendar.isWorkingDay(date);

		return true;
	}

	function getUnitStartY(y) {
		return Math.trunc(y / $cellHeight) * $cellHeight;
	}

	function down(node, point) {
		const { clientX, clientY } = point;
		if (point.target.closest(".wx-delete-button")) return;
		if (!readonly) {
			if (!node && ($unscheduledTasks || $placeholderRow)) {
				const rowTask = getTaskAtY(clientY);
				const rect = container.getBoundingClientRect();
				const left = getUnitStart(clientX - rect.left, lengthUnitWidth);
				if (
					canScheduleTask(rowTask) &&
					isScheduleWorkingDay(rowTask, left)
				) {
					const isMilestone = rowTask && rowTask.type === "milestone";
					taskSchedule = {
						x: left,
						cx: left,
						left: isMilestone ? left - rowTask.$h / 2 : left,
						y: rowTask
							? rowTask.$y
							: getUnitStartY(clientY - rect.top) + 3,
						h: rowTask ? rowTask.$h : $cellHeight - 7,
						w: isMilestone ? rowTask.$h : lengthUnitWidth,
						task: rowTask,
						isMilestone,
					};
					startDrag();
					return;
				}
			}
			if (!node) return;

			const id = getID(node);
			const task = api.getTask(id);
			const css = point.target.classList;
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
		if (task.type === "milestone") return "";
		if (task.type === "summary" && !($schedule?.auto && task.manual))
			return "";

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
		const { clientX, clientY } = point;

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
					...(segment && { segmentIndex: index }),
				});

				//dnd may be blocked, check positions
				if (
					!taskMove.start &&
					((mode === "move" && task.$x === l) ||
						(mode !== "move" && task.$w === w))
				) {
					ignoreNextClick = true;
					return up();
				}
				taskMove.start = true;
			} else if (taskSchedule) {
				const { isMilestone, x, w, cx } = taskSchedule;
				const rect = container.getBoundingClientRect();
				const current = getUnitStart(
					clientX - rect.left,
					lengthUnitWidth
				);

				// same cell, do nothing
				if (current === cx) return;

				if (isMilestone) {
					taskSchedule = {
						...taskSchedule,
						cx: current,
						left: current - w / 2,
					};

					return;
				}

				taskSchedule = {
					...taskSchedule,
					cx: current,
					left: Math.min(current, x),
					w: Math.abs(current - x) + lengthUnitWidth,
				};
			} else {
				const taskNode = locate(e);
				if (taskNode) {
					const task = api.getTask(getID(taskNode));
					const segNode = locate(e, "data-segment");
					const barNode = segNode || taskNode;
					const mode = getMoveMode(barNode, point, task);
					barNode.style.cursor =
						mode && !readonly ? "col-resize" : "pointer";
				} else if ($unscheduledTasks || $placeholderRow) {
					const rowTask = getTaskAtY(clientY);
					const left = getUnitStart(
						clientX - container.getBoundingClientRect().left,
						lengthUnitWidth
					);
					container.style.cursor =
						canScheduleTask(rowTask) &&
						isScheduleWorkingDay(rowTask, left)
							? "crosshair"
							: "";
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
			if (typeof value !== "undefined" && dx)
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
		} else if (taskSchedule) {
			const { left, w, task, isMilestone } = taskSchedule;
			const state = api.getState();
			const start = calcScaleCellDate(
				isMilestone ? left + w / 2 : left,
				state
			);
			const end = calcScaleCellDate(left + w, state);
			const differ = getDiffer($durationUnit, api.getCalendar());
			const dates = isMilestone
				? { start, duration: 0 }
				: { start, duration: Math.max(1, differ(end, start)) };
			if (task.$placeholder) {
				api.exec("add-task", {
					task: {
						...dates,
						text: _("New task"),
						type: "task",
						eventSource: "placeholder",
					},
				});
			} else api.exec("update-task", { id: task.id, task: dates });

			taskSchedule = null;
			ignoreNextClick = true;
			endDrag();
		}
	}

	function startDrag() {
		document.body.style.userSelect = "none";
		container.style.cursor = "";
	}
	function endDrag() {
		document.body.style.userSelect = "";
		container.style.cursor = "";
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
					linkValidator = $schedule.auto
						? api.getLinkValidator()
						: null;
					linkFrom = { id, start: toStart };
					return;
				}

				if (isLinkTarget(id, toStart)) {
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
				const segmentIndex = locateID(e.target, "data-segment");
				api.exec("select-task", {
					id,
					toggle: e.ctrlKey || e.metaKey,
					range: e.shiftKey,
					...(segmentIndex !== null && { segmentIndex }),
				});
			}
		}
		removeLinkMarker();
	}

	function taskStyle(task) {
		return `left:${task.$x}px;top:${task.$y}px;width:${task.$w}px;height:${task.$h}px;line-height:${task.$h}px;`;
	}

	function baselineStyle(task) {
		return `left:${task.$x_base}px;top:${task.$y_base}px;width:${task.$w_base}px;height:${task.$h_base}px;`;
	}

	function slackStyle(task) {
		return `left:${task.$x_slack}px;top:${task.$y}px;width:${task.$w_slack}px;height:${task.$h}px;`;
	}

	function scheduleStyle(task) {
		return `left:${task.left}px;top:${task.y}px;width:${task.w}px;height:${task.h}px;`;
	}

	function deadlineStyle(task) {
		return `left:${task.$x_deadline}px;top:${task.$y}px;height:${task.$h}px;`;
	}

	function constraintStyle(task) {
		return `left:${task.$x_constraint}px;top:${task.$y - 2}px;height:${
			task.$h + 4
		}px;`;
	}

	// Arrow points into the open side. Floors open right, ceilings open left.
	// Must-start / must-finish are pins and have no arrow. mso still keeps the badge on the left.
	function isMustConstraint(type) {
		return type === "mso" || type === "mfo";
	}

	function constraintOpensRight(type) {
		return type === "snet" || type === "fnet" || type === "mso";
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

	const linkedFrom = $derived.by(() => {
		if (!linkFrom) return null;
		const out = new Map();
		$rLinks.forEach(l => {
			if (l.source !== linkFrom.id) return;
			if (!out.has(l.target)) out.set(l.target, new Set());
			out.get(l.target).add(l.type);
		});
		return out;
	});

	function alreadyLinked(target, toStart) {
		if (target === linkFrom.id) return true;
		const type = getLinkType(linkFrom.start, toStart);
		return !!linkedFrom.get(target)?.has(type);
	}

	function removeLinkMarker() {
		if (linkFrom) {
			linkFrom = null;
			linkValidator = null;
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
	focusTask.subscribe(value => {
		if (value && (!value.section || value.section === "chart")) {
			const { id } = value;
			const node = container.querySelector(
				`.wx-bar[data-id='${setID(id)}']`
			);
			if (node) node.focus();
		}
	});

	const isTaskCritical = task => {
		return $criticalPath && task.critical;
	};

	function isLinkTarget(id, atStart) {
		if (!linkFrom) return true;
		if (alreadyLinked(id, atStart)) return false;
		if (!linkValidator) return true;
		const type = getLinkType(linkFrom.start, atStart);
		return !linkValidator({ source: linkFrom.id, target: id, type });
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
	{#if $slack}
		{#each tasks as task (task.id)}
			{#if task.$visibleSlack}
				<div
					class="wx-slack wx-slack-{task.type}"
					style={slackStyle(task)}
				></div>
			{/if}
		{/each}
	{/if}
	<Links {onSelectLink} {selectedLink} {readonly} />
	{#if taskSchedule}
		<div
			class="wx-bar wx-{taskSchedule.task?.type ||
				'task'} wx-schedule-task"
			style={scheduleStyle(taskSchedule)}
		></div>
	{/if}
	{#each tasks as task (task.id)}
		{#if !task.$skip}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div
				class="wx-bar wx-{taskTypeCss(task.type)}"
				class:wx-touch={touched && taskMove && task.id === taskMove.id}
				class:wx-selected={linkFrom && linkFrom.id === task.id}
				class:wx-critical={isTaskCritical(task)}
				class:wx-reorder-task={task.$reorder}
				class:wx-split={$splitTasks && task.segments}
				class:wx-manual={$schedule?.auto && task.manual}
				class:wx-inactive={$inactiveTasks && task.inactive}
				class:wx-no-working-time={task.$noWorkingTime}
				style={taskStyle(task)}
				data-id={setID(task.id)}
				data-task-id={setID(task.id)}
				tabindex={focused === task.id ? "0" : "-1"}
			>
				{#if !readonly && !hasDuplicatedIds}
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
							class:wx-target={isLinkTarget(task.id, true)}
							class:wx-selected={linkFrom &&
								linkFrom.id === task.id &&
								linkFrom.start}
							class:wx-critical={isTaskCritical(task)}
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
					{#if !readonly && !($splitTasks && task.segments) && !(task.type === "summary" && $summary?.autoProgress)}
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

				{#if !readonly && !hasDuplicatedIds}
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
							class:wx-target={isLinkTarget(task.id, false)}
							class:wx-selected={linkFrom &&
								linkFrom.id === task.id &&
								!linkFrom.start}
							class:wx-critical={isTaskCritical(task)}
						>
							<div class="wx-inner"></div>
						</div>
					{/if}
				{/if}
			</div>
		{/if}
		{#if $rollups && $rRollups?.[task.id]}
			{#each $rRollups[task.id] as rollup}
				<Rollups {rollup} parent={task} />
			{/each}
		{/if}
		{#if $baselines && !task.$skip_baseline}
			<div
				class="wx-baseline"
				class:wx-milestone={task.type === "milestone"}
				style={baselineStyle(task)}
			></div>
		{/if}
		{#if $deadlines && task.deadline && typeof task.$x_deadline === "number"}
			<div
				class="wx-deadline"
				class:wx-overdue={task.$overdue}
				style={deadlineStyle(task)}
			>
				<i class="wxi-flag" data-deadline={task.id}></i>
			</div>
		{/if}
		{#if task.constraint && typeof task.$x_constraint === "number"}
			<div
				class="wx-constraint wx-constraint-{task.constraint.type}"
				class:wx-start={constraintOpensRight(task.constraint.type)}
				class:wx-end={!constraintOpensRight(task.constraint.type)}
				class:wx-violated={constraintViolated?.has(task.$id || task.id)}
				class:wx-compact={isConstraintCompact(task)}
				style={constraintStyle(task)}
				data-constraint-id={setID(task.id)}
			>
				<span class="wx-constraint-badge"
					>{task.constraint.type.toUpperCase()}</span
				>
				<span class="wx-constraint-line"></span>
				{#if !isMustConstraint(task.constraint.type)}
					<span class="wx-constraint-arrow" aria-hidden="true"></span>
				{/if}
			</div>
		{/if}
	{/each}
</div>

<style>
	.wx-rollup {
		position: absolute;
		z-index: 1;
		background-color: var(--wx-gantt-task-color);
		border: 1px solid var(--wx-gantt-marker-color);
		border-color: var(--wx-gantt-marker-color);
	}

	.wx-baseline {
		position: absolute;
		background-color: #a883e4;
		border-radius: var(--wx-gantt-baseline-border-radius);
		z-index: 1;
	}

	.wx-deadline {
		position: absolute;
		display: flex;
		font-size: 20px;
		translate: -5px 0;
		z-index: 2;
		color: var(--wx-gantt-deadline-color, #9fa1ae);
	}
	.wx-deadline.wx-overdue {
		color: var(--wx-gantt-deadline-overdue-color, #fe6158);
	}
	.wx-deadline > i {
		height: 20px;
		cursor: pointer;
	}

	.wx-constraint {
		position: absolute;
		width: 0;
		z-index: 2;
		/* Pin sits on the bar edge; let resize and move reach the task. */
		pointer-events: none;
		--wx-constraint-pin-color: var(--wx-gantt-icon-color);
	}
	.wx-constraint-line,
	.wx-constraint-arrow {
		pointer-events: none;
	}
	.wx-constraint.wx-violated {
		--wx-constraint-pin-color: var(--wx-gantt-constraint-violation-color);
	}
	.wx-constraint-line {
		position: absolute;
		left: 0;
		top: 1px;
		bottom: 1px;
		width: 2px;
		translate: -50% 0;
		border-radius: 2px;
		background: var(--wx-constraint-pin-color);
	}
	.wx-constraint-arrow {
		position: absolute;
		top: 50%;
		width: 6px;
		height: 12px;
		margin-top: -6px;
		background: var(--wx-constraint-pin-color);
		--wx-constraint-arrow-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 12'%3E%3Cpath fill='%23000' d='M0 0.8Q0 0 1 0.3L5.2 5.1Q6 6 5.2 6.9L1 11.7Q0 12 0 11.2Z'/%3E%3C/svg%3E");
		-webkit-mask: var(--wx-constraint-arrow-mask) center / 100% 100%
			no-repeat;
		mask: var(--wx-constraint-arrow-mask) center / 100% 100% no-repeat;
	}
	/* 1px (half of 2px line) + 2px gap */
	.wx-constraint.wx-start .wx-constraint-arrow {
		left: calc(50% + 3px);
	}
	.wx-constraint.wx-end .wx-constraint-arrow {
		right: calc(50% + 3px);
		transform: scaleX(-1);
	}
	.wx-constraint-badge {
		position: absolute;
		top: 1px;
		height: 14px;
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		font-size: 8px;
		font-weight: 600;
		letter-spacing: 0.02em;
		line-height: 1;
		padding: 2px;
		border-radius: 2px;
		background: var(--wx-background-alt);
		white-space: nowrap;
		pointer-events: auto;
	}
	.wx-constraint.wx-start .wx-constraint-badge {
		right: calc(50% + 3px);
	}
	.wx-constraint.wx-end .wx-constraint-badge {
		left: calc(50% + 3px);
	}
	.wx-constraint.wx-violated .wx-constraint-badge {
		background: var(--wx-gantt-constraint-violated-badge-bg);
	}
	.wx-constraint.wx-compact .wx-constraint-badge {
		display: none;
	}
	/* Line is the only visible target once the badge is hidden. */
	.wx-constraint.wx-compact .wx-constraint-line {
		pointer-events: auto;
	}
	.wx-constraint.wx-compact:hover .wx-constraint-badge {
		display: inline-flex;
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

	.wx-bar.wx-schedule-task {
		pointer-events: none;
		z-index: 2;
		opacity: 0.5;
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

	.wx-milestone :global(.wx-text-out) {
		padding: 0 2px;
		left: 100%;
	}

	.wx-milestone .wx-content,
	.wx-milestone.wx-schedule-task {
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
		z-index: 5;
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
	.wx-bar.wx-manual:not(.wx-milestone):not(.wx-split):not(:focus),
	.wx-bar.wx-manual.wx-split :global(.wx-segment) {
		outline: 1px solid var(--wx-gantt-manual-border-color);
		outline-offset: 1px;
	}
	.wx-milestone.wx-manual .wx-content {
		outline: 1px solid var(--wx-gantt-manual-border-color);
		outline-offset: 1.6px;
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

	.wx-task.wx-inactive:not(.wx-split),
	.wx-summary.wx-inactive,
	.wx-task :global(.wx-segment.wx-inactive) {
		background-color: var(--wx-gantt-inactive-color);
	}
	.wx-milestone.wx-inactive .wx-content,
	.wx-milestone.wx-inactive.wx-schedule-task {
		background-color: var(--wx-gantt-inactive-color);
	}
	.wx-milestone.wx-inactive {
		border-color: var(--wx-gantt-inactive-color);
	}
	.wx-task.wx-inactive .wx-progress-percent,
	.wx-summary.wx-inactive .wx-progress-percent,
	.wx-inactive :global(.wx-segment .wx-progress-percent) {
		background-color: var(--wx-gantt-inactive-fill-color);
	}

	/* on the bar itself, so segments, the milestone shape and the fill go with it */
	.wx-no-working-time {
		opacity: var(--wx-gantt-no-working-time-opacity, 0.45);
	}

	.wx-slack {
		box-sizing: border-box;
		position: absolute;
		border-radius: var(--wx-gantt-bar-border-radius);
		border-bottom-left-radius: 0;
		border-top-left-radius: 0;
	}
	.wx-slack-task {
		border: 1px solid var(--wx-gantt-task-slack-border-color);
		background: repeating-linear-gradient(
			-60deg,
			var(--wx-gantt-task-slack-border-color),
			var(--wx-gantt-task-slack-border-color) 1px,
			var(--wx-gantt-task-slack-color) 1px,
			var(--wx-gantt-task-slack-color) 8px
		);
	}
</style>
