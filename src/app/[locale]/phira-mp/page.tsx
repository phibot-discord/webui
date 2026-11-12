import type { Metadata } from "next";
import { MpBoard } from "@/components/MpBoard";
import { pageMetadata } from "@/server/og-meta";
import { loadMp } from "@/server/phira-mp";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("mp", { noindex: true });
}

export default async function PhiraMpPage() {
	const data = await loadMp();
	return (
		<main id="content" className="page status-board mp-board">
			<MpBoard data={data} />
		</main>
	);
}
