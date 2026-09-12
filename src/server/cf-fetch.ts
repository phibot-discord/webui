import { Agent, fetch as undiciFetch } from "undici";

/**
 * Next.js patches global `fetch` and the Data Cache + default pool serialize
 * dozens of Cloudflare REST calls. Talk to api.cloudflare.com through undici
 * so jacket/KV reads actually overlap.
 */
const agent = new Agent({
	connections: 64,
	pipelining: 1,
	keepAliveTimeout: 30_000,
	keepAliveMaxTimeout: 60_000,
	connectTimeout: 10_000,
	connect: { minVersion: "TLSv1.3" },
});

export type CfFetchInit = {
	method?: string;
	headers?: Record<string, string>;
	body?: string | Buffer | Uint8Array;
};

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
	const res = await undiciFetch(url, {
		method: init.method,
		headers: init.headers,
		body: init.body,
		dispatcher: agent,
	});
	if (res.status === 429 && attempt < 4) {
		await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
		return cfFetch(url, init, attempt + 1);
	}
	return res;
}
