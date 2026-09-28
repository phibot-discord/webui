import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ManualScores } from "@/components/ManualScores";
import { getMessages } from "@/i18n/server";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { loadManual } from "@/server/manual";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const { m } = await getMessages();
	return { title: `${m.manual.title} · ${m.brand}` };
}

export default async function ManualPage() {
	const session = await auth();
	if (!session?.user?.id) redirect("/");
	const userId = session.user.id;
	const name = session.user.name?.trim() || "";
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		// A bound TapTap account always wins over hand-typed scores.
		if (await host.lib.getToken(host.rt, userId)) redirect("/me/b30");
		const data = await loadManual(host.db, userId);
		return (
			<main id="content" className="page manual-page">
				<ManualScores initial={data ?? null} defaultName={name} />
			</main>
		);
	});
}
