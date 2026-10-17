import type { Metadata } from "next";
import { PhiraPack } from "@/components/PhiraPack";
import { pageMetadata } from "@/server/og-meta";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("phira");
}

export default function PhiraPage() {
	return (
		<main id="content" className="page">
			<PhiraPack />
		</main>
	);
}
