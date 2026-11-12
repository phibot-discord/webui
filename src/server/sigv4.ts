import { createHash, createHmac } from "node:crypto";

export type SigV4Request = {
	method: string;
	path: string;
	query: string;
	headers: Record<string, string>;
	payloadHash: string;
	region: string;
	service: string;
	accessKeyId: string;
	secretAccessKey: string;
	amzDate: string;
};

export function sha256Hex(data: string | Uint8Array): string {
	return createHash("sha256").update(data).digest("hex");
}

export function amzDate(now = new Date()): string {
	return now
		.toISOString()
		.replace(/[-:]/g, "")
		.replace(/\.\d{3}/, "");
}

export function uriEncode(value: string): string {
	return encodeURIComponent(value).replace(
		/[!'()*]/g,
		(c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
	);
}

export function canonicalQuery(params: Record<string, string>): string {
	return Object.entries(params)
		.map(([k, v]) => [uriEncode(k), uriEncode(v)] as const)
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([k, v]) => `${k}=${v}`)
		.join("&");
}

function hmac(key: string | Buffer, data: string): Buffer {
	return createHmac("sha256", key).update(data).digest();
}

export function signV4(req: SigV4Request): string {
	const names = Object.keys(req.headers)
		.map((name) => name.toLowerCase())
		.sort();
	const values = new Map(
		Object.entries(req.headers).map(([name, value]) => [
			name.toLowerCase(),
			value.trim().replace(/\s+/g, " "),
		]),
	);
	const signedHeaders = names.join(";");
	const canonical = [
		req.method,
		req.path,
		req.query,
		names.map((name) => `${name}:${values.get(name)}\n`).join(""),
		signedHeaders,
		req.payloadHash,
	].join("\n");
	const day = req.amzDate.slice(0, 8);
	const scope = `${day}/${req.region}/${req.service}/aws4_request`;
	const toSign = [
		"AWS4-HMAC-SHA256",
		req.amzDate,
		scope,
		sha256Hex(canonical),
	].join("\n");
	const key = hmac(
		hmac(
			hmac(hmac(`AWS4${req.secretAccessKey}`, day), req.region),
			req.service,
		),
		"aws4_request",
	);
	const signature = createHmac("sha256", key).update(toSign).digest("hex");
	return `AWS4-HMAC-SHA256 Credential=${req.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}
