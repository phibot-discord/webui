import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Desk } from "@/components/Desk";
import { SongSimulation } from "@/components/SongSimulation";
import { signInHref } from "@/i18n/server";
import { loadCardDesk } from "@/server/card-desk";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { pageMetadata } from "@/server/og-meta";
import { simBaseOf } from "@/server/simulation";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("simulate", { noindex: true });
}

export default async function SimulatePage() {
	const session = await auth();
	if (!session?.user?.id) redirect(await signInHref("/simulate"));
	const userId = session.user.id;
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		const loaded = await loadCardDesk(host, userId);
		if ("gate" in loaded) return loaded.gate;
		const got = simBaseOf(loaded.bound);
		return (
			<Desk {...loaded.desk}>
				<SongSimulation
					userId={userId}
					playerId={got.playerId}
					initial={got.base}
				/>
			</Desk>
		);
	});
}
