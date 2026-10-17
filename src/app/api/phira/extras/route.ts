import { songHistory } from "@/server/history";
import { phiraExtras } from "@/server/phira";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const id = new URL(request.url).searchParams.get("id") || "";
	const [levels, history] = await Promise.all([
		phiraExtras(id),
		songHistory(id).catch(() => undefined),
	]);
	return Response.json(
		{
			levels,
			...(history
				? { history: { current: history.current, eras: history.eras } }
				: {}),
		},
		{ headers: { "Cache-Control": "private, no-store" } },
	);
}
