<script>
	import { getData } from "../data";
	import {
		Gantt,
		Editor,
		defaultEditorItems,
		registerEditorItem,
	} from "../../src";
	import { Tasklist } from "wx-svelte-tasklist";

	let { skinSettings } = $props();

	registerEditorItem("tasks", Tasklist);

	const data = getData();
	data.tasks.forEach((d, i) => {
		d.tasks = !i
			? [
					{
						id: 1,
						content:
							"Research best practices for integrating third-party libraries with React",
						status: 1,
					},
					{
						id: 2,
						content:
							"Explore modern approaches to building applications using React",
						status: 0,
					},
					{
						id: 3,
						content:
							"Explore different methods for integrating React with existing JavaScript frameworks",
						status: 0,
					},
					{
						id: 4,
						date: new Date(),
						content:
							"Learn about routing in React using React Router",
						status: 1,
					},
					{
						id: 5,
						content:
							"Understand principles and best practices for component development in React",
						status: 0,
					},
					{
						id: 6,
						content:
							"Explore different methods for integrating React with existing JavaScript frameworks",
						status: 0,
					},
					{
						id: 7,
						content: "Optimize performance in React applications",
						status: 0,
					},
					{
						id: 8,
						content:
							"Work with API requests and data handling in React applications",
						status: 0,
					},
				]
			: [];
	});

	let api = $state();

	const keys = ["text", "details"];
	const items = defaultEditorItems.filter(op => keys.indexOf(op.key) >= 0);
	items.push({
		key: "tasks",
		comp: "tasks",
		label: "Tasks",
	});
</script>

<Gantt
	bind:this={api}
	{...skinSettings}
	tasks={data.tasks}
	links={data.links}
	scales={data.scales}
/>
<Editor {api} {items} />
