import type { Metadata } from "next";
import { auth } from "@/auth";
import { ChartBrowser } from "@/components/ChartBrowser";
import { getMessages } from "@/i18n/server";
import { loadTagVotes } from "@/phi/lib/chart-tag-votes";
import { loadBound } from "@/server/bound";
import { browseMine, browseView } from "@/server/chart-browse";
import { chartCatalog } from "@/server/charts";
import { getDataHost } from "@/server/data-host";
import { pageMetadata } from "@/server/og-meta";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("charts", { path: "/charts" });
}

async function myScores(list: Parameters<typeof browseMine>[1]) {
	const userId = (await auth())?.user?.id;
	if (!userId) return null;
	const got = await loadBound(await getDataHost(), userId, { memo: true });
	if ("error" in got) return null;
	return browseMine(got.save, list);
}

export default async function ChartsPage() {
	const [{ m, locale }, catalog, votes] = await Promise.all([
		getMessages(),
		chartCatalog(),
		loadTagVotes().catch(() => undefined),
	]);
	const t = m.charts;
	const mine = await myScores(catalog.list);
	const view = browseView(catalog.list, votes, locale);
	return (
		<main id="content" className="page charts-page">
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<ChartBrowser view={view} mine={mine} />
			<p className="field-hint cb-note">{t.tagsNote}</p>
		</main>
	);
}
