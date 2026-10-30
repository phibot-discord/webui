import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Desk } from "@/components/Desk";
import { TagGlossary } from "@/components/TagGlossary";
import { signInHref } from "@/i18n/server";
import type { ChartTagTreeNode } from "@/phi/lib/b30-analysis";
import { loadChartTagTree } from "@/phi/lib/chart-tags-api";
import { loadCardDesk } from "@/server/card-desk";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { pageMetadata } from "@/server/og-meta";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("tags", { noindex: true });
}

async function tagTree(): Promise<ChartTagTreeNode[]> {
	try {
		return await loadChartTagTree();
	} catch {
		return [];
	}
}

export default async function TagsPage() {
	const session = await auth();
	if (!session?.user?.id) redirect(await signInHref("/tags"));
	const userId = session.user.id;
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		const [loaded, tree] = await Promise.all([
			loadCardDesk(host, userId),
			tagTree(),
		]);
		if ("gate" in loaded) return loaded.gate;
		return (
			<Desk {...loaded.desk}>
				<TagGlossary tree={tree} />
			</Desk>
		);
	});
}
