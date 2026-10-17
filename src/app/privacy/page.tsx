import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalDoc";
import { privacy } from "@/i18n/legal";
import { getMessages } from "@/i18n/server";
import { pageMetadata } from "@/server/og-meta";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("privacy");
}

export default async function PrivacyPage() {
	const { locale, m } = await getMessages();
	return (
		<LegalPage
			doc={privacy[locale]}
			other={{ href: "/tos", label: m.legal.terms }}
		/>
	);
}
