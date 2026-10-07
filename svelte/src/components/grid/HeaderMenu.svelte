<script>
	import { HeaderMenu } from "@svar-ui/svelte-grid";

	let { children, columns = null, api } = $props();

	let targetSection = $state("grid");

	let tableAPI = $derived(api?.getTable(false, targetSection));

	function detectSection(ev) {
		const host = ev.target?.closest?.("[data-gantt-section]");
		targetSection =
			host?.dataset.ganttSection === "subGrid" ? "subGrid" : "grid";
	}
</script>

<HeaderMenu api={tableAPI} {columns}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div style="display: contents" oncontextmenu={detectSection}>
		{@render children?.()}
	</div>
</HeaderMenu>
