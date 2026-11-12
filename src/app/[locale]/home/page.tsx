import type { Metadata } from "next";
import { LandingView } from "@/components/LandingView";
import { localeHref } from "@/i18n/server";
import { homeMetadata } from "@/server/og-meta";

export const dynamic = "error";

export function generateMetadata(): Promise<Metadata> {
	return homeMetadata();
}

export default async function HomePage() {
	return <LandingView next={await localeHref("/me")} live />;
}
