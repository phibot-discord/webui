import type { Metadata } from "next";
import { StatusBoard } from "@/components/status/StatusBoard";
import { pageMetadata } from "@/server/og-meta";
import { loadStatus } from "@/server/status";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("status", { path: "/status" });
}

export default async function StatusPage() {
	const data = await loadStatus();
	return (
		<main id="content" className="page status-board">
			<StatusBoard data={data} />
		</main>
	);
}
