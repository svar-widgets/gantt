import { vi } from "vitest";

export class FakeEventSource {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSED = 2;
	static instances: FakeEventSource[] = [];

	public readyState = FakeEventSource.CONNECTING;
	public onopen: () => void;
	public onerror: () => void;
	public onmessage: (message: { data: string }) => void;

	constructor(
		public url: string,
		public init?: EventSourceInit
	) {
		FakeEventSource.instances.push(this);
	}

	open() {
		this.readyState = FakeEventSource.OPEN;
		this.onopen?.();
	}

	// The browser gave up on the stream and will not reopen it
	fail() {
		this.readyState = FakeEventSource.CLOSED;
		this.onerror?.();
	}

	// A connection level drop the browser retries on its own
	drop() {
		this.readyState = FakeEventSource.CONNECTING;
		this.onerror?.();
	}

	send(event: unknown) {
		this.onmessage?.({
			data: typeof event === "string" ? event : JSON.stringify(event),
		});
	}

	close() {
		this.readyState = FakeEventSource.CLOSED;
	}
}

export type TFetchCall = {
	url: string;
	method: string;
	headers: Record<string, string>;
	body?: any;
};

// A route value of this class produces a non-ok response with a text body
export class HttpError {
	constructor(
		public status: number,
		public body = ""
	) {}
}

// routes are keyed by "METHOD /url"; an Error value makes the request fail
export function mockFetch(routes: Record<string, any> = {}) {
	const calls: TFetchCall[] = [];

	globalThis.fetch = (async (url: string, req: any) => {
		calls.push({
			url,
			method: req.method,
			headers: req.headers,
			body: req.body ? JSON.parse(req.body) : undefined,
		});

		const response = routes[`${req.method} ${url}`];
		if (response instanceof Error) throw response;
		if (response instanceof HttpError) {
			return {
				ok: false,
				status: response.status,
				text: async () => response.body,
			};
		}

		return { ok: true, status: 200, json: async () => response ?? {} };
	}) as any;

	return calls;
}

export function mockApi({
	tasks = [],
	links = [],
	assignments = [],
}: {
	tasks?: any[];
	links?: any[];
	assignments?: any[];
} = {}) {
	const byId = (items: any[]) => (id: any) => items.find(i => i.id === id);

	return {
		exec: vi.fn(),
		getTask: byId(tasks),
		getState: () => ({
			links: { byId: byId(links) },
			assignments: { byId: byId(assignments) },
		}),
	};
}

export function flush(): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, 20));
}

export function silenceLogs() {
	vi.spyOn(console, "log").mockImplementation(() => {});
	vi.spyOn(console, "error").mockImplementation(() => {});
}
