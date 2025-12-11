<script>
	import { getContext, setContext } from "svelte";
	import { Toolbar } from "@svar-ui/svelte-toolbar";
	import {
		handleAction,
		getToolbarButtons,
		isHandledAction,
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
	const _ = getContext("wx-i18n").getGroup("gantt");

	let state = $derived(api?.getReactiveState());
	let { _selected, undo, history, splitTasks } = $derived(state || {});

	const historyActions = ["undo", "redo"];

	const finalItems = $derived.by(() => {
		const fullButtons = getToolbarButtons({ undo: true, splitTasks: true });
		const buttons = items.length
			? items
			: getToolbarButtons({
					undo: $undo,
					splitTasks: $splitTasks,
				});
		return buttons.map(b => {
			b = { ...b, disabled: false };
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
			if (action === "add-task") {
				finalButtons.push(item);
			} else if (!historyActions.includes(action)) {
				if (!$_selected?.length || !api) return;
				finalButtons.push({
					...item,
					disabled:
						item.isDisabled &&
						$_selected.some(task =>
							item.isDisabled(task, api.getState())
						),
				});
			} else if (historyActions.includes(action)) {
				finalButtons.push({
					...item,
					disabled: item.isDisabled($history),
				});
			}
		});
		// filter out consecutive separators
		return finalButtons.filter((button, index) => {
			if (api && button.isHidden)
				return !$_selected.some(task =>
					button.isHidden(task, api.getState())
				);
			if (button.comp === "separator") {
				const nextButton = finalButtons[index + 1];
				if (!nextButton || nextButton.comp === "separator")
					return false;
			}
			return true;
		});
	});
</script>

<Toolbar items={buttons} />
