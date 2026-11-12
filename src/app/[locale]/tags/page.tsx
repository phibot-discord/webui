import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TagGlossary } from "@/components/TagGlossary";
import { signInHref } from "@/i18n/server";
import { EXAMPLE_VOTED, tagExample } from "@/lib/tag-example";
import type { ChartTagTreeNode } from "@/phi/lib/b30-analysis";
import { loadChartTagTree } from "@/phi/lib/chart-tags-api";
import { objectUrls } from "@/server/asset-links";
import { pageMetadata } from "@/server/og-meta";
import { type TagClipView, tagClipViews } from "@/server/tag-clips";

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

async function clips(): Promise<Record<string, TagClipView>> {
	try {
		return await tagClipViews(await objectUrls());
	} catch {
		return {};
	}
}

export default async function TagsPage() {
	const session = await auth();
	if (!session?.user?.id) redirect(await signInHref("/tags"));
	const [tree, clipViews] = await Promise.all([tagTree(), clips()]);
	return (
		<main id="content" className="page tags-page">
			<TagGlossary
				tree={tree}
				clips={clipViews}
				example={tagExample()}
				voted={EXAMPLE_VOTED}
			/>
		</main>
	);
}
