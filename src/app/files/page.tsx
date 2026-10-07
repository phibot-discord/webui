import type { Metadata } from "next";
import { AssetBrowser } from "@/components/AssetBrowser";
import { getMessages } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const { m } = await getMessages();
	return { title: m.files.title, description: m.files.lede };
}

export default function FilesPage() {
	return (
		<main id="content" className="page">
			<AssetBrowser />
		</main>
	);
}
