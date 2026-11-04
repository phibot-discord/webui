import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TagGlossary } from "@/components/TagGlossary";
import { signInHref } from "@/i18n/server";
import type { ChartTagTreeNode } from "@/phi/lib/b30-analysis";
import { loadChartTagTree } from "@/phi/lib/chart-tags-api";
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
	return (
		<main id="content" className="page tags-page">
			<TagGlossary tree={await tagTree()} />
		</main>
	);
}
