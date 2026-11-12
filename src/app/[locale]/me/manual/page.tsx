import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ManualScores } from "@/components/ManualScores";
import { localeHref } from "@/i18n/server";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { loadManual } from "@/server/manual";
import { pageMetadata } from "@/server/og-meta";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("manual", { noindex: true });
}

export default async function ManualPage() {
	const session = await auth();
	if (!session?.user?.id) redirect(await localeHref("/"));
	const userId = session.user.id;
	const name = session.user.name?.trim() || "";
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		if (await host.lib.getToken(host.rt, userId))
			redirect(await localeHref("/me/b30"));
		const data = await loadManual(host.db, userId);
		return (
			<main id="content" className="page manual-page">
				<ManualScores initial={data ?? null} defaultName={name} />
			</main>
		);
	});
}
