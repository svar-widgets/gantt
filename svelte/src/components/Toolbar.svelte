<script>
	import { getContext, setContext } from "svelte";
	import { Toolbar } from "wx-svelte-toolbar";
	import {
		handleAction,
		defaultToolbarButtons,
		isHandledAction,
	} from "wx-gantt-store";

	import { locale } from "wx-lib-dom";
	import { en } from "wx-gantt-locales";

	let { api = null, items = [...defaultToolbarButtons] } = $props();

	// set locale
	let l = getContext("wx-i18n");
	if (!l) {
		l = locale(en);
		setContext("wx-i18n", l);
	}
	const _ = getContext("wx-i18n").getGroup("gantt");

	const finalItems = $derived.by(() => {
		return items.map(b => {
			b = { ...b, disabled: false };
			b.handler = isHandledAction(defaultToolbarButtons, b.id)
				? item => handleAction(api, item.id, null, _)
				: b.handler;
			if (b.text) b.text = _(b.text);
			if (b.menuText) b.menuText = _(b.menuText);
			return b;
		});
	});

	let rSelected, rTasks;
	const buttons = $derived.by(() => {
		if (api) {
			const rState = api.getReactiveState();
			rSelected = rState._selected;
			rTasks = rState._tasks;

			if ($rSelected?.length) {
				return finalItems.map(item => {
					if (!item.check) return item;

					const isDisabled = $rSelected.some(
						task => !item.check(task, $rTasks)
					);

					return { ...item, disabled: isDisabled };
				});
			}
		}

		return [{ ...finalItems[0], disabled: false }];
	});
</script>

<Toolbar items={buttons} />
