import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemoteEvents, RestDataProvider } from "../src/index";
import type { EventStreamConfig, IRemoteEventsProvider } from "../src/index";
import { FakeEventSource, mockApi, mockFetch, silenceLogs } from "./helpers";

const PARAMS = {
	eventSource: "remote",
};

function getRemoteEvents(
	state?: Parameters<typeof mockApi>[0],
	config?: Partial<EventStreamConfig>
) {
	const provider = new RestDataProvider("");
	const api = mockApi(state);
	const events = new RemoteEvents(provider, { url: "/events", ...config });
	return { provider, api, events, sources: FakeEventSource.instances };
}

function getEvents(state?: Parameters<typeof mockApi>[0]) {
	const parts = getRemoteEvents(state);
	parts.events.connect(parts.api as any);
	return parts;
}

function message(event: Record<string, unknown>) {
	return JSON.stringify({ from: "other-client", ...event });
}

beforeEach(() => {
	silenceLogs();
	FakeEventSource.instances = [];
	globalThis.EventSource = FakeEventSource as any;
	mockFetch();
});

describe("message parsing", () => {
	it("ignores malformed json", () => {
		const { api, events } = getEvents();
		events.processMessage("{ not json");
		expect(api.exec).not.toHaveBeenCalled();
	});

	it("ignores a null message", () => {
		const { api, events } = getEvents();
		expect(() => events.processMessage("null")).to.not.throw();
		expect(api.exec).not.toHaveBeenCalled();
	});

	it("ignores a non-object message", () => {
		const { api, events } = getEvents();
		events.processMessage('"text"');
		expect(api.exec).not.toHaveBeenCalled();
	});

	it("ignores its own events", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }] });
		events.processMessage(
			JSON.stringify({
				from: events.clientId,
				type: "task",
				action: "delete",
				id: 1,
			})
		);
		expect(api.exec).not.toHaveBeenCalled();
	});

	it("ignores events without the required fields", () => {
		const { api, events } = getEvents();
		events.processMessage(message({ action: "delete", id: 1 }));
		events.processMessage(message({ type: "task", id: 1 }));
		events.processMessage(message({ type: "task", action: "delete" }));
		events.processMessage(JSON.stringify({ type: "task", id: 1 }));
		expect(api.exec).not.toHaveBeenCalled();
	});

	it("ignores an unknown event type", () => {
		const { api, events } = getEvents();
		events.processMessage(
			message({ type: "resource", action: "delete", id: 1 })
		);
		expect(api.exec).not.toHaveBeenCalled();
	});
});

describe("applying", () => {
	it("drops the events before the api is known", () => {
		const { api, events } = getRemoteEvents({ tasks: [{ id: 1 }] });

		events.processMessage(
			message({ type: "task", action: "delete", id: 1 })
		);
		events.connect(api as any);
		expect(api.exec).not.toHaveBeenCalled();
	});

	it("applies an event as it arrives", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }] });

		events.processMessage(
			message({ type: "task", action: "delete", id: 1 })
		);
		expect(api.exec).toHaveBeenCalledOnce();
	});

	it("survives a failing event", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }, { id: 2 }] });
		api.exec.mockImplementationOnce(() => {
			throw new Error("broken");
		});

		expect(() =>
			events.processMessage(
				message({ type: "task", action: "delete", id: 1 })
			)
		).to.not.throw();

		events.processMessage(
			message({ type: "task", action: "delete", id: 2 })
		);
		expect(api.exec).toHaveBeenCalledTimes(2);
	});
});

