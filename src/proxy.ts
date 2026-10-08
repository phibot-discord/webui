import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withDiscordUid } from "@/server/logger";

export async function proxy(req: NextRequest) {
	const session = await auth();
	return withDiscordUid(session?.user?.id, () => {
		if (!session?.user?.id) {
			const url = new URL("/", req.nextUrl);
			url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
			return NextResponse.redirect(url);
		}
		return NextResponse.next();
	});
}

// Not /api/*: every route checks the session itself, and running here added an invocation and a JWT decrypt ahead of the CDN
export const config = {
	matcher: ["/me", "/me/:path*", "/account"],
};
