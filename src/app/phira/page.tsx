import type { Metadata } from "next";
import { PhiraPack } from "@/components/PhiraPack";
import { getMessages } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const { m } = await getMessages();
	return { title: m.phira.title, description: m.phira.lede };
}

export default function PhiraPage() {
	return (
		<main id="content" className="page">
			<PhiraPack />
		</main>
	);
}
