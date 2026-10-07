<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";
	import { Fullscreen } from "@svar-ui/svelte-core";

	let { skinSettings } = $props();
	const data = getData();
</script>

<div class="demo">
	<div class="hint">
		Click the "expand" icon, or click on Gantt and press Ctrl+Shift+F
	</div>
	<div class="gtcell">
		<Fullscreen hotkey="ctrl+shift+f">
			<Gantt {...skinSettings} tasks={data.tasks} links={data.links} />
		</Fullscreen>
	</div>
</div>

<style>
	.demo {
		display: flex;
		flex-direction: column;
		height: 100%;
	}
	.hint {
		flex-shrink: 0;
		padding: 8px 12px;
		color: var(--wx-color-font-alt);
		border-bottom: var(--wx-gantt-border);
	}
	.gtcell {
		flex: 1;
		min-height: 0;
	}
</style>
