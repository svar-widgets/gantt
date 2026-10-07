import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventStream, type EventStreamConfig } from "../src/index";
import { FakeEventSource, silenceLogs } from "./helpers";

function getStream(config?: Partial<EventStreamConfig>) {
	const stream = new EventStream({ url: "/events", ...config });
	return { stream, sources: FakeEventSource.instances };
}

beforeEach(() => {
	silenceLogs();
	FakeEventSource.instances = [];
	globalThis.EventSource = FakeEventSource as any;
});

describe("disconnect", () => {
	it("can be called before connecting", () => {
		const { stream } = getStream();
		expect(() => stream.disconnect()).to.not.throw();
	});

	it("can be called twice", () => {
		const { stream } = getStream();
		stream.disconnect();
		expect(() => stream.disconnect()).to.not.throw();
	});

	it("closes the event stream", async () => {
		const { stream, sources } = getStream();
		const connected = stream.connect();
		sources[0].open();
		await connected;

		stream.disconnect();
		expect(sources[0].readyState).to.eq(FakeEventSource.CLOSED);
	});

	it("rejects a connection in progress", async () => {
		const { stream } = getStream();
		const connected = stream.connect();
		stream.disconnect();
		await expect(connected).rejects.toThrow(/disconnected/);
	});
});

describe("connect", () => {
	it("opens a single stream for concurrent calls", async () => {
		const { stream, sources } = getStream();
		const first = stream.connect();
		const second = stream.connect();

		expect(sources.length).to.eq(1);
		sources[0].open();
		await Promise.all([first, second]);
	});

	it("rejects when the stream cannot be opened", async () => {
		const { stream, sources } = getStream();
		const connected = stream.connect();
		sources[0].fail();

		await expect(connected).rejects.toThrow(/could not open/);
	});

	it("opens a new stream after a disconnect", async () => {
		const { stream, sources } = getStream();
		const connected = stream.connect();
		sources[0].open();
		await connected;

		stream.disconnect();
		const reconnected = stream.connect();
		expect(sources.length).to.eq(2);

		sources[1].open();
		await reconnected;
	});

	it("requests a resync after a reconnect only", async () => {
		const onResync = vi.fn();
		const { stream, sources } = getStream({ onResync });

		const connected = stream.connect();
		sources[0].open();
		await connected;
		expect(onResync).not.toHaveBeenCalled();

		stream.disconnect();
		const reconnected = stream.connect();
		sources[1].open();
		await reconnected;
		expect(onResync).toHaveBeenCalledOnce();
	});

	it("uses the configured url", () => {
		const { stream, sources } = getStream({ url: "/api/stream" });
		stream.connect();

		expect(sources[0].url).to.eq("/api/stream");
	});

	it("adds the params to the url", () => {
		const { stream, sources } = getStream({
			url: "/api/stream",
			params: { project: "1", name: "a b&c" },
		});
		stream.connect();

		expect(sources[0].url).to.eq("/api/stream?project=1&name=a+b%26c");
	});

	it("appends the params to an existing query", () => {
		const { stream, sources } = getStream({
			url: "/api/stream?project=1",
			params: { name: "a" },
		});
		stream.connect();

		expect(sources[0].url).to.eq("/api/stream?project=1&name=a");
	});

	it("keeps the url when the params are empty", () => {
		const { stream, sources } = getStream({
			url: "/api/stream",
			params: {},
		});
		stream.connect();

		expect(sources[0].url).to.eq("/api/stream");
	});

	it("reads the params from a function", () => {
		const { stream, sources } = getStream({
			url: "/api/stream",
			params: () => ({ project: "1" }),
		});
		stream.connect();

		expect(sources[0].url).to.eq("/api/stream?project=1");
	});

	it("does not send credentials by default", () => {
		const { stream, sources } = getStream();
		stream.connect();

		expect(sources[0].init?.withCredentials).to.not.eq(true);
	});

	it("passes withCredentials to the event source", () => {
		const { stream, sources } = getStream({ withCredentials: true });
		stream.connect();

		expect(sources[0].init?.withCredentials).to.eq(true);
	});

	it("passes the messages to the callback", async () => {
		const onMessage = vi.fn();
		const { stream, sources } = getStream({ onMessage });

		const connected = stream.connect();
		sources[0].open();
		await connected;

		sources[0].send({ type: "task" });
		expect(onMessage).toHaveBeenCalledWith('{"type":"task"}');
	});

	it("ignores the messages of an abandoned stream", async () => {
		const onMessage = vi.fn();
		const { stream, sources } = getStream({ onMessage });

		const connected = stream.connect();
		sources[0].open();
		await connected;

		stream.disconnect();
		sources[0].send({ type: "task" });
		expect(onMessage).not.toHaveBeenCalled();
	});
});