describe("task events", () => {
	it("adds a task", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }] });
		events.processMessage(
			message({
				type: "task",
				action: "add",
				id: 2,
				data: { text: "task", parent: 1 },
			})
		);

		expect(api.exec).toHaveBeenCalledWith("add-task", {
			id: 2,
			task: { id: 2, text: "task", parent: 1 },
			target: undefined,
			mode: undefined,
			index: undefined,
			...PARAMS,
		});
	});

	it("parses the dates of an added task", () => {
		const { api, events } = getEvents();
		events.processMessage(
			message({
				type: "task",
				action: "add",
				id: 2,
				data: { text: "task", start: "2024-01-15 00:00:00" },
			})
		);

		const [, ev] = api.exec.mock.calls[0];
		expect(ev.task.start).to.be.instanceOf(Date);
	});

	it("drops the open flag of an added task", () => {
		const { api, events } = getEvents();
		events.processMessage(
			message({
				type: "task",
				action: "add",
				id: 2,
				data: { text: "task", open: true },
			})
		);

		const [, ev] = api.exec.mock.calls[0];
		expect("open" in ev.task).to.eq(false);
	});

	it("keeps the position when the target is loaded", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }] });
		events.processMessage(
			message({
				type: "task",
				action: "add",
				id: 2,
				data: { text: "task", target: 1, mode: "after", index: 3 },
			})
		);

		const [, ev] = api.exec.mock.calls[0];
		expect(ev).to.include({ target: 1, mode: "after", index: 3 });
	});

	it("drops the position when the target is not loaded", () => {
		const { api, events } = getEvents();
		events.processMessage(
			message({
				type: "task",
				action: "add",
				id: 2,
				data: { text: "task", target: 99, mode: "after" },
			})
		);

		const [, ev] = api.exec.mock.calls[0];
		expect(ev).to.include({ target: undefined, mode: undefined });
	});

	it("skips a task that is already loaded", () => {
		const { api, events } = getEvents({ tasks: [{ id: 2 }] });
		events.processMessage(
			message({ type: "task", action: "add", id: 2, data: { text: "t" } })
		);

		expect(api.exec).not.toHaveBeenCalled();
	});

	it("skips a child of a lazy branch", () => {
		const { api, events } = getEvents({
			tasks: [{ id: 1, lazy: true }],
		});
		events.processMessage(
			message({
				type: "task",
				action: "add",
				id: 2,
				data: { text: "task", parent: 1 },
			})
		);

		expect(api.exec).not.toHaveBeenCalled();
	});

	it("skips a child of an unknown branch", () => {
		const { api, events } = getEvents();
		events.processMessage(
			message({
				type: "task",
				action: "add",
				id: 2,
				data: { text: "task", parent: 99 },
			})
		);

		expect(api.exec).not.toHaveBeenCalled();
	});

	it("updates a task", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }] });
		events.processMessage(
			message({
				type: "task",
				action: "update",
				id: 1,
				data: { text: "new", operation: "" },
			})
		);

		expect(api.exec).toHaveBeenCalledWith("update-task", {
			id: 1,
			task: { id: 1, text: "new", parent: undefined },
			...PARAMS,
		});
	});

	it("keeps the operation out of an updated task", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }] });
		events.processMessage(
			message({
				type: "task",
				action: "update",
				id: 1,
				data: { text: "new", operation: "" },
			})
		);

		const [, ev] = api.exec.mock.calls[0];
		expect("operation" in ev.task).to.eq(false);
	});

	it("keeps the operation out of a moved task", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }, { id: 2 }] });
		events.processMessage(
			message({
				type: "task",
				action: "update",
				id: 1,
				data: {
					operation: "move",
					parent: 2,
					target: 2,
					mode: "child",
				},
			})
		);

		const [action, ev] = api.exec.mock.calls[0];
		expect(action).to.eq("move-task");
		expect("operation" in ev).to.eq(false);
	});

	it("keeps the operation out of an added task", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }] });
		events.processMessage(
			message({
				type: "task",
				action: "add",
				id: 2,
				data: { text: "task", parent: 1, operation: "" },
			})
		);

		const [, ev] = api.exec.mock.calls[0];
		expect("operation" in ev.task).to.eq(false);
	});

	it("treats a missing operation as a plain update", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }] });
		events.processMessage(
			message({
				type: "task",
				action: "update",
				id: 1,
				data: { text: "new" },
			})
		);

		const [action] = api.exec.mock.calls[0];
		expect(action).to.eq("update-task");
	});

	it("adds a task that is updated but not loaded", () => {
		const { api, events } = getEvents();
		events.processMessage(
			message({
				type: "task",
				action: "update",
				id: 1,
				data: { text: "new", operation: "" },
			})
		);

		const [action] = api.exec.mock.calls[0];
		expect(action).to.eq("add-task");
	});

	it("keeps the lazy flag out of an updated task", () => {
		// the client tracks its loaded branches itself
		const { api, events } = getEvents({ tasks: [{ id: 1 }] });
		events.processMessage(
			message({
				type: "task",
				action: "update",
				id: 1,
				data: { text: "new", lazy: true, operation: "" },
			})
		);

		const [, ev] = api.exec.mock.calls[0];
		expect("lazy" in ev.task).to.eq(false);
	});

	it("keeps the lazy flag of a task that is updated but not loaded", () => {
		const { api, events } = getEvents();
		events.processMessage(
			message({
				type: "task",
				action: "update",
				id: 1,
				data: { text: "new", lazy: true, operation: "move" },
			})
		);

		const [action, ev] = api.exec.mock.calls[0];
		expect(action).to.eq("add-task");
		expect(ev.task.lazy).to.eq(true);
	});

	it("keeps the derived dates of a childless summary", () => {
		const { api, events } = getEvents({
			tasks: [{ id: 1, type: "summary" }],
		});
		events.processMessage(
			message({
				type: "task",
				action: "update",
				id: 1,
				data: {
					type: "summary",
					operation: "",
					start: "2024-01-15 00:00:00",
					duration: 5,
				},
			})
		);

		const [, ev] = api.exec.mock.calls[0];
		expect(ev.task.start).to.not.eq(undefined);
		expect(ev.task.duration).to.eq(5);
	});

	it("keeps the dates of a summary with children", () => {
		const { api, events } = getEvents({
			tasks: [{ id: 1, type: "summary", data: [{ id: 2 }] }],
		});
		events.processMessage(
			message({
				type: "task",
				action: "update",
				id: 1,
				data: {
					type: "summary",
					operation: "",
					start: "2024-01-15 00:00:00",
					end: "2024-01-20 00:00:00",
					duration: 5,
					text: "kept",
				},
			})
		);

		const [, ev] = api.exec.mock.calls[0];
		expect(ev.task.text).to.eq("kept");
		expect(ev.task.start).to.not.eq(undefined);
		expect(ev.task.end).to.not.eq(undefined);
		expect(ev.task.duration).to.eq(5);
	});

	it("moves a task", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }, { id: 2 }] });
		events.processMessage(
			message({
				type: "task",
				action: "update",
				id: 1,
				data: {
					operation: "move",
					parent: 2,
					target: 2,
					mode: "child",
				},
			})
		);

		const [action, ev] = api.exec.mock.calls[0];
		expect(action).to.eq("move-task");
		expect(ev).to.include({ id: 1, target: 2, mode: "child" });
	});

	it("falls back to the parent when the move target is not loaded", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }, { id: 2 }] });
		events.processMessage(
			message({
				type: "task",
				action: "update",
				id: 1,
				data: {
					operation: "move",
					parent: 2,
					target: 99,
					mode: "after",
				},
			})
		);

		const [, ev] = api.exec.mock.calls[0];
		expect(ev).to.include({ target: 2, mode: "child" });
	});

	it("deletes a task moved into a lazy branch", () => {
		const { api, events } = getEvents({
			tasks: [{ id: 1 }, { id: 2, lazy: true }],
		});
		events.processMessage(
			message({
				type: "task",
				action: "update",
				id: 1,
				data: { operation: "move", parent: 2 },
			})
		);

		expect(api.exec).toHaveBeenCalledWith("delete-task", {
			id: 1,
			...PARAMS,
		});
	});

	it("deletes a task", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }] });
		events.processMessage(
			message({ type: "task", action: "delete", id: 1 })
		);

		expect(api.exec).toHaveBeenCalledWith("delete-task", {
			id: 1,
			...PARAMS,
		});
	});

	it("skips deleting a task that is not loaded", () => {
		const { api, events } = getEvents();
		events.processMessage(
			message({ type: "task", action: "delete", id: 1 })
		);

		expect(api.exec).not.toHaveBeenCalled();
	});
});

