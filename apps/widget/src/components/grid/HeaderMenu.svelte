<script lang="ts">
	import type { Snippet } from "svelte";
	import { HeaderMenu as BaseHeaderMenu } from "@svar-ui/svelte-grid";
	import type { IApi as ITableApi } from "@svar-ui/svelte-grid";
	import type { IApi, TColumnSection } from "@svar-ui/gantt-store";

	type Props = {
		api?: IApi;
		columns?: { [key: string]: boolean } | null;
		children?: Snippet;
	};

	let { children, columns = null, api }: Props = $props();

	let targetSection = $state<TColumnSection>("grid");

	let tableAPI = $derived(
		api?.getTable(false, targetSection) as ITableApi | undefined
	);

	function detectSection(ev: MouseEvent) {
		const host = (ev.target as Element | null)?.closest?.<HTMLElement>(
			"[data-gantt-section]"
		);
		targetSection =
			host?.dataset.ganttSection === "subGrid" ? "subGrid" : "grid";
	}
</script>

<BaseHeaderMenu api={tableAPI} {columns}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div style="display: contents" oncontextmenu={detectSection}>
		{@render children?.()}
	</div>
</BaseHeaderMenu>
