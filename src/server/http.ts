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

export function etagMatches(
	ifNoneMatch: string | null | undefined,
	etag: string,
) {
	if (!ifNoneMatch) return false;
	return ifNoneMatch.replace(/W\//, "") === `"${etag}"`;
}

export function attachmentDisposition(filename: string): string {
	const safe = filename.replace(/["\\\r\n]+/g, "_");
	return `attachment; filename="${safe}"`;
}

export function cardImageResponse(
	bytes: Buffer,
	opts: {
		etag: string;
		cacheControl: string;
		request: Request;
		mime?: string;
		ext?: string;
		stats?: CardStats;
		filename?: string;
	},
) {
	const mime = opts.mime ?? "image/png";
	const tag = `"${opts.etag}"`;
	const cacheable = !opts.cacheControl.includes("no-store");
	const extra = statsHeaders(opts.stats);
	if (
		!opts.filename &&
		cacheable &&
		etagMatches(opts.request.headers.get("if-none-match"), opts.etag)
	) {
		return new NextResponse(null, {
			status: 304,
			headers: {
				ETag: tag,
				"Cache-Control": opts.cacheControl,
				...extra,
			},
		});
	}
	const headers: Record<string, string> = {
		"Content-Type": mime,
		ETag: tag,
		"Cache-Control": opts.cacheControl,
		"Content-Length": String(bytes.byteLength),
		...extra,
	};
	if (opts.filename) {
		headers["Content-Disposition"] = attachmentDisposition(opts.filename);
	}
	return new NextResponse(
		new Uint8Array(
			bytes.buffer as ArrayBuffer,
			bytes.byteOffset,
			bytes.byteLength,
		),
		{ status: 200, headers },
	);
}

export function cardRedirectResponse(
	url: string,
	opts: {
		etag: string;
		cacheControl: string;
		stats?: CardStats;
	},
) {
	return new NextResponse(null, {
		status: 302,
		headers: {
			Location: url,
			ETag: `"${opts.etag}"`,
			"Cache-Control": opts.cacheControl,
			...statsHeaders(opts.stats),
		},
	});
}

function statsHeaders(stats?: CardStats): Record<string, string> {
	if (!stats) return {};
	return { [CARD_STATS_HEADER]: encodeCardStats(stats) };
}

export function cardResultResponse(
	result:
		| { redirect: string; etag: string; stats?: CardStats }
		| { bytes: Buffer; etag: string; mime?: string; stats?: CardStats },
	opts: {
		cacheControl: string;
		request: Request;
		filename?: string;
		renderVersion?: string;
	},
) {
	const stats = result.stats;
	const res =
		"redirect" in result
			? cardRedirectResponse(result.redirect, {
					etag: result.etag,
					cacheControl: opts.cacheControl,
					stats,
				})
			: cardImageResponse(result.bytes, {
					etag: result.etag,
					cacheControl: opts.cacheControl,
					request: opts.request,
					mime: result.mime,
					stats,
					filename: opts.filename,
				});
	if (opts.renderVersion) res.headers.set("X-Phi-Render", opts.renderVersion);
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
