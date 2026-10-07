import type { Metadata } from "next";
import { TagGlossary } from "@/components/TagGlossary";
import { getMessages } from "@/i18n/server";
import type { ChartTagTreeNode } from "@/phi/lib/b30-analysis";
import { loadChartTagTree } from "@/phi/lib/chart-tags-api";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const { m } = await getMessages();
	return { title: m.tags.title, description: m.tags.lede };
}

export default async function TagsPage() {
	let tree: ChartTagTreeNode[] = [];
	try {
		tree = await loadChartTagTree();
	} catch {
		tree = [];
	}
	return (
		<main id="content" className="page tags-page">
			<TagGlossary tree={tree} />
		</main>
	);
}
