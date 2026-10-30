import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Desk } from "@/components/Desk";
import { TargetsList } from "@/components/TargetsList";
import { signInHref } from "@/i18n/server";
import { loadCardDesk } from "@/server/card-desk";
import { chartCatalog } from "@/server/charts";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { pageMetadata } from "@/server/og-meta";
import { targetsView } from "@/server/save-views";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("targets", { noindex: true });
}

export default async function TargetsPage() {
	const session = await auth();
	if (!session?.user?.id) redirect(await signInHref("/targets"));
	const userId = session.user.id;
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		const [loaded, catalog] = await Promise.all([
			loadCardDesk(host, userId),
			chartCatalog(),
		]);
		if ("gate" in loaded) return loaded.gate;
		return (
			<Desk {...loaded.desk}>
				<TargetsList view={targetsView(loaded.bound.save, catalog.list)} />
			</Desk>
		);
	});
}
