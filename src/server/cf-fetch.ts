import {
	outgoingAgent,
	outgoingFetch,
	REQUEST_TIMEOUT_MS,
	socketTimeouts,
} from "./outgoing";

const CF_TIMEOUT_MS = 12_000;
const CF_ATTEMPTS = 2;

export const cfAgent = {
	connections: 64,
	pipelining: 1,
	keepAliveTimeout: 30_000,
	keepAliveMaxTimeout: 60_000,
	headersTimeout: CF_TIMEOUT_MS,
	bodyTimeout: REQUEST_TIMEOUT_MS,
	...socketTimeouts(CF_TIMEOUT_MS, { minVersion: "TLSv1.3" }),
};

const agent = outgoingAgent(cfAgent);

export type CfFetchInit = {
	method?: string;
	headers?: Record<string, string>;
	body?: string | Buffer | Uint8Array;
};

/** No response at all (abort, socket reset, connect timeout) — never an HTTP status. */
export function isNoResponseError(err: unknown): boolean {
	for (let cur = err, depth = 0; cur && depth < 4; depth++) {
		const e = cur as { name?: string; code?: string; cause?: unknown };
		if (
			e.name === "TimeoutError" ||
			e.name === "AbortError" ||
			e.name === "ConnectTimeoutError" ||
			e.name === "HeadersTimeoutError" ||
			e.name === "SocketError" ||
			e.code === "UND_ERR_CONNECT_TIMEOUT" ||
			e.code === "UND_ERR_HEADERS_TIMEOUT" ||
			e.code === "UND_ERR_SOCKET" ||
			e.code === "ECONNRESET" ||
			e.code === "ETIMEDOUT" ||
			e.code === "EPIPE"
		)
			return true;
		cur = e.cause;
	}
	return false;
}

export async function cfFetch(
	url: string,
	init: CfFetchInit = {},
	attempt = 0,
): Promise<{
	ok: boolean;
	status: number;
	headers: { get: (name: string) => string | null };
	arrayBuffer: () => Promise<ArrayBuffer>;
	text: () => Promise<string>;
	json: () => Promise<unknown>;
}> {
	let res: Awaited<ReturnType<typeof outgoingFetch>>;
	try {
		res = await outgoingFetch(url, {
			method: init.method,
			headers: init.headers,
			body: init.body,
			signal: AbortSignal.timeout(CF_TIMEOUT_MS),
			dispatcher: agent,
		});
	} catch (err) {
		// KV/R2 PUTs are idempotent, so retrying any method once is safe.
		if (attempt + 1 < CF_ATTEMPTS && isNoResponseError(err)) {
			return cfFetch(url, init, attempt + 1);
		}
		throw err;
	}
	if (res.status === 429 && attempt < 4) {
		await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
		return cfFetch(url, init, attempt + 1);
	}
	return res;
}
