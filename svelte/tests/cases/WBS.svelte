<script>
	import { Gantt } from "../../src/";
	import { getData } from "../../demos/data";
	import { Willow } from "@svar-ui/svelte-core";

	const { tasks, links, scales } = getData();
</script>

<Willow>
	<Gantt {tasks} {links} {scales} wbs />
</Willow>
