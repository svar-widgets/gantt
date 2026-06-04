<script>
	import { ContextMenu, Editor, Gantt, getDefaultColumns } from "../../src";
	import { RestDataProvider } from "@svar-ui/gantt-data-provider";

	const restProvider = new RestDataProvider(
		"https://gantt-backend.svar.dev"
	);

	let api = $state();
	let tasks = $state([]);
	let links = $state([]);
	let resources = $state([]);
	let assignments = $state([]);

	restProvider
		.getData(undefined, { resources: true, assignments: true })
		.then(response => {
			const {
				tasks: t,
				links: l,
				resources: r,
				assignments: a,
			} = response;
			tasks = t;
			links = l;
			resources = r;
			assignments = a;
		});

	function init(api) {
		api.setNext(restProvider);

		api.on("request-data", ev => {
			restProvider
				.getData(ev.id, { assignments: true })
				.then(({ tasks, links, assignments }) => {
					api.exec("provide-data", {
						id: ev.id,
						data: { tasks, links, assignments },
					});
				});
		});
	}
</script>

<div class="demo">
	<ContextMenu {api}>
		<Gantt
			bind:this={api}
			{init}
			{tasks}
			{links}
			{resources}
			{assignments}
			columns={getDefaultColumns({ resources: true })}
		/>
	</ContextMenu>
	<Editor {api} />
</div>

<style>
	.demo {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
</style>
