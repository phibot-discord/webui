import { authed } from "@/server/authed";
import { resetMigrate } from "@/server/migrate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
	return authed(async (userId) => {
		await resetMigrate(userId);
		return Response.json({ ok: true });
	});
}
