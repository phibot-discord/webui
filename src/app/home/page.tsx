import type { Metadata } from "next";
import { auth } from "@/auth";
import { LandingView } from "@/components/LandingView";
import { localeHref } from "@/i18n/server";
import { homeMetadata } from "@/server/og-meta";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return homeMetadata();
}

export default async function HomePage() {
	const [session, next] = await Promise.all([auth(), localeHref("/me")]);
	return <LandingView next={next} signedIn={Boolean(session?.user?.id)} />;
}
