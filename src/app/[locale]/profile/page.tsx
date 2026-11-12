import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { CardNav } from "@/components/CardNav";
import { Desk } from "@/components/Desk";
import { PlayerProfile } from "@/components/PlayerProfile";
import { ProfileTimeline } from "@/components/ProfileTimeline";
import { getMessages, signInHref } from "@/i18n/server";
import { loadTagVotes } from "@/phi/lib/chart-tag-votes";
import { loadSaveHistory } from "@/phi/lib/history";
import { loadCardDesk } from "@/server/card-desk";
import { chartCatalog } from "@/server/charts";
import { getDataHost } from "@/server/data-host";
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
		return (
			<Desk {...loaded.desk} nav={<CardNav current="profile" />}>
				<PlayerProfile view={view} />
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
			</Desk>
		);
	});
}
