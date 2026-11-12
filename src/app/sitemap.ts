import type { MetadataRoute } from "next";
import { SITEMAP_PAGES, sitemapEntries } from "@/lib/sitemap-entries";
import { filesSitemapPaths } from "@/server/files-page";
import { songPaths } from "@/server/song-page";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const [files, songs] = await Promise.all([
		filesSitemapPaths().catch(() => ["/files"]),
		songPaths().catch(() => []),
	]);
	return sitemapEntries([...SITEMAP_PAGES, ...files, ...songs]);
}
