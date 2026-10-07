import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withDiscordUid } from "@/server/logger";

/** Signed-out visitors to /me go to the landing page, which offers sign-in and returns them */
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

// Not /api/*: every route checks the session itself (`authed`), and running here
// first only added an invocation and a JWT decrypt, ahead of the CDN on public cards
export const config = {
	matcher: ["/me", "/me/:path*"],
};
