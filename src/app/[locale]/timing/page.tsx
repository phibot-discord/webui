import type { Metadata } from "next";
import { TimingTest } from "@/components/TimingTest";
import { getMessages } from "@/i18n/server";
import { browseView } from "@/server/chart-browse";
import { chartCatalog } from "@/server/charts";
import { pageMetadata } from "@/server/og-meta";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("timing", { path: "/timing" });
}

export default async function TimingPage() {
	const [{ m, locale }, catalog] = await Promise.all([
		getMessages(),
		chartCatalog().catch(() => undefined),
	]);
	const t = m.timing;
	const densities: number[] = [];
	if (catalog) {
		const view = browseView(catalog.list, undefined, locale);
		for (const chart of view.charts) {
			const length = view.songs[chart[0]]?.length;
			if (length && chart[3] > 0)
				densities.push(Math.round((chart[3] / length) * 100) / 100);
		}
		densities.sort((a, b) => a - b);
	}
	return (
		<main id="content" className="page timing-page">
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<TimingTest densities={densities} />
		</main>
	);
}
