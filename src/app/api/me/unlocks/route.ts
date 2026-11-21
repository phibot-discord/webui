import { authed } from "@/server/authed";
import { getDataHost } from "@/server/data-host";
import { privateJson } from "@/server/http";
import { unlocksFor } from "@/server/unlocks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	return authed(async (userId) =>
		privateJson(await unlocksFor(await getDataHost(), userId)),
	);
}
