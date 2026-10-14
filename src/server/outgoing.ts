import {
	Agent,
	type Dispatcher,
	type HeadersInit,
	interceptors,
	setGlobalDispatcher,
	type RequestInit as UndiciRequestInit,
	fetch as undiciFetch,
} from "undici";

export const REQUEST_TIMEOUT_MS = 30_000;

export function socketTimeouts(
	ms = REQUEST_TIMEOUT_MS,
	connect?: Record<string, unknown>,
) {
	return {
		connectTimeout: ms,
		connect: { timeout: ms, ...connect },
	};
}

/** Undici ALPN-h2 against TapTap closes the stream with NGHTTP2_PROTOCOL_ERROR */
export const outgoingAgentDefaults = { allowH2: false as const };

/** Longest Retry-After the retry interceptor waits; past that the caller sees the 429/5xx */
export const RETRY_AFTER_CAP_MS = 2_000;

/** `"status"`: only 429/5xx here, tapFetch retries the rest; `false`: cfFetch does every retry */
export function outgoingAgent(
	opts?: ConstructorParameters<typeof Agent>[0],
	{ retry = true }: { retry?: boolean | "status" } = {},
): Dispatcher {
	const agent = new Agent({ ...outgoingAgentDefaults, ...opts });
	if (!retry) return agent;
	return agent.compose(
		interceptors.retry({
			maxRetries: 2,
			minTimeout: 100,
			maxTimeout: RETRY_AFTER_CAP_MS,
			methods: ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"],
			...(retry === "status" ? { errorCodes: [], throwOnError: false } : {}),
		}),
	);
}

const defaultAgent = outgoingAgent({
	connections: 16,
	pipelining: 1,
	keepAliveTimeout: 10_000,
	keepAliveMaxTimeout: 30_000,
	headersTimeout: REQUEST_TIMEOUT_MS,
	bodyTimeout: REQUEST_TIMEOUT_MS,
	...socketTimeouts(),
});

setGlobalDispatcher(defaultAgent);

export type OutgoingInit = {
	method?: string;
	headers?: HeadersInit;
	body?: RequestInit["body"] | Buffer | Uint8Array | string;
	signal?: AbortSignal | null;
	dispatcher?: Dispatcher;
};

/** undici's fetch: Next's drops `dispatcher`, `request()` gets RST by TapTap; a Node `FormData` body is sent as "[object FormData]" */
export async function outgoingFetch(
	url: string | URL,
	init: OutgoingInit = {},
): Promise<Response> {
	const res = await undiciFetch(String(url), {
		method: init.method,
		headers: init.headers,
		body: init.body as UndiciRequestInit["body"],
		signal: init.signal ?? undefined,
		dispatcher: init.dispatcher ?? defaultAgent,
		redirect: "follow",
	});
	return res as unknown as Response;
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

export function errCode(err: unknown): string | undefined {
	return err && typeof err === "object" && "code" in err
		? String((err as { code?: unknown }).code || "")
		: undefined;
}

export function errChain(err: unknown): string {
	const bits: string[] = [];
	let cur: unknown = err;
	for (let i = 0; i < 5 && cur; i++) {
		if (cur instanceof Error) {
			const code = errCode(cur);
			bits.push(
				[cur.name, cur.message, code]
					.filter((p) => p && p !== "undefined")
					.join(" "),
			);
			cur = cur.cause;
			continue;
		}
		bits.push(String(cur));
		break;
	}
	return bits.join(" <- ") || String(err);
}
