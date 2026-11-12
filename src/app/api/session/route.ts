import { auth } from "@/auth";
import { headerSession } from "@/server/header-session";
import { privateJson } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	return privateJson(headerSession(await auth()));
}
