import { beforeEach, describe, expect, it, vi } from "vitest";
import { tempID } from "@svar-ui/lib-state";
import { RestDataProvider } from "../src/index";
import {
	flush,
	HttpError,
	mockFetch,
	silenceLogs,
	TFetchCall,
} from "./helpers";

let calls: TFetchCall[];

function getProvider(routes: Record<string, any> = {}, config?: any) {
	calls = mockFetch(routes);
	return { provider: new RestDataProvider("", config) };
}

// a bare provider: these tests install their own fetch instead of mockFetch
function getDataStore() {
	const provider = new RestDataProvider("");
	return { provider };
}

function handlerOf(provider: RestDataProvider, name: string) {
	return (provider.getHandlers() as any)[name].handler;
}

function getTask() {
	return {
		id: 1,
		start: new Date(2026, 3, 1),
		end: new Date(2026, 3, 5),
		deadline: new Date(2026, 3, 20),
		constraint: { type: "fnlt", date: new Date(2026, 3, 14) },
		segments: [{ start: new Date(2026, 3, 1), end: new Date(2026, 3, 2) }],
	} as any;
}

// the store hands its own task object to the handlers, it must come back untouched
function expectDates(task: any) {
	expect(task.start).toBeInstanceOf(Date);
	expect(task.end).toBeInstanceOf(Date);
	expect(task.deadline).toBeInstanceOf(Date);
	expect(task.constraint.date).toBeInstanceOf(Date);
	expect(task.segments[0].start).toBeInstanceOf(Date);
	expect(task.segments[0].end).toBeInstanceOf(Date);
}

beforeEach(() => {
	silenceLogs();
	calls = mockFetch();
});

describe("data provider", () => {
	it("can be initialized", () => {
		const { provider } = getProvider();
		expect(provider).to.not.eq(null);
	});
});

describe("requests", () => {
	it("sends no client id by itself", async () => {
		const { provider } = getProvider();
		await provider.send("tasks", "GET");
		expect(calls[0].headers).to.not.have.property("X-Client-Id");
	});

	it("sends the headers set on the provider", async () => {
		const { provider } = getProvider();
		provider.setHeaders({ "X-Client-Id": "client" });
		await provider.send("tasks", "GET");
		expect(calls[0].headers["X-Client-Id"]).to.eq("client");
	});

	it("accepts custom headers", async () => {
		const { provider } = getProvider();
		await provider.send("tasks", "GET", null, { "X-Test": "1" });
		expect(calls[0].headers["X-Test"]).to.eq("1");
	});

	it("sends no body for a request without data", async () => {
		const { provider } = getProvider();
		await provider.send("tasks", "GET");
		expect(calls[0].body).to.eq(undefined);
	});

	it("formats the dates in the payload", async () => {
		const { provider } = getProvider();
		await provider.send("tasks", "POST", {
			start: new Date(2024, 0, 15, 10, 30, 0),
			nested: { end: new Date(2024, 0, 16, 0, 0, 0) },
			list: [{ deadline: new Date(2024, 0, 17, 23, 59, 59) }],
			text: "task",
		});

		expect(calls[0].body).to.deep.eq({
			start: "2024-01-15 10:30:00",
			nested: { end: "2024-01-16 00:00:00" },
			list: [{ deadline: "2024-01-17 23:59:59" }],
			text: "task",
		});
	});

	it("rejects for a non-json response", async () => {
		const { provider } = getProvider();
		globalThis.fetch = (async () => ({
			ok: true,
			json: async () => {
				throw new Error("not json");
			},
		})) as any;

		await expect(provider.send("tasks", "GET")).rejects.toThrow("not json");
	});

	it("rejects a failed request with the server error", async () => {
		const { provider } = getProvider({
			"GET /tasks": new HttpError(500, "database is not ready"),
		});

		await expect(provider.send("tasks", "GET")).rejects.toThrow(
			/500.*database is not ready/
		);
	});
});

