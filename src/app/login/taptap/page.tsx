import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TapLoginPanel } from "@/components/TapLoginPanel";
import { localeHref } from "@/i18n/server";
import { safeNext } from "@/lib/safe-next";
import { pageMetadata } from "@/server/og-meta";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("login", { noindex: true });
}

export default async function TapLoginPage({
	searchParams,
}: {
	searchParams: Promise<{ next?: string }>;
}) {
	const session = await auth();
	const next = await localeHref(safeNext((await searchParams).next));
	if (session?.user?.id) redirect(next);
	return (
		<main id="content" className="page page-bind">
			<TapLoginPanel next={next} />
		</main>
	);
}
