<script>
	import { getContext, setContext } from "svelte";
	import { Toolbar } from "@svar-ui/svelte-toolbar";
	import {
		handleAction,
		getToolbarButtons,
		isHandledAction,
		isPlaceholder,
	} from "@svar-ui/gantt-store";

	import { locale } from "@svar-ui/lib-dom";
	import { en } from "@svar-ui/gantt-locales";

	let { api = null, items = [] } = $props();

	// set locale
	let l = getContext("wx-i18n");
	if (!l) {
		l = locale(en);
		setContext("wx-i18n", l);
	}
	const _ = l.getGroup("gantt");

	let state = $derived(api?.getReactiveState());
	let {
		_selected,
		undo,
		history,
		splitTasks,
		groupBy,
		conflicts,
		showConflicts,
		schedule,
	} = $derived(state || {});

	const historyActions = ["undo", "redo"];

	const finalItems = $derived.by(() => {
		const fullButtons = getToolbarButtons({
			undo: true,
			splitTasks: true,
			conflicts: true,
		});
		const buttons = items.length
			? items
			: getToolbarButtons({
					undo: $undo,
					splitTasks: $splitTasks,
					group: !!$groupBy?.field,
					conflicts: $schedule?.auto,
				});
		return buttons.map(b => {
			b = { ...b, disabled: false };
			if (b.id === "show-conflicts") {
				if ($conflicts?.length)
					b.css = b.css ? `${b.css} wx-conflicts` : "wx-conflicts";
				if ($showConflicts) b.type = "pressed";
			}
			b.handler = isHandledAction(fullButtons, b.id)
				? item => handleAction(api, item.id, null, _)
				: b.handler;
			if (b.text) b.text = _(b.text);
			if (b.menuText) b.menuText = _(b.menuText);
			return b;
		});
	});

	const buttons = $derived.by(() => {
		const finalButtons = [];
		finalItems.forEach(item => {
			const action = item.id;

			if (action === "add-task" || !historyActions.includes(action)) {
				if (
					!$_selected?.length ||
					($_selected?.length === 1 &&
						isPlaceholder($_selected[0].id)) ||
					!api
				) {
					if (action !== "add-task" && action !== "show-conflicts")
						return;
					finalButtons.push(item);
				} else {
					finalButtons.push({
						...item,
						disabled:
							item.isDisabled &&
							$_selected.some(task =>
								item.isDisabled(
									task,
									api.getState(),
									api.getTaskCalendar(task)
								)
							),
					});
				}
			} else if (historyActions.includes(action)) {
				finalButtons.push({
					...item,
					disabled: item.isDisabled($history),
				});
			}
		});
		// hide by handler, then drop redundant separators
		const isItemHidden = button => {
			if (!api || !button.isHidden) return false;
			const state = api.getState();
			if (!$_selected?.length) return button.isHidden(null, state);
			return $_selected.some(task => button.isHidden(task, state));
		};
		return finalButtons.filter((button, index) => {
			if (isItemHidden(button)) return false;
			if (button.comp === "separator") {
				const nextButton = finalButtons
					.slice(index + 1)
					.find(item => !isItemHidden(item));
				if (!nextButton || nextButton.comp === "separator")
					return false;
			}
			return true;
		});
	});
</script>

<Toolbar items={buttons} />

<style>
	/* Orange corner dot when the graph has conflicts. */
	:global(.wx-button.wx-conflicts),
	:global(i.wx-conflicts) {
		position: relative;
	}
	:global(.wx-button.wx-conflicts::after),
	:global(i.wx-conflicts::after) {
		content: "";
		position: absolute;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--wx-gantt-constraint-violation-color);
		pointer-events: none;
	}
	:global(.wx-button.wx-conflicts::after) {
		top: 2px;
		right: 2px;
	}
	:global(i.wx-conflicts::after) {
		top: 0;
		right: -2px;
	}
</style>
