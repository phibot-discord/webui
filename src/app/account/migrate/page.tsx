import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MigratePanel } from "@/components/MigratePanel";
import { withDiscordUid } from "@/server/logger";
import { boundAccount } from "@/server/migrate";
import { pageMetadata } from "@/server/og-meta";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("account", { noindex: true });
}

export default async function MigratePage() {
	const session = await auth();
	if (!session?.user?.id) redirect("/?next=/account/migrate");
	const userId = session.user.id;
	return withDiscordUid(userId, async () => (
		<main id="content" className="page page-bind">
			<MigratePanel bound={await boundAccount(userId)} />
		</main>
	));
}