describe("link events", () => {
	it("adds a link between loaded tasks", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }, { id: 2 }] });
		events.processMessage(
			message({
				type: "link",
				action: "add",
				id: 5,
				data: { source: 1, target: 2, type: "e2s" },
			})
		);

		expect(api.exec).toHaveBeenCalledWith("add-link", {
			id: 5,
			link: { id: 5, source: 1, target: 2, type: "e2s" },
			...PARAMS,
		});
	});

	it("skips a link with an unloaded end", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }] });
		events.processMessage(
			message({
				type: "link",
				action: "add",
				id: 5,
				data: { source: 1, target: 99 },
			})
		);

		expect(api.exec).not.toHaveBeenCalled();
	});

	it("skips a link that is already loaded", () => {
		const { api, events } = getEvents({
			tasks: [{ id: 1 }, { id: 2 }],
			links: [{ id: 5 }],
		});
		events.processMessage(
			message({
				type: "link",
				action: "add",
				id: 5,
				data: { source: 1, target: 2 },
			})
		);

		expect(api.exec).not.toHaveBeenCalled();
	});

	it("updates a loaded link", () => {
		const { api, events } = getEvents({ links: [{ id: 5 }] });
		events.processMessage(
			message({
				type: "link",
				action: "update",
				id: 5,
				data: { type: "s2s" },
			})
		);

		const [action] = api.exec.mock.calls[0];
		expect(action).to.eq("update-link");
	});

	it("skips updating a link that is not loaded", () => {
		const { api, events } = getEvents();
		events.processMessage(
			message({
				type: "link",
				action: "update",
				id: 5,
				data: { type: "s2s" },
			})
		);

		expect(api.exec).not.toHaveBeenCalled();
	});

	it("deletes a loaded link", () => {
		const { api, events } = getEvents({ links: [{ id: 5 }] });
		events.processMessage(
			message({ type: "link", action: "delete", id: 5 })
		);

		expect(api.exec).toHaveBeenCalledWith("delete-link", {
			id: 5,
			...PARAMS,
		});
	});
});

