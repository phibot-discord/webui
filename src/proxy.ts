import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LOCALE_COOKIE, negotiateLocale } from "@/i18n/config";
import {
	LOCALE_HEADER,
	localePath,
	pathLocale,
	stripLocale,
} from "@/lib/locale-path";
import { withDiscordUid } from "@/server/logger";

const SIGNED_IN_ONLY = /^\/(?:me|account)(?:\/|$)/;

function redirectTo(req: NextRequest, path: string) {
	const res = NextResponse.redirect(new URL(path, req.nextUrl));
	res.headers.set("Cache-Control", "private, no-store");
	res.headers.set("Vary", "Cookie, Accept-Language");
	return res;
}

/** Picks each page's locale from its URL; bare URLs send readers who prefer Chinese to /zh */
export async function proxy(req: NextRequest) {
	const { pathname, search } = req.nextUrl;
	const locale = pathLocale(pathname);
	const bare = stripLocale(pathname);
	if (
		locale === "en" &&
		(req.method === "GET" || req.method === "HEAD") &&
		negotiateLocale(
			req.cookies.get(LOCALE_COOKIE)?.value,
			req.headers.get("accept-language"),
		) === "zh"
	) {
		return redirectTo(req, localePath(pathname + search, "zh"));
	}
	const pass = () => {
		const headers = new Headers(req.headers);
		headers.set(LOCALE_HEADER, locale);
		if (locale === "en") return NextResponse.next({ request: { headers } });
		const url = req.nextUrl.clone();
		url.pathname = bare;
		return NextResponse.rewrite(url, { request: { headers } });
	};
	if (!SIGNED_IN_ONLY.test(bare)) return pass();
	const session = await auth();
	return withDiscordUid(session?.user?.id, () => {
		if (session?.user?.id) return pass();
		const next = encodeURIComponent(pathname + search);
		return redirectTo(req, `${localePath("/", locale)}?next=${next}`);
	});
}

// Not /api/*: every route checks the session itself, and running here cost an invocation ahead of the CDN
export const config = {
	matcher: ["/((?!api(?:/|$)|_next/|render(?:/|$)|.*\\.\\w+$).*)"],
};
