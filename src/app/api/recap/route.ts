import { reviewLinked } from "@/lib/review-window";
import { loadSaveHistory } from "@/phi/lib/history";
import { authed } from "@/server/authed";
import { chartCatalog } from "@/server/charts";
import { getDataHost } from "@/server/data-host";
import { privateJson } from "@/server/http";
import { loadManual } from "@/server/manual";
import { hasRecap } from "@/server/recap-ready";
import { reviewPhaseNow } from "@/server/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	return authed(async (userId) => {
		if (!reviewLinked(reviewPhaseNow())) return privateJson({ ready: false });
		const host = await getDataHost();
		const [manual, token, catalog] = await Promise.all([
			loadManual(host.db, userId),
			host.lib.getBoundToken(host.rt, userId),
			chartCatalog(),
		]);
		if (manual || !token) return privateJson({ ready: false });
		const history = await loadSaveHistory(host.rt, host.db, token);
		return privateJson({ ready: hasRecap(history, catalog.list) });
	});
}
