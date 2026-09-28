import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger, withDiscordUid } from "@/server/logger";

export async function proxy(req: NextRequest) {
	const session = await auth();
	return withDiscordUid(session?.user?.id, () => {
		const path = req.nextUrl.pathname;
		if (path.startsWith("/api/")) {
			logger.info(`api ${req.method} ${path}`);
			return NextResponse.next();
		}
		if (!session?.user?.id) {
			const url = new URL("/", req.nextUrl);
			url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
			return NextResponse.redirect(url);
		}
		return NextResponse.next();
	});
}

export const config = {
	matcher: ["/me", "/me/:path*", "/api/:path*"],
};
