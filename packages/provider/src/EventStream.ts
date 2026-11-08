export type MessageCallback = (message: string) => void;
export type ResyncCallback = () => void;
export type ConnectionCallback = (online: boolean) => void;

const RETRY_MIN = 1000;
const RETRY_MAX = 30000;

export type EventStreamConfig = {
	url: string;
	onMessage?: MessageCallback;
	onResync?: ResyncCallback;
	onConnectionChange?: ConnectionCallback;
	params?: Record<string, string> | (() => Record<string, string>);
	withCredentials?: boolean;
};

export default class EventStream {
	private config: EventStreamConfig;
	private eventSource: EventSource | null = null;
	private connectedSignal: Promise<void> | null = null; // Resolves when eventSource opens
	private wasOpen = false;
	private hasMissedEvents = false;
	private isOnline = false;
	private rejectConnect: ((reason: Error) => void) | null = null;
	private retryTimer: ReturnType<typeof setTimeout> | null = null;
	private retryDelayMs = RETRY_MIN;
	private isStopped = false;

	public constructor(config: EventStreamConfig) {
		this.config = config;
	}

	public connect(): Promise<void> {
		this.isStopped = false;
		if (this.connectedSignal) return this.connectedSignal;

		this.connectedSignal = new Promise<void>((resolve, reject) => {
			this.rejectConnect = reject;
			this.eventSource = new EventSource(this.getURL(), {
				withCredentials: this.config.withCredentials,
			});
			const source = this.eventSource;

			source.onopen = () => {
				if (this.eventSource !== source) return;
				const resync = this.wasOpen || this.hasMissedEvents;
				this.wasOpen = true;
				this.hasMissedEvents = false;
				this.retryDelayMs = RETRY_MIN;
				this.rejectConnect = null;
				resolve();
				this.notify(true);
				if (resync) this.config.onResync?.();
			};

			source.onerror = () => {
				if (this.eventSource !== source) return;
				this.notify(false);

				if (source.readyState !== EventSource.CLOSED) return;

				this.close();
				this.hasMissedEvents = true;
				this.rejectConnect?.(
					new Error("could not open the event stream")
				);
				this.rejectConnect = null;
				this.scheduleRetry();
			};

			source.onmessage = (message: MessageEvent<string>) => {
				if (this.eventSource !== source) return;
				this.config.onMessage?.(message.data);
			};
		});

		return this.connectedSignal;
	}

	public disconnect() {
		this.isStopped = true;
		this.clearRetry();
		this.close();
		this.rejectConnect?.(
			new Error("disconnected before the stream was open")
		);
		this.rejectConnect = null;
		this.notify(false);
	}

	private scheduleRetry() {
		if (this.isStopped || this.retryTimer) return;
		const delayMs = this.retryDelayMs * (0.5 + Math.random() / 2);
		this.retryDelayMs = Math.min(this.retryDelayMs * 2, RETRY_MAX);
		this.retryTimer = setTimeout(() => {
			this.retryTimer = null;
			if (this.isStopped) return;
			this.connect().catch(() => {});
		}, delayMs);
	}

	private clearRetry() {
		if (this.retryTimer) clearTimeout(this.retryTimer);
		this.retryTimer = null;
		this.retryDelayMs = RETRY_MIN;
	}

	private close() {
		this.eventSource?.close();
		this.eventSource = null;
		this.connectedSignal = null;
	}

	private notify(isOnline: boolean) {
		if (this.isOnline === isOnline) return;
		this.isOnline = isOnline;
		try {
			this.config.onConnectionChange?.(isOnline);
		} catch (error) {
			console.error(error);
		}
	}

	private getURL(): string {
		const { url, params } = this.config;
		const query = new URLSearchParams(
			typeof params === "function" ? params() : params
		).toString();
		if (!query) return url;
		return url + (url.includes("?") ? "&" : "?") + query;
	}
}
