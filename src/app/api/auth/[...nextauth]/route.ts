import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { withBoundAuthUrl } from "@/lib/auth-url";

export async function GET(req: NextRequest) {
	return withBoundAuthUrl(req.headers, () => handlers.GET(req));
}

export async function POST(req: NextRequest) {
	return withBoundAuthUrl(req.headers, () => handlers.POST(req));
}
