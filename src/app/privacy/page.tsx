import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalDoc";
import { privacy } from "@/i18n/legal";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
	const { locale, m } = await getMessages();
	return { title: m.legal.privacy, description: privacy[locale].lede };
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
