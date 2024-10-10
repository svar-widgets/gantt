<script>
	import { Gantt } from "../../src/";
	import { getData } from "../../demos/data";
	import { Willow, Locale } from "wx-svelte-core";

	const { tasks, links, scales } = getData();
</script>

<Willow>
	<Locale>
		<Gantt {tasks} {links} {scales} />
	</Locale>
</Willow>
