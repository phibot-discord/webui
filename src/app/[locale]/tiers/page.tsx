import type { Metadata } from "next";
import { auth } from "@/auth";
import Link from "@/components/LocaleLink";
import { TierList } from "@/components/TierList";
import { getMessages } from "@/i18n/server";
import { cleanTitle } from "@/lib/tier-list";
import { fill } from "@/phi/lib/card-i18n";
import { objectUrls } from "@/server/asset-links";
import { loadBound } from "@/server/bound";
import { browseMine } from "@/server/chart-browse";
import { chartCatalog } from "@/server/charts";
import { getDataHost } from "@/server/data-host";
import { pageMetadata } from "@/server/og-meta";
import { pickLevel, tierItems, tierLevels } from "@/server/tier-list";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("tiers", { path: "/tiers" });
}

async function myScores(list: Parameters<typeof browseMine>[1]) {
	const userId = (await auth())?.user?.id;
	if (!userId) return null;
	const got = await loadBound(await getDataHost(), userId, { memo: true });
	if ("error" in got) return null;
	return browseMine(got.save, list);
}

function first(v: string | string[] | undefined): string | undefined {
	return Array.isArray(v) ? v[0] : v;
}

export default async function TiersPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const [{ m }, catalog, links, raw] = await Promise.all([
		getMessages(),
		chartCatalog(),
		objectUrls(),
		searchParams,
	]);
	const t = m.tiers;
	const levels = tierLevels(catalog.list);
	const level = pickLevel(levels, first(raw.l));
	if (level === undefined) {
		return (
			<main id="content" className="page tiers-page">
				<h1>{t.title}</h1>
				<p className="lede">{t.lede}</p>
				<p className="callout">{m.charts.none}</p>
			</main>
		);
	}
	const items = tierItems(catalog.list, level, links);
	const scores = await myScores(catalog.list);
	const mine = scores
		? Object.fromEntries(
				items.flatMap((item) => {
					const acc = scores[item.key]?.[1];
					return acc === undefined ? [] : [[item.key, acc] as const];
				}),
			)
		: null;
	return (
		<main id="content" className="page tiers-page">
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<nav className="files-views" aria-label={t.level}>
				<ul>
					{levels.map(({ level: l, count }) => (
						<li key={l}>
							<Link
								href={`/tiers?l=${l}`}
								prefetch={false}
								aria-current={l === level ? "page" : undefined}
							>
								{fill(t.levelOf, { level: l, n: count })}
							</Link>
						</li>
					))}
				</ul>
			</nav>
			<TierList
				key={level}
				level={level}
				items={items}
				mine={mine}
				initial={{ tiers: first(raw.t) ?? "", title: cleanTitle(first(raw.n)) }}
			/>
		</main>
	);
}
