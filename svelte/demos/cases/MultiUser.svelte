<script>
	import { onDestroy } from "svelte";
	import { RemoteEvents, RestDataProvider } from "@svar-ui/gantt-data-provider";
	import { Gantt, ContextMenu, Editor } from "../../src";
	import { Checkbox, Button } from "@svar-ui/svelte-core";

	const server = "https://gantt-backend.svar.dev";

	let { skinSettings } = $props();

	function makeClient(label) {
		const restProvider = new RestDataProvider(server);
		const remoteEvents = new RemoteEvents(restProvider, {
			url: `${server}/events`,
			onResync: load,
			onConnectionChange: online => (connected = online),
		});
		restProvider.setHeaders({ "X-Client-Id": remoteEvents.clientId });

		let gantt = $state.raw();
		let tasks = $state.raw([]);
		let links = $state.raw([]);
		let connected = $state(false);
		let ganttApi = null;

		let loadRetry = null;
		async function load() {
			clearTimeout(loadRetry);
			try {
				const response = await restProvider.getData();
				tasks = response.tasks;
				links = response.links;
			} catch (error) {
				console.error("could not load the project, retrying", error);
				loadRetry = setTimeout(load, 2000);
			}
		}

		function init(api) {
			ganttApi = api;
			api.setNext(restProvider);
			remoteEvents
				.connect(api)
				.catch(() =>
					console.error("could not connect to remote events")
				)
				.then(load);

			api.on("request-data", ev => {
				restProvider
					.getData(ev.id)
					.then(({ tasks, links }) => {
						api.exec("provide-data", {
							id: ev.id,
							data: { tasks, links },
						});
					})
					.catch(error =>
						console.error("could not load the branch", error)
					);
			});
		}

		function toggleConnection() {
			if (connected) remoteEvents.disconnect();
			else remoteEvents.connect(ganttApi).catch(() => {});
		}

		function destroy() {
			clearTimeout(loadRetry);
			remoteEvents.disconnect();
		}

		return {
			label,
			init,
			toggleConnection,
			destroy,
			get api() {
				return gantt;
			},
			set api(value) {
				gantt = value;
			},
			get tasks() {
				return tasks;
			},
			get links() {
				return links;
			},
			get connected() {
				return connected;
			},
		};
	}

	const clients = [makeClient("Client A"), makeClient("Client B")];

	onDestroy(() => clients.forEach(client => client.destroy()));

	let autoschedule = $state(false);
</script>

<div class="rows">
	<div class="row config">
		<Checkbox label="Auto scheduling" bind:value={autoschedule} />
		<span class="pro">PRO</span>
	</div>
	{#each clients as client (client.label)}
		<div class="row config">
			<div style="color: var(--wx-color-font-alt)">{client.label}</div>
			<span>&middot;</span>
			<div>
				<span>Status</span>:
				<span
					class="status"
					class:connected={client.connected}
					class:disconnected={!client.connected}
				>
					{client.connected ? "Connected" : "Disconnected"}
				</span>
				(<Button onclick={client.toggleConnection} type="link">
					{client.connected ? "Disconnect" : "Connect"}
				</Button>)
			</div>
		</div>
		<div class="row gantt">
			<ContextMenu api={client.api}>
				<Gantt
					bind:this={client.api}
					{...skinSettings}
					cellHeight={32}
					cellWidth={60}
					init={client.init}
					tasks={client.tasks}
					links={client.links}
					schedule={{ auto: autoschedule }}
					undo
					zoom
				/>
			</ContextMenu>
			<Editor api={client.api} />
		</div>
	{/each}
</div>

<style>
	.rows {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.row:not(:last-child) {
		border-bottom: var(--wx-border);
	}

	.row.config {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		user-select: none;
	}

	.row.gantt {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.status {
		padding: 2px;
		color: var(--status-color);

		&.connected {
			--status-color: limegreen;
		}
		&.disconnected {
			--status-color: tomato;
		}
	}

	.pro {
		color: var(--demo-framework-color);
		border: 1px solid var(--demo-framework-color);
		border-radius: 4px;
		padding: 0px 8px;
		font-size: 12px;
		font-weight: 600;
	}
</style>