describe("assignment events", () => {
	it("adds an assignment for a loaded task", () => {
		const { api, events } = getEvents({ tasks: [{ id: 1 }] });
		events.processMessage(
			message({
				type: "assignment",
				action: "add",
				id: 7,
				data: { task: 1, resource: 3, value: 8 },
			})
		);

		expect(api.exec).toHaveBeenCalledWith("add-assignment", {
			id: 7,
			assignment: { id: 7, task: 1, resource: 3, value: 8 },
			...PARAMS,
		});
	});

	it("skips an assignment of an unloaded task", () => {
		const { api, events } = getEvents();
		events.processMessage(
			message({
				type: "assignment",
				action: "add",
				id: 7,
				data: { task: 99, resource: 3 },
			})
		);

		expect(api.exec).not.toHaveBeenCalled();
	});

	it("updates a loaded assignment", () => {
		const { api, events } = getEvents({ assignments: [{ id: 7 }] });
		events.processMessage(
			message({
				type: "assignment",
				action: "update",
				id: 7,
				data: { value: 4 },
			})
		);

		const [action] = api.exec.mock.calls[0];
		expect(action).to.eq("update-assignment");
	});

	it("deletes a loaded assignment", () => {
		const { api, events } = getEvents({ assignments: [{ id: 7 }] });
		events.processMessage(
			message({ type: "assignment", action: "delete", id: 7 })
		);

		expect(api.exec).toHaveBeenCalledWith("delete-assignment", {
			id: 7,
			...PARAMS,
		});
	});

	it("skips deleting an assignment that is not loaded", () => {
		const { api, events } = getEvents();
		events.processMessage(
			message({ type: "assignment", action: "delete", id: 7 })
		);

		expect(api.exec).not.toHaveBeenCalled();
	});
});

