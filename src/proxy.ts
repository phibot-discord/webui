import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function proxy(req: NextRequest) {
	const session = await auth();
	if (!session?.user?.id) {
		const url = new URL("/", req.nextUrl);
		url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
		return NextResponse.redirect(url);
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/me", "/me/:path*"],
};