describe("get data", () => {
	const tasks = [
		{
			id: 1,
			text: "task",
			start: "2024-01-15 00:00:00",
			end: "2024-01-16 00:00:00",
			base_start: "2024-01-14 00:00:00",
			base_end: "2024-01-17 00:00:00",
			deadline: "2024-01-18 00:00:00",
		},
	];

	it("loads tasks and links", async () => {
		const { provider } = getProvider({
			"GET /tasks": tasks,
			"GET /links": [{ id: 2 }],
		});

		const data = await provider.getData();
		expect(data.tasks.length).to.eq(1);
		expect(data.links).to.deep.eq([{ id: 2 }]);
		expect(data.resources).to.eq(undefined);
		expect(data.assignments).to.eq(undefined);
	});

	it("parses the dates", async () => {
		const { provider } = getProvider({
			"GET /tasks": tasks,
			"GET /links": [],
		});
		const [task] = (await provider.getData()).tasks;

		["start", "end", "base_start", "base_end", "deadline"].forEach(key => {
			expect(task[key], key).to.be.instanceOf(Date);
		});
		expect(task.start.valueOf()).to.eq(
			new Date("2024-01-15 00:00:00").valueOf()
		);
	});

	it("loads a branch by id", async () => {
		const { provider } = getProvider({
			"GET /tasks/7": [],
			"GET /links/7": [],
		});
		await provider.getData(7);

		expect(calls.map(c => c.url)).to.deep.eq(["/tasks/7", "/links/7"]);
	});

	it("loads resources for the root request only", async () => {
		const { provider } = getProvider({
			"GET /tasks": [],
			"GET /links": [],
			"GET /tasks/7": [],
			"GET /links/7": [],
			"GET /resources": [{ id: 3 }],
		});

		const root = await provider.getData(null, { resources: true });
		expect(root.resources).to.deep.eq([{ id: 3 }]);

		calls.length = 0;
		await provider.getData(7, { resources: true });
		expect(calls.some(c => c.url === "/resources")).to.eq(false);
	});

	it("loads assignments for any request", async () => {
		const { provider } = getProvider({
			"GET /tasks": [],
			"GET /links": [],
			"GET /tasks/7": [],
			"GET /links/7": [],
			"GET /assignments": [{ id: 4 }],
			"GET /assignments/7": [{ id: 5 }],
		});

		expect(
			(await provider.getData(null, { assignments: true })).assignments
		).to.deep.eq([{ id: 4 }]);
		expect(
			(await provider.getData(7, { assignments: true })).assignments
		).to.deep.eq([{ id: 5 }]);
	});

	it("rejects when a part of the snapshot fails", async () => {
		const { provider } = getProvider({
			"GET /tasks": tasks,
			"GET /links": new HttpError(500, "database is not ready"),
		});

		await expect(provider.getData()).rejects.toThrow(
			/database is not ready/
		);
	});
});

