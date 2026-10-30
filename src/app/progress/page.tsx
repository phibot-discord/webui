import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CardNav } from "@/components/CardNav";
import { Desk } from "@/components/Desk";
import { ProgressGrid } from "@/components/ProgressGrid";
import { signInHref } from "@/i18n/server";
import { loadCardDesk } from "@/server/card-desk";
import { chartCatalog } from "@/server/charts";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { pageMetadata } from "@/server/og-meta";
import { progressView } from "@/server/save-views";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("progress", { noindex: true });
}

export default async function ProgressPage() {
	const session = await auth();
	if (!session?.user?.id) redirect(await signInHref("/progress"));
	const userId = session.user.id;
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		const [loaded, catalog] = await Promise.all([
			loadCardDesk(host, userId),
			chartCatalog(),
		]);
		if ("gate" in loaded) return loaded.gate;
		return (
			<Desk {...loaded.desk} nav={<CardNav current="progress" />}>
				<ProgressGrid view={progressView(loaded.bound.save, catalog.list)} />
			</Desk>
		);
	});
}
