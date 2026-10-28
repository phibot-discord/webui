import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { type AccountLinkError, AccountView } from "@/components/AccountView";
import { signInHref } from "@/i18n/server";
import { tapSignInOpens } from "@/server/account-link";
import { isTapUserId } from "@/server/auth-tickets";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { pageMetadata } from "@/server/og-meta";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("account", { noindex: true });
}

const LINK_ERRORS: readonly AccountLinkError[] = [
	"discord_taken",
	"link_expired",
	"link_failed",
];

export default async function AccountPage({
	searchParams,
}: {
	searchParams: Promise<{ link?: string; linked?: string }>;
}) {
	const session = await auth();
	if (!session?.user?.id) redirect(await signInHref("/account"));
	const userId = session.user.id;
	const params = await searchParams;
	return withDiscordUid(userId, async () => {
		const viaTap = isTapUserId(userId);
		const tapLinked = !viaTap && (await tapSignInOpens(userId));
		const host = await getDataHost();
		const hasToken = Boolean(await host.lib.getToken(host.rt, userId));
		return (
			<main id="content" className="page page-bind">
				<AccountView
					viaTap={viaTap}
					tapLinked={tapLinked}
					hasToken={hasToken}
					linkError={LINK_ERRORS.find((code) => code === params.link)}
					linkedOk={params.linked === "discord" && !viaTap}
				/>
			</main>
		);
	});
}
