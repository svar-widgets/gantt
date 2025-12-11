<script>
	import { Gantt, Editor } from "../../src/";
	import { getData } from "../../demos/data";
	import { Willow } from "@svar-ui/svelte-core";

	const { tasks, links, scales } = getData();

	let api = $state();
</script>

<Willow>
	<Gantt bind:this={api} {tasks} {links} {scales} />
	<Editor {api} />
</Willow>
