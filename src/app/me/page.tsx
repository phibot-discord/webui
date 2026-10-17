import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BindPanel } from "@/components/BindPanel";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { loadManual } from "@/server/manual";
import { pageMetadata } from "@/server/og-meta";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("cards", { noindex: true });
}

export default async function MePage() {
	const session = await auth();
	if (!session?.user?.id) redirect("/");
	const userId = session.user.id;
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		if (await host.lib.getToken(host.rt, userId)) redirect("/me/b30");
		if (await loadManual(host.db, userId)) redirect("/me/b30");
		return (
			<main id="content" className="page page-bind">
				<BindPanel />
			</main>
		);
	});
}
