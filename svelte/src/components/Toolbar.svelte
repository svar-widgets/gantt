<script>
	import { getContext, setContext } from "svelte";
	import { Toolbar } from "wx-svelte-toolbar";
	import { handleAction, defaultToolbarButtons } from "wx-gantt-store";

	import { locale } from "wx-lib-dom";
	import { en } from "wx-gantt-locales";

	export let api = null;
	export let items = [...defaultToolbarButtons];

	// set locale
	let l = getContext("wx-i18n");
	if (!l) {
		l = locale(en);
		setContext("wx-i18n", l);
	}
	const _ = getContext("wx-i18n").getGroup("gantt");

	items = items.map(b => {
		b = { ...b };
		b.handler = item => {
			handleAction(api, item.id, null, _);
			filterButtons();
		};
		if (b.text) b.text = _(b.text);
		if (b.menuText) b.menuText = _(b.menuText);
		return b;
	});

	let rState, rSelected, buttons, rTasks;
	$: {
		if (api) {
			rState = api.getReactiveState();
			rSelected = rState._selected;
			rTasks = rState._tasks;

			filterButtons();
		} else {
			buttons = [items[0]];
		}
	}

	$: $rSelected, filterButtons();

	function filterButtons() {
		items = items.map(item => {
			return { ...item, disabled: false };
		});

		if ($rSelected?.length) {
			buttons = items.map(item => {
				if (!item.check) return item;

				const isDisabled = $rSelected.some(
					task => !item.check(task, $rTasks)
				);

				return { ...item, disabled: isDisabled };
			});
		} else {
			buttons = [items[0]];
		}
	}
</script>

<Toolbar items={buttons} />
