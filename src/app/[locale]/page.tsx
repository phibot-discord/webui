import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { JsonLd } from "@/components/JsonLd";
import { LandingView } from "@/components/LandingView";
import { SignInToast } from "@/components/SignInToast";
import { localeHref } from "@/i18n/server";
import { bounced, safeNext } from "@/lib/safe-next";
import { homeMetadata, siteJsonLd } from "@/server/og-meta";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return homeMetadata();
}

export default async function HomePage({
	searchParams,
}: {
	searchParams: Promise<{
		next?: string | string[];
		asked?: string | string[];
	}>;
}) {
	const session = await auth();
	const params = await searchParams;
	const next = await localeHref(safeNext(params.next));
	if (session?.user?.id) redirect(next);
	return (
		<>
			<JsonLd data={await siteJsonLd()} />
			<LandingView next={next} />
			{bounced(params) ? <SignInToast /> : null}
		</>
	);
}
