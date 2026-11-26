import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { LandingView } from "@/components/LandingView";
import { localeHref } from "@/i18n/server";
import { homeMetadata, siteJsonLd } from "@/server/og-meta";
import "@/app/styles/landing.css";

export const dynamic = "error";

export function generateMetadata(): Promise<Metadata> {
	return homeMetadata();
}

export default async function HomePage() {
	return (
		<>
			<JsonLd data={await siteJsonLd()} />
			<LandingView next={await localeHref("/me")} live />
		</>
	);
}
