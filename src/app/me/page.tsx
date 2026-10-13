import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BindPanel } from "@/components/BindPanel";
import { getMessages } from "@/i18n/server";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { loadManual } from "@/server/manual";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const { m } = await getMessages();
	return { title: m.me.title, robots: { index: false } };
}

export default async function MePage() {
	const session = await auth();
	if (!session?.user?.id) redirect("/");
	const userId = session.user.id;
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		// Only the binding decides here: /me/[kind] loads the save and gates a banned token or a missing save
		if (await host.lib.getToken(host.rt, userId)) redirect("/me/b30");
		if (await loadManual(host.db, userId)) redirect("/me/b30");
		return (
			<main id="content" className="page page-bind">
				<BindPanel />
			</main>
		);
	});
}
