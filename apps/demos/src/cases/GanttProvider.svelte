<script lang="ts">
	import { RestDataProvider } from "@svar-ui/gantt-data-provider";
	import { Gantt, ContextMenu, Editor } from "@svar-ui/svelte-gantt";
	import type { IApi, ILink, ITask } from "@svar-ui/svelte-gantt";

	const restProvider = new RestDataProvider(
		"https://gantt-backend.svar.dev"
	);
	let api = $state<IApi>();
	let tasks = $state<ITask[]>(),
		links = $state<ILink[]>();
	restProvider.getData().then(({ tasks: t, links: l }) => {
		tasks = t;
		links = l;
	});

	function init(api: IApi) {
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
