<script>
	import { Gantt, Editor } from "../../src/";
	import { getData } from "../../demos/data";
	import { Willow, Locale } from "wx-svelte-core";

	const { tasks, links, scales } = getData();

	let api = $state();
</script>

<Willow>
	<Locale>
		<Gantt bind:this={api} {tasks} {links} {scales} />
		<Editor {api} />
	</Locale>
</Willow>