describe("event stream", () => {
	it("listens to the stream messages", async () => {
		const { api, events, sources } = getRemoteEvents({
			tasks: [{ id: 1 }],
		});

		const connected = events.connect(api as any);
		sources[0].open();
		await connected;

		sources[0].send({
			from: "other-client",
			type: "task",
			action: "delete",
			id: 1,
		});

		expect(api.exec).toHaveBeenCalledWith("delete-task", {
			id: 1,
			...PARAMS,
		});
	});

	it("uses the configured url", async () => {
		const { api, events, sources } = getRemoteEvents(
			{},
			{ url: "/api/events" }
		);
		events.connect(api as any);

		expect(sources[0].url).to.eq(`/api/events?clientId=${events.clientId}`);
	});

	it("adds the client id to the custom params", () => {
		const { api, events, sources } = getRemoteEvents(
			{},
			{ url: "/api/events", params: { project: "1" } }
		);
		events.connect(api as any);

		expect(sources[0].url).to.eq(
			`/api/events?project=1&clientId=${events.clientId}`
		);
	});

	it("adds the client id to the params from a function", () => {
		const { api, events, sources } = getRemoteEvents(
			{},
			{ url: "/api/events", params: () => ({ project: "1" }) }
		);
		events.connect(api as any);

		expect(sources[0].url).to.eq(
			`/api/events?project=1&clientId=${events.clientId}`
		);
	});

	it("does not let the params override the client id", () => {
		const { api, events, sources } = getRemoteEvents(
			{},
			{ url: "/api/events", params: { clientId: "other" } }
		);
		events.connect(api as any);

		expect(sources[0].url).to.eq(`/api/events?clientId=${events.clientId}`);
	});

	it("passes withCredentials to the event source", () => {
		const { api, events, sources } = getRemoteEvents(
			{},
			{ withCredentials: true }
		);
		events.connect(api as any);

		expect(sources[0].init?.withCredentials).to.eq(true);
	});

	it("does not change the passed config", () => {
		const params = { project: "1" };
		const config: EventStreamConfig = { url: "/events", params };
		new RemoteEvents(new RestDataProvider(""), config);

		expect(config).to.deep.eq({ url: "/events", params });
	});

	it("keeps instances with a shared config apart", async () => {
		const config: EventStreamConfig = { url: "/events" };
		const first = mockApi({ tasks: [{ id: 1 }] });
		const second = mockApi({ tasks: [{ id: 1 }] });
		const firstEvents = new RemoteEvents(new RestDataProvider(""), config);
		const secondEvents = new RemoteEvents(new RestDataProvider(""), config);

		firstEvents.connect(first as any);
		const connected = secondEvents.connect(second as any);
		const sources = FakeEventSource.instances;
		sources[1].open();
		await connected;

		sources[1].send(message({ type: "task", action: "delete", id: 1 }));

		expect(second.exec).toHaveBeenCalled();
		expect(first.exec).not.toHaveBeenCalled();
	});

	it("keeps a custom message handler", async () => {
		const onMessage = vi.fn();
		const { api, events, sources } = getRemoteEvents(
			{ tasks: [{ id: 1 }] },
			{ onMessage }
		);

		const connected = events.connect(api as any);
		sources[0].open();
		await connected;

		const event = {
			from: "other-client",
			type: "task",
			action: "delete",
			id: 1,
		};
		sources[0].send(event);

		expect(onMessage).toHaveBeenCalledWith(JSON.stringify(event));
		expect(api.exec).not.toHaveBeenCalled();
	});

	it("stops listening after a disconnect", async () => {
		const { api, events, sources } = getRemoteEvents({
			tasks: [{ id: 1 }],
		});

		const connected = events.connect(api as any);
		sources[0].open();
		await connected;

		events.disconnect();
		sources[0].send({
			from: "other-client",
			type: "task",
			action: "delete",
			id: 1,
		});

		expect(sources[0].readyState).to.eq(FakeEventSource.CLOSED);
		expect(api.exec).not.toHaveBeenCalled();
	});

	it("keeps applying the messages after a reconnect", async () => {
		const { api, events, sources } = getRemoteEvents({
			tasks: [{ id: 1 }],
		});

		const connected = events.connect(api as any);
		sources[0].open();
		await connected;

		events.disconnect();
		const reconnected = events.connect(api as any);
		sources[1].open();
		await reconnected;

		sources[1].send({
			from: "other-client",
			type: "task",
			action: "delete",
			id: 1,
		});

		expect(api.exec).toHaveBeenCalledWith("delete-task", {
			id: 1,
			...PARAMS,
		});
	});
});

