import { NextResponse } from "next/server";

export function jsonError(status: number, error: string, code?: string) {
	return NextResponse.json(code ? { error, code } : { error }, { status });
}

export function cardImageResponse(
	bytes: Buffer,
	opts: {
		etag: string;
		cacheControl: string;
		request: Request;
		mime?: string;
		ext?: string;
	},
) {
	const mime = opts.mime ?? "image/png";
	const inm = opts.request.headers.get("if-none-match");
	const tag = `"${opts.etag}"`;
	const cacheable = !opts.cacheControl.includes("no-store");
	if (cacheable && inm && inm.replace(/W\//, "") === tag) {
		return new NextResponse(null, {
			status: 304,
			headers: {
				ETag: tag,
				"Cache-Control": opts.cacheControl,
			},
		});
	}
	return new NextResponse(new Uint8Array(bytes), {
		status: 200,
		headers: {
			"Content-Type": mime,
			ETag: tag,
			"Cache-Control": opts.cacheControl,
			"Content-Length": String(bytes.byteLength),
		},
	});
}

export function pngResponse(
	bytes: Buffer,
	opts: { etag: string; cacheControl: string; request: Request },
) {
	return cardImageResponse(bytes, opts);
}

export function retryAfter(seconds: number, error: string, code?: string) {
	return NextResponse.json(code ? { error, code } : { error }, {
		status: 429,
		headers: { "Retry-After": String(seconds) },
	});
}
