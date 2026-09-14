import { AsyncLocalStorage } from "node:async_hooks";
import { Agent, fetch as undiciFetch } from "undici";

export const TAPAPI_TIMEOUT_MS = 30_000;
export const TAPAPI_SAVE_TIMEOUT_MS = 45_000;
export const TAPAPI_QR_POLL_TIMEOUT_MS = 15_000;

export const tapAgent = {
	connectTimeout: TAPAPI_TIMEOUT_MS,
	headersTimeout: TAPAPI_SAVE_TIMEOUT_MS,
	bodyTimeout: TAPAPI_SAVE_TIMEOUT_MS,
};

const agent = new Agent({
	connections: 8,
	pipelining: 1,
	keepAliveTimeout: 10_000,
	keepAliveMaxTimeout: 30_000,
	...tapAgent,
});

type TapHttp = (
	url: string | URL,
	init?: Record<string, unknown>,
) => Promise<Response>;

const defaultTapHttp: TapHttp = async (url, init) => {
	const res = await undiciFetch(url, init as Parameters<typeof undiciFetch>[1]);
	return res as unknown as Response;
};

let tapHttp: TapHttp = defaultTapHttp;

export function setTapHttpForTest(fn?: TapHttp) {
	tapHttp = fn ?? defaultTapHttp;
}

export class TapApiError extends Error {
	readonly timeout: boolean;

	constructor(message: string, timeout = false) {
		super(message);
		this.name = "TapApiError";
		this.timeout = timeout;
	}
}

export function isTimeoutError(err: unknown): boolean {
	let cur: unknown = err;
	for (let i = 0; i < 4 && cur; i++) {
		if (!(cur instanceof Error)) return false;
		if (
			cur.name === "TimeoutError" ||
			cur.name === "AbortError" ||
			cur.name === "ConnectTimeoutError" ||
			cur.name === "HeadersTimeoutError" ||
			cur.name === "BodyTimeoutError"
		) {
			return true;
		}
		const code = (cur as { code?: string }).code;
		if (typeof code === "string" && /TIMEOUT/i.test(code)) return true;
		if (/timeout|timed out|aborted/i.test(cur.message)) return true;
		cur = cur.cause;
	}
	return false;
}

export function toTapApiError(err: unknown): TapApiError {
	if (err instanceof TapApiError) return err;
	const timeout = isTimeoutError(err);
	const message = err instanceof Error ? err.message : "TapAPI request failed";
	return new TapApiError(timeout ? "TapAPI timed out" : message, timeout);
}

export function isTapApiFailure(err: unknown): boolean {
	return err instanceof TapApiError || isTimeoutError(err);
}

type TapWaitStore = { notify: () => void; sent: boolean };

const tapWait = new AsyncLocalStorage<TapWaitStore>();

export function withTapWait<T>(
	notify: () => void,
	fn: () => Promise<T>,
): Promise<T> {
	return tapWait.run({ notify, sent: false }, fn);
}

function withTimeout(
	signal: AbortSignal | null | undefined,
	timeoutMs: number,
) {
	const timeout = AbortSignal.timeout(timeoutMs);
	return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export async function tapFetch(
	url: string | URL,
	init: RequestInit = {},
	timeoutMs = TAPAPI_TIMEOUT_MS,
): Promise<Response> {
	const ctx = tapWait.getStore();
	if (ctx && !ctx.sent) {
		ctx.sent = true;
		try {
			ctx.notify();
		} catch {}
		await new Promise<void>((resolve) => setImmediate(resolve));
	}
	try {
		const res = await tapHttp(url, {
			...init,
			signal: withTimeout(init.signal, timeoutMs),
			dispatcher: agent,
		});
		if (res.status >= 500) {
			throw new TapApiError(`TapAPI ${res.status} ${res.statusText}`);
		}
		return res;
	} catch (err) {
		throw toTapApiError(err);
	}
}