describe("handlers", () => {
	it("adds a task", async () => {
		const { provider } = getProvider();
		await handlerOf(
			provider,
			"add-task"
		)({
			id: 1,
			task: { text: "task", parent: 2 },
			target: 3,
			mode: "after",
			index: 4,
		});

		expect(calls[0].url).to.eq("/tasks");
		expect(calls[0].method).to.eq("POST");
		expect(calls[0].body).to.deep.eq({
			task: { text: "task", parent: 2 },
			index: 4,
			mode: "after",
			target: 3,
		});
	});

	it("updates a task without the data field", async () => {
		const { provider } = getProvider();
		await handlerOf(
			provider,
			"update-task"
		)({
			id: 1,
			task: { text: "task", data: [{ id: 2 }] },
		});

		expect(calls[0].url).to.eq("/tasks/1");
		expect(calls[0].method).to.eq("PUT");
		expect(calls[0].body).to.deep.eq({ text: "task" });
	});

	it("debounces the task updates", () => {
		const { provider } = getProvider();
		expect((provider.getHandlers() as any)["update-task"].debounce).to.eq(
			500
		);
	});

	it("deletes a task", async () => {
		const { provider } = getProvider();
		await handlerOf(provider, "delete-task")({ id: 1 });

		expect(calls[0].url).to.eq("/tasks/1");
		expect(calls[0].method).to.eq("DELETE");
	});

	it("copies a task", async () => {
		const { provider } = getProvider();
		await handlerOf(
			provider,
			"copy-task"
		)({
			id: 9,
			source: 1,
			target: 2,
			mode: "child",
			index: 0,
			lazy: true,
		});

		expect(calls[0].url).to.eq("/tasks/1");
		expect(calls[0].body).to.deep.eq({
			operation: "copy",
			id: 9,
			target: 2,
			mode: "child",
			index: 0,
			lazy: true,
		});
	});

	it("moves a task", async () => {
		const { provider } = getProvider();
		await handlerOf(
			provider,
			"move-task"
		)({
			id: 1,
			target: 2,
			mode: "after",
		});

		expect(calls[0].body).to.deep.eq({
			operation: "move",
			target: 2,
			mode: "after",
		});
	});

	it("skips a move in progress", async () => {
		const { provider } = getProvider();
		await handlerOf(provider, "move-task")({ id: 1, inProgress: true });

		expect(calls.length).to.eq(0);
	});

	it("adds a link", async () => {
		const { provider } = getProvider();
		await handlerOf(
			provider,
			"add-link"
		)({
			id: 1,
			link: { source: 2, target: 3, type: "e2s" },
		});

		expect(calls[0].url).to.eq("/links");
		expect(calls[0].body).to.deep.eq({
			source: 2,
			target: 3,
			type: "e2s",
		});
	});

	it("updates and deletes a link", async () => {
		const { provider } = getProvider();
		await handlerOf(
			provider,
			"update-link"
		)({ id: 1, link: { type: "s2s" } });
		await handlerOf(provider, "delete-link")({ id: 1 });

		expect(calls[0]).to.include({ url: "/links/1", method: "PUT" });
		expect(calls[1]).to.include({ url: "/links/1", method: "DELETE" });
	});

	it("adds an assignment", async () => {
		const { provider } = getProvider();
		await handlerOf(
			provider,
			"add-assignment"
		)({
			id: 1,
			assignment: { task: 2, resource: 3, value: 8 },
		});

		expect(calls[0].url).to.eq("/assignments");
		expect(calls[0].body).to.deep.eq({ task: 2, resource: 3, value: 8 });
	});

	it("updates and deletes an assignment", async () => {
		const { provider } = getProvider();
		await handlerOf(
			provider,
			"update-assignment"
		)({
			id: 1,
			assignment: { value: 4 },
		});
		await handlerOf(provider, "delete-assignment")({ id: 1 });

		expect(calls[0]).to.include({ url: "/assignments/1", method: "PUT" });
		expect(calls[1]).to.include({
			url: "/assignments/1",
			method: "DELETE",
		});
	});
});

describe("batching", () => {
	it("sends the requests one by one without a batch url", async () => {
		const { provider } = getProvider();
		await Promise.all([
			provider.sendBatch("tasks/1", "PUT", { text: "a" }),
			provider.sendBatch("tasks/2", "PUT", { text: "b" }),
		]);

		expect(calls.map(c => c.url)).to.deep.eq(["/tasks/1", "/tasks/2"]);
	});

	it("sends a single request directly", async () => {
		const { provider } = getProvider({}, { batchURL: "batch" });
		await provider.sendBatch("tasks/1", "PUT", { text: "a" });

		expect(calls.length).to.eq(1);
		expect(calls[0].url).to.eq("/tasks/1");
	});

	it("packs the requests of one window together", async () => {
		const { provider } = getProvider(
			{ "POST /batch": [{ id: 1 }, { id: 2 }] },
			{ batchURL: "batch" }
		);

		const results = await Promise.all([
			provider.sendBatch("tasks", "POST", { text: "a" }),
			provider.sendBatch("tasks/2", "PUT", { text: "b" }),
		]);

		expect(calls.length).to.eq(1);
		expect(calls[0].url).to.eq("/batch");
		expect(calls[0].body).to.deep.eq([
			{ url: "tasks", method: "POST", data: { text: "a" } },
			{ url: "tasks/2", method: "PUT", data: { text: "b" } },
		]);
		expect(results).to.deep.eq([{ id: 1 }, { id: 2 }]);
	});

	it("rejects only the failed request of a batch", async () => {
		const { provider } = getProvider(
			{ "POST /batch": [{ id: 1 }, { error: "not found" }] },
			{ batchURL: "batch" }
		);

		const ok = provider.sendBatch("tasks", "POST", {});
		const failed = provider.sendBatch("tasks/2", "PUT", {});

		expect(await ok).to.deep.eq({ id: 1 });
		await expect(failed).rejects.toThrow("not found");
	});

	it("rejects everything when the batch is not a list", async () => {
		const { provider } = getProvider(
			{ "POST /batch": { id: 1 } },
			{ batchURL: "batch" }
		);

		const first = provider.sendBatch("tasks", "POST", {});
		const second = provider.sendBatch("tasks/2", "PUT", {});

		await expect(first).rejects.toThrow(/did not return a list/);
		await expect(second).rejects.toThrow(/did not return a list/);
	});

	it("rejects everything when the batch request fails", async () => {
		const { provider } = getProvider(
			{ "POST /batch": new Error("network") },
			{ batchURL: "batch" }
		);

		const first = provider.sendBatch("tasks", "POST", {});
		const second = provider.sendBatch("tasks/2", "PUT", {});

		await expect(first).rejects.toThrow("network");
		await expect(second).rejects.toThrow("network");
	});
});

