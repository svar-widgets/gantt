<script>
	import { getData } from "../data";
	import { Gantt, Fullscreen } from "../../src/";

	let { skinSettings } = $props();
	const data = getData();
</script>

<div class="demo">
	<h4>Click the "expand" icon, or click on Gantt and press Ctrl+Shift+F</h4>
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
		gap: 10px;
		height: 100%;
	}

	.gtcell {
		overflow: hidden;
		border: var(--wx-gantt-border);
		height: calc(100% - 32px);
	}
</style>
