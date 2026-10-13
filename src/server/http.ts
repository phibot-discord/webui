import { NextResponse } from "next/server";
import {
	CARD_STATS_HEADER,
	type CardStats,
	encodeCardStats,
} from "@/lib/card-stats";

export function jsonError(status: number, error: string, code?: string) {
	return NextResponse.json(code ? { error, code } : { error }, {
		status,
		headers: { "Cache-Control": "no-store" },
	});
}

/** If-None-Match uses weak comparison: lists, W/ tags and `*` match */
export function etagMatches(
	ifNoneMatch: string | null | undefined,
	etag: string,
) {
	if (!ifNoneMatch) return false;
	const want = `"${etag}"`;
	return ifNoneMatch.split(",").some((tag) => {
		const t = tag.trim().replace(/^W\//, "");
		return t === want || t === "*";
	});
}

/** Only no-cache / Pragma counts; a plain revalidation does not */
export function wantsReload(headers: Headers): boolean {
	const cc = headers.get("cache-control") ?? "";
	if (/(^|,)\s*no-cache\s*(,|$)/i.test(cc)) return true;
	return /(^|,)\s*no-cache\s*(,|$)/i.test(headers.get("pragma") ?? "");
}

function attachmentDisposition(filename: string): string {
	const safe = filename.replace(/["\\\r\n]+/g, "_");
	return `attachment; filename="${safe}"`;
}

/** Carries the stats so a revalidated view still reports them */
function notModifiedResponse(opts: {
	etag: string;
	cacheControl: string;
	stats?: CardStats;
}) {
	return new NextResponse(null, {
		status: 304,
		headers: {
			ETag: `"${opts.etag}"`,
			"Cache-Control": opts.cacheControl,
			...statsHeaders(opts.stats),
		},
	});
}

/** A matching If-None-Match gets a 304; `etag` is unquoted */
export function jsonEtagResponse(
	request: Request,
	json: string,
	etag: string,
	cacheControl: string,
): Response {
	if (etagMatches(request.headers.get("if-none-match"), etag)) {
		return notModifiedResponse({ etag, cacheControl });
	}
	return new Response(json, {
		status: 200,
		headers: {
			ETag: `"${etag}"`,
			"Cache-Control": cacheControl,
			"Content-Type": "application/json; charset=utf-8",
		},
	});
}

function statsHeaders(stats?: CardStats): Record<string, string> {
	if (!stats) return {};
	return { [CARD_STATS_HEADER]: encodeCardStats(stats) };
}

export function cardResultResponse(
	result: {
		bytes: Buffer;
		etag: string;
		mime?: string;
		stats?: CardStats;
		notModified?: boolean;
	},
	opts: {
		cacheControl: string;
		filename?: string;
		renderVersion?: string;
		vary?: string;
	},
) {
	let res: NextResponse;
	if (result.notModified) {
		res = notModifiedResponse({
			etag: result.etag,
			cacheControl: opts.cacheControl,
			stats: result.stats,
		});
	} else {
		const headers: Record<string, string> = {
			"Content-Type": result.mime ?? "image/png",
			ETag: `"${result.etag}"`,
			"Cache-Control": opts.cacheControl,
			"Content-Length": String(result.bytes.byteLength),
			...statsHeaders(result.stats),
		};
		if (opts.filename) {
			headers["Content-Disposition"] = attachmentDisposition(opts.filename);
		}
		res = new NextResponse(
			new Uint8Array(
				result.bytes.buffer as ArrayBuffer,
				result.bytes.byteOffset,
				result.bytes.byteLength,
			),
			{ status: 200, headers },
		);
	}
	if (opts.renderVersion) res.headers.set("X-Phi-Render", opts.renderVersion);
	if (opts.vary) res.headers.append("Vary", opts.vary);
	return res;
}

export function retryAfter(seconds: number, error: string, code?: string) {
	return NextResponse.json(
		code
			? { error, code, retryAfter: seconds }
			: { error, retryAfter: seconds },
		{
			status: 429,
			headers: {
				"Retry-After": String(seconds),
				"Cache-Control": "no-store",
			},
		},
	);
}