describe("id resolution", () => {
	it("waits for the id of a task being added", async () => {
		const parentId = tempID();
		const { provider } = getProvider({ "POST /tasks": { id: 100 } });

		provider.exec("add-task", { id: parentId, task: { text: "parent" } });
		await flush();

		provider.exec("add-task", {
			id: tempID(),
			task: { text: "child", parent: parentId },
		});
		await flush();

		const child = calls.find(c => c.body?.task?.text === "child");
		expect(child.body.task.parent).to.eq(100);
	});
});

describe("sending data", () => {
	let body: () => any;

	beforeEach(() => {
		const fetcher = vi.fn(async () => ({
			ok: true,
			json: async () => ({}),
		}));
		global.fetch = fetcher as any;
		body = () => JSON.parse(fetcher.mock.calls[0][1].body);
	});

	it("formats the dates a task carries, at any depth", async () => {
		const { provider } = getDataStore();
		const handler = provider.getHandlers()["update-task"] as any;

		await handler.handler({ id: 1, task: getTask() });

		const sent = body();
		expect(sent.start).to.eq("2026-04-01 00:00:00");
		expect(sent.deadline).to.eq("2026-04-20 00:00:00");
		expect(sent.constraint.date).to.eq("2026-04-14 00:00:00");
		expect(sent.segments[0].start).to.eq("2026-04-01 00:00:00");
	});

	it("leaves the updated task alone", async () => {
		const { provider } = getDataStore();
		const task = getTask();

		await (provider.getHandlers()["update-task"] as any).handler({
			id: 1,
			task,
		});

		expectDates(task);
	});

	it("leaves the added task alone", async () => {
		const { provider } = getDataStore();
		const task = getTask();

		await (provider.getHandlers()["add-task"] as any).handler({
			id: 1,
			task,
			mode: "child",
			target: 2,
		});

		expectDates(task);
	});
});

describe("debounced updates", () => {
	it("a pending save survives a later drag-time update", async () => {
		vi.useFakeTimers();
		const fetcher = vi.fn(async () => ({
			ok: true,
			json: async () => ({}),
		}));
		global.fetch = fetcher as any;
		const { provider } = getDataStore();
		const saved = getTask();

		provider.exec("update-task", { id: 1, task: saved } as any);
		await vi.advanceTimersByTimeAsync(200);
		provider.exec("update-task", {
			id: 1,
			task: { ...saved, start: new Date(2026, 3, 3) },
			inProgress: true,
			skipProvider: true,
		} as any);
		await vi.advanceTimersByTimeAsync(1000);
		vi.useRealTimers();

		expect(fetcher).toHaveBeenCalledTimes(1);
		const sent = JSON.parse(fetcher.mock.calls[0][1].body);
		expect(sent.start).to.eq("2026-04-01 00:00:00");
	});
});

describe("parsing data", () => {
	it("revives the dates a task carries, at any depth", () => {
		const { provider } = getDataStore();

		const [task] = provider.parseDates([
			{
				id: 1,
				start: "2026-04-01 00:00:00",
				end: "2026-04-05 00:00:00",
				base_start: "2026-03-25 00:00:00",
				base_end: "2026-03-30 00:00:00",
				deadline: "2026-04-20 00:00:00",
				constraint: { type: "fnlt", date: "2026-04-14 00:00:00" },
				segments: [
					{
						start: "2026-04-01 00:00:00",
						end: "2026-04-02 00:00:00",
					},
				],
			},
		] as any);

		expectDates(task);
		expect(task.base_start).toBeInstanceOf(Date);
		expect(task.base_end).toBeInstanceOf(Date);
		expect(task.constraint.type).to.eq("fnlt");
	});

	it("skips the dates a task does not carry", () => {
		const { provider } = getDataStore();

		const [task] = provider.parseDates([
			{ id: 1, unscheduled: true },
		] as any);

		expect(task.start).to.eq(undefined);
		expect(task.end).to.eq(undefined);
	});
});
