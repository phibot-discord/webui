import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TapLoginPanel } from "@/components/TapLoginPanel";
import { getMessages } from "@/i18n/server";
import { safeNext } from "@/lib/safe-next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const { m } = await getMessages();
	return { title: m.tapLogin.title, robots: { index: false } };
}

export default async function TapLoginPage({
	searchParams,
}: {
	searchParams: Promise<{ next?: string }>;
}) {
	const session = await auth();
	const next = safeNext((await searchParams).next);
	if (session?.user?.id) redirect(next);
	return (
		<main id="content" className="page page-bind">
			<TapLoginPanel next={next} />
		</main>
	);
}