describe("resync", () => {
	it("reports a resync to the host", async () => {
		const onResync = vi.fn();
		const { api, events, sources } = getRemoteEvents(
			{ tasks: [{ id: 1 }] },
			{ onResync }
		);

		const connected = events.connect(api as any);
		sources[0].open();
		await connected;
		expect(onResync).not.toHaveBeenCalled();

		events.disconnect();
		const reconnected = events.connect(api as any);
		sources[1].open();
		await reconnected;
		expect(onResync).toHaveBeenCalledOnce();
	});

	it("keeps applying the events during the host's reload", async () => {
		const { api, events, sources } = getRemoteEvents(
			{ tasks: [{ id: 1 }] },
			{ onResync: vi.fn() }
		);

		const connected = events.connect(api as any);
		sources[0].open();
		await connected;

		events.disconnect();
		const reconnected = events.connect(api as any);
		sources[1].open();
		await reconnected;

		sources[1].send(message({ type: "task", action: "delete", id: 1 }));
		expect(api.exec).toHaveBeenCalledWith("delete-task", {
			id: 1,
			...PARAMS,
		});
	});
});

describe("remount", () => {
	it("applies the events to the remounted component", async () => {
		const { api, events, sources } = getRemoteEvents({
			tasks: [{ id: 1 }],
		});

		const connected = events.connect(api as any);
		sources[0].open();
		await connected;

		const nextApi = mockApi({ tasks: [{ id: 1 }] });
		await events.connect(nextApi as any);

		sources[0].send(message({ type: "task", action: "delete", id: 1 }));
		expect(nextApi.exec).toHaveBeenCalledWith("delete-task", {
			id: 1,
			...PARAMS,
		});
		expect(api.exec).not.toHaveBeenCalled();
	});

	it("keeps applying the events when the same api is connected again", async () => {
		const { api, events, sources } = getRemoteEvents({
			tasks: [{ id: 1 }],
		});

		const connected = events.connect(api as any);
		sources[0].open();
		await connected;

		await events.connect(api as any);

		sources[0].send(message({ type: "task", action: "delete", id: 1 }));
		expect(api.exec).toHaveBeenCalledWith("delete-task", {
			id: 1,
			...PARAMS,
		});
	});
});

describe("custom provider", () => {
	function getCustomEvents(provider: IRemoteEventsProvider) {
		const api = mockApi({ tasks: [{ id: 1 }] });
		const events = new RemoteEvents(provider, { url: "/events" });
		events.connect(api as any);
		return { api, events };
	}

	it("applies task events without parseDates", () => {
		const { api, events } = getCustomEvents({ resolveId: id => id });
		events.processMessage(
			message({
				type: "task",
				action: "update",
				id: 1,
				data: { text: "task" },
			})
		);

		expect(api.exec).toHaveBeenCalledWith("update-task", {
			id: 1,
			task: { id: 1, text: "task", parent: undefined },
			...PARAMS,
		});
	});

	it("maps server ids through resolveId", () => {
		const { api, events } = getCustomEvents({
			resolveId: id => (id === 50 ? 1 : id),
		});
		events.processMessage(
			message({ type: "task", action: "delete", id: 50 })
		);

		expect(api.exec).toHaveBeenCalledWith("delete-task", {
			id: 1,
			...PARAMS,
		});
	});
});
