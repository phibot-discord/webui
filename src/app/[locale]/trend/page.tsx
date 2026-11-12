import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CardNav } from "@/components/CardNav";
import { Desk } from "@/components/Desk";
import { RksTrend } from "@/components/RksTrend";
import { signInHref } from "@/i18n/server";
import { loadSaveHistory } from "@/phi/lib/history";
import { loadCardDesk } from "@/server/card-desk";
import { chartCatalog } from "@/server/charts";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { pageMetadata } from "@/server/og-meta";
import { trendView } from "@/server/save-views";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("trend", { noindex: true });
}

export default async function TrendPage() {
	const session = await auth();
	if (!session?.user?.id) redirect(await signInHref("/trend"));
	const userId = session.user.id;
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		const [loaded, catalog] = await Promise.all([
			loadCardDesk(host, userId),
			chartCatalog(),
		]);
		if ("gate" in loaded) return loaded.gate;
		const { save, token } = loaded.bound;
		const history = await loadSaveHistory(host.rt, host.db, token);
		return (
			<Desk {...loaded.desk} nav={<CardNav current="trend" />}>
				<RksTrend view={trendView(save, history, catalog.list)} />
			</Desk>
		);
	});
}
