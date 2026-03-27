<script>
	import { RestDataProvider } from "@svar-ui/gantt-data-provider";
	import { Gantt, ContextMenu, Editor } from "../../src";

	const restProvider = new RestDataProvider(
		"https://gantt-backend.svar.dev",
		{ batchURL: "batch" }
	);
	let api = $state();
	let tasks = $state(),
		links = $state();
	restProvider.getData().then(({ tasks: t, links: l }) => {
		tasks = t;
		links = l;
	});

	function init(api) {
		api.setNext(restProvider);

		api.on("request-data", ev => {
			restProvider.getData(ev.id).then(({ tasks, links }) => {
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
