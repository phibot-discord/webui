import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BindPanel } from "@/components/BindPanel";
import { MeGate } from "@/components/Desk";
import { getMessages } from "@/i18n/server";
import { loadBound, refreshCooldownRemaining } from "@/server/bound";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const { m } = await getMessages();
	return { title: m.me.title, robots: { index: false } };
}

export default async function MePage() {
	const session = await auth();
	if (!session?.user?.id) redirect("/");
	const userId = session.user.id;
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		const [got, cooldown] = await Promise.all([
			loadBound(host, userId),
			refreshCooldownRemaining(userId),
		]);

		if ("error" in got) {
			if (got.reason === "not_bound") {
				return (
					<main id="content" className="page page-bind">
						<BindPanel />
					</main>
				);
			}
			return (
				<MeGate
					reason={got.reason === "banned" ? "banned" : "no_save"}
					cooldown={cooldown}
				/>
			);
		}

		redirect("/me/b30");
	});
}
