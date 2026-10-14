import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MeGate } from "@/components/Desk";
import { SongSimulation } from "@/components/SongSimulation";
import { getMessages } from "@/i18n/server";
import { refreshCooldownRemaining } from "@/server/bound";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { loadSimBase } from "@/server/simulation";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const { m } = await getMessages();
	return { title: m.simulate.title, robots: { index: false } };
}

export default async function SimulatePage() {
	const session = await auth();
	if (!session?.user?.id) redirect("/?next=/simulate");
	const userId = session.user.id;
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		const got = await loadSimBase(host, userId);
		if ("error" in got) {
			if (got.error === "not_bound") redirect("/me");
			return (
				<MeGate
					reason={got.error === "banned" ? "banned" : "no_save"}
					cooldown={await refreshCooldownRemaining(userId)}
				/>
			);
		}
		return (
			<main id="content" className="page manual-page">
				<SongSimulation
					userId={userId}
					playerId={got.playerId}
					initial={got.base}
				/>
			</main>
		);
	});
}
