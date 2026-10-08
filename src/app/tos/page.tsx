import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalDoc";
import { terms } from "@/i18n/legal";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
	const { locale, m } = await getMessages();
	return { title: m.legal.terms, description: terms[locale].lede };
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
