import { amzDate, canonicalQuery, sha256Hex, signV4, uriEncode } from "./sigv4";

export type R2S3 = {
	endpoint: string;
	accessKeyId: string;
	secretAccessKey: string;
};

export type SignedRequest = { url: string; headers: Record<string, string> };

export type S3ListPage = {
	result: { key: string; size: number; etag: string }[];
	result_info: { is_truncated: boolean; cursor?: string };
};

export const EMPTY_SHA256 = sha256Hex("");

export function r2S3FromEnv(
	accountId: string,
	env: Record<string, string | undefined> = process.env,
): R2S3 | undefined {
	const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim() || "";
	const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim() || "";
	const override =
		env.CLOUDFLARE_R2_S3_ENDPOINT?.trim().replace(/\/+$/, "") || "";
	const endpoint =
		override ||
		(accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
	if (!accessKeyId || !secretAccessKey || !endpoint) return undefined;
	return { endpoint, accessKeyId, secretAccessKey };
}

export function s3Request(
	s3: R2S3,
	bucket: string,
	method: string,
	key: string | undefined,
	opts: { query?: Record<string, string>; body?: Uint8Array; now?: Date } = {},
): SignedRequest {
	const segments = [bucket, ...(key === undefined ? [] : key.split("/"))];
	if (segments.some((s) => s === "." || s === "..")) {
		throw new Error("r2 key has a dot segment");
	}
	const base = new URL(s3.endpoint);
	const path = `/${segments.map(uriEncode).join("/")}`;
	const query = canonicalQuery(opts.query ?? {});
	const payloadHash = opts.body ? sha256Hex(opts.body) : EMPTY_SHA256;
	const date = amzDate(opts.now);
	const authorization = signV4({
		method,
		path,
		query,
		headers: {
			host: base.host,
			"x-amz-content-sha256": payloadHash,
			"x-amz-date": date,
		},
		payloadHash,
		region: "auto",
		service: "s3",
		accessKeyId: s3.accessKeyId,
		secretAccessKey: s3.secretAccessKey,
		amzDate: date,
	});
	return {
		url: `${base.origin}${path}${query ? `?${query}` : ""}`,
		headers: {
			Authorization: authorization,
			"x-amz-content-sha256": payloadHash,
			"x-amz-date": date,
		},
	};
}

const XML_ENTITY = /&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g;
const XML_NAMED: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
};

function codePoint(n: number, whole: string): string {
	return Number.isInteger(n) && n >= 0 && n <= 0x10ffff
		? String.fromCodePoint(n)
		: whole;
}

function xmlText(raw: string): string {
	return raw.replace(XML_ENTITY, (whole, e: string) => {
		if (e.startsWith("#x"))
			return codePoint(Number.parseInt(e.slice(2), 16), whole);
		if (e.startsWith("#")) return codePoint(Number(e.slice(1)), whole);
		return XML_NAMED[e] ?? whole;
	});
}

function xmlTag(xml: string, name: string): string | undefined {
	const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
	return m ? xmlText(m[1] ?? "") : undefined;
}

export function parseS3List(xml: string): S3ListPage {
	const result: S3ListPage["result"] = [];
	for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
		const row = m[1] ?? "";
		const key = xmlTag(row, "Key");
		if (key === undefined) continue;
		result.push({
			key,
			size: Number(xmlTag(row, "Size") ?? 0),
			etag: xmlTag(row, "ETag") ?? "",
		});
	}
	const cursor = xmlTag(xml, "NextContinuationToken");
	return {
		result,
		result_info: {
			is_truncated: xmlTag(xml, "IsTruncated") === "true",
			...(cursor ? { cursor } : {}),
		},
	};
}
