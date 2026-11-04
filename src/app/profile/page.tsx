import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CardNav } from "@/components/CardNav";
import { Desk } from "@/components/Desk";
import { PlayerProfile } from "@/components/PlayerProfile";
import { getMessages, signInHref } from "@/i18n/server";
import { loadTagVotes } from "@/phi/lib/chart-tag-votes";
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
		const [loaded, catalog, votes, { locale }] = await Promise.all([
			loadCardDesk(host, userId),
			chartCatalog(),
			loadTagVotes().catch(() => undefined),
			getMessages(),
		]);
		if ("gate" in loaded) return loaded.gate;
		const view = playerProfileView(
			loaded.bound.save,
			catalog.list,
			votes,
			locale === "zh" ? "zh" : "en",
		);
		return (
			<Desk {...loaded.desk} nav={<CardNav current="profile" />}>
				<PlayerProfile view={view} />
			</Desk>
		);
	});
}
