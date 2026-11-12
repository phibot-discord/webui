import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { CardNav } from "@/components/CardNav";
import { Desk } from "@/components/Desk";
import { DifficultyTable } from "@/components/DifficultyTable";
import { PlayerProfile } from "@/components/PlayerProfile";
import { ProfileTimeline } from "@/components/ProfileTimeline";
import { ProfileType } from "@/components/ProfileType";
import { getMessages, signInHref } from "@/i18n/server";
import { bareId } from "@/lib/chart-catalog";
import { loadTagVotes } from "@/phi/lib/chart-tag-votes";
import { loadSaveHistory } from "@/phi/lib/history";
import { objectUrls } from "@/server/asset-links";
import { loadCardDesk } from "@/server/card-desk";
import { chartCatalog } from "@/server/charts";
import { getDataHost } from "@/server/data-host";
import { illKey } from "@/server/ill";
import { withDiscordUid } from "@/server/logger";
import { pageMetadata } from "@/server/og-meta";
import { playerProfileView } from "@/server/profile-view";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("profile", { noindex: true });
}

export default async function ProfilePage() {
	const session = await auth();
	if (!session?.user?.id) redirect(await signInHref("/profile"));
	const userId = session.user.id;
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		const [loaded, catalog, votes, { locale, m }] = await Promise.all([
			loadCardDesk(host, userId),
			chartCatalog(),
			loadTagVotes().catch(() => undefined),
			getMessages(),
		]);
		if ("gate" in loaded) return loaded.gate;
		let view = playerProfileView(
			loaded.bound.save,
			catalog.list,
			votes,
			locale,
		);
		if (view.profile?.basis === "aps" && loaded.bound.token) {
			const history = await loadSaveHistory(
				host.rt,
				host.db,
				loaded.bound.token,
			).catch(() => undefined);
			if (history)
				view = playerProfileView(
					loaded.bound.save,
					catalog.list,
					votes,
					locale,
					history.scoreHistory,
				);
		}
		const profile = view.profile;
		const tabled =
			profile && !profile.insufficient && profile.basis !== "aps"
				? profile.charts.map(({ id, song, rank, c, acc, diff }) => ({
						id,
						song,
						rank,
						c,
						acc,
						diff,
					}))
				: [];
		const jackets: Record<string, string> = {};
		if (tabled.length) {
			const links = await objectUrls();
			for (const chart of tabled) {
				if (jackets[chart.id]) continue;
				const url = links(illKey(bareId(chart.id), "low"));
				if (url) jackets[chart.id] = url;
			}
		}
		return (
			<Desk {...loaded.desk} nav={<CardNav current="profile" />}>
				<PlayerProfile view={view} />
				{tabled.length ? (
					<DifficultyTable charts={tabled} jackets={jackets} />
				) : null}
				{votes && loaded.bound.token ? (
					<Suspense
						fallback={
							<p className="field-hint">{m.profile.timeline.loading}</p>
						}
					>
						<ProfileTimeline
							save={loaded.bound.save}
							token={loaded.bound.token}
							votes={votes}
						/>
					</Suspense>
				) : null}
				{loaded.bound.token ? (
					<Suspense fallback={null}>
						<ProfileType save={loaded.bound.save} token={loaded.bound.token} />
					</Suspense>
				) : null}
			</Desk>
		);
	});
}