describe("reconnect", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// The jitter multiplier becomes 1, so the delay is the full one
		vi.spyOn(Math, "random").mockReturnValue(1);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("opens a new stream after the browser gives up", async () => {
		const { stream, sources } = getStream();
		const connected = stream.connect();
		sources[0].fail();
		await expect(connected).rejects.toThrow(/could not open/);

		await vi.advanceTimersByTimeAsync(1000);
		expect(sources.length).to.eq(2);

		const reconnected = stream.connect();
		sources[1].open();
		await reconnected;
	});

	it("reads the params again for a new stream", async () => {
		let attempt = 0;
		const { stream, sources } = getStream({
			params: () => ({ attempt: String(++attempt) }),
			withCredentials: true,
		});
		const connected = stream.connect();
		sources[0].fail();
		await expect(connected).rejects.toThrow(/could not open/);

		await vi.advanceTimersByTimeAsync(1000);
		expect(sources[1].url).to.eq("/events?attempt=2");
		expect(sources[1].init?.withCredentials).to.eq(true);
	});

	it("waits while the browser retries on its own", async () => {
		const { stream, sources } = getStream();
		const connected = stream.connect();
		sources[0].drop();

		await vi.advanceTimersByTimeAsync(60000);
		expect(sources.length).to.eq(1);

		sources[0].open();
		await connected;
	});

	it("connects again after a failed attempt", async () => {
		const { stream, sources } = getStream();
		const connected = stream.connect();
		sources[0].fail();
		await expect(connected).rejects.toThrow(/could not open/);

		const retried = stream.connect();
		expect(sources.length).to.eq(2);

		sources[1].open();
		await retried;
	});

	it("does not report a dead stream as connected", async () => {
		const { stream, sources } = getStream();
		const connected = stream.connect();
		sources[0].open();
		await connected;

		sources[0].fail();
		const reconnected = stream.connect();
		expect(sources.length).to.eq(2);

		sources[1].open();
		await reconnected;
	});

	it("grows the delay between the attempts", async () => {
		const { stream, sources } = getStream();
		stream.connect().catch(() => {});

		sources[0].fail();
		await vi.advanceTimersByTimeAsync(999);
		expect(sources.length).to.eq(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(sources.length).to.eq(2);

		sources[1].fail();
		await vi.advanceTimersByTimeAsync(1999);
		expect(sources.length).to.eq(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(sources.length).to.eq(3);
	});

	it("resets the delay after a successful open", async () => {
		const { stream, sources } = getStream();
		stream.connect().catch(() => {});

		sources[0].fail();
		await vi.advanceTimersByTimeAsync(1000);
		sources[1].open();

		sources[1].fail();
		await vi.advanceTimersByTimeAsync(1000);
		expect(sources.length).to.eq(3);
	});

	it("stops retrying after a disconnect", async () => {
		const { stream, sources } = getStream();
		stream.connect().catch(() => {});
		sources[0].fail();
		stream.disconnect();

		await vi.advanceTimersByTimeAsync(60000);
		expect(sources.length).to.eq(1);
	});

	it("ignores the events of an abandoned stream", async () => {
		const { stream, sources } = getStream();
		stream.connect().catch(() => {});
		sources[0].fail();

		await vi.advanceTimersByTimeAsync(1000);
		const reconnected = stream.connect();
		sources[1].open();
		await reconnected;

		sources[0].fail();
		expect(sources[1].readyState).to.eq(FakeEventSource.OPEN);
	});

	it("requests a resync when the browser reopens the stream", async () => {
		const onResync = vi.fn();
		const { stream, sources } = getStream({ onResync });
		const connected = stream.connect();
		sources[0].open();
		await connected;

		sources[0].drop();
		sources[0].open();

		expect(sources.length).to.eq(1);
		expect(onResync).toHaveBeenCalledOnce();
	});

	it("requests a resync after a failed first attempt", async () => {
		const onResync = vi.fn();
		const { stream, sources } = getStream({ onResync });
		const connected = stream.connect();
		sources[0].fail();
		await expect(connected).rejects.toThrow(/could not open/);

		await vi.advanceTimersByTimeAsync(1000);
		sources[1].open();

		expect(onResync).toHaveBeenCalledOnce();
	});

	it("reports the connection state", async () => {
		const onConnectionChange = vi.fn();
		const { stream, sources } = getStream({ onConnectionChange });

		const connected = stream.connect();
		sources[0].open();
		await connected;
		expect(onConnectionChange).toHaveBeenLastCalledWith(true);

		sources[0].fail();
		expect(onConnectionChange).toHaveBeenLastCalledWith(false);
		expect(onConnectionChange).toHaveBeenCalledTimes(2);
	});

	it("reports a repeated state once", async () => {
		const onConnectionChange = vi.fn();
		const { stream, sources } = getStream({ onConnectionChange });

		const connected = stream.connect();
		sources[0].open();
		await connected;

		sources[0].drop();
		sources[0].drop();
		expect(onConnectionChange).toHaveBeenCalledTimes(2);
	});
});
