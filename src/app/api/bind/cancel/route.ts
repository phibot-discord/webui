import { authed } from "@/server/authed";
import { cancelQrBind } from "@/server/bind";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
	return authed(async (userId) => {
		const result = await cancelQrBind(userId);
		return Response.json(result);
	});
}
