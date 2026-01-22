<script>
	import { Gantt, ContextMenu, Editor } from "../../src";

	const server = "https://master--svar-gantt-go--dev.webix.io";

	let api = $state();
	let tasks = $state([]);
	let links = $state([]);

	Promise.all([
		fetch(server + "/tasks")
			.then(res => res.json())
			.then(arr => parseDates(arr)),
		fetch(server + "/links").then(res => res.json()),
	]).then(([t, l]) => {
		tasks = t;
		links = l;
	});

	function parseDates(data) {
		data.forEach(item => {
			item.start = new Date(item.start);
			if (item.end) item.end = new Date(item.end);
		});
		return data;
	}

	function init(api) {
		api.on("request-data", ev => {
			Promise.all([
				fetch(server + `/tasks/${ev.id}`)
					.then(res => res.json())
					.then(arr => parseDates(arr)),
				fetch(server + `/links/${ev.id}`).then(res => res.json()),
			]).then(([tasks, links]) => {
				api.exec("provide-data", {
					id: ev.id,
					data: {
						tasks,
						links,
					},
				});
			});
		});
	}
</script>

<ContextMenu {api}>
	<Gantt bind:this={api} {init} {tasks} {links} />
</ContextMenu>
<Editor {api} />
