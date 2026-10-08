import type { Metadata } from "next";
import { StatusBoard } from "@/components/status/StatusBoard";
import { getMessages } from "@/i18n/server";
import { loadStatus } from "@/server/status";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const { m } = await getMessages();
	return { title: m.status.title, description: m.status.lede };
}

export default async function StatusPage() {
	const data = await loadStatus();
	return (
		<main id="content" className="page status-board">
			<StatusBoard data={data} />
		</main>
	);
}
