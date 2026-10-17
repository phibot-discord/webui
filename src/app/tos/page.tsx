import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalDoc";
import { terms } from "@/i18n/legal";
import { getMessages } from "@/i18n/server";
import { pageMetadata } from "@/server/og-meta";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("tos");
}

export default async function TermsPage() {
	const { locale, m } = await getMessages();
	return (
		<LegalPage
			doc={terms[locale]}
			other={{ href: "/privacy", label: m.legal.privacy }}
		/>
	);
}
