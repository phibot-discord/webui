import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { type AccountLinkError, AccountView } from "@/components/AccountView";
import { getMessages } from "@/i18n/server";
import { tapSignInOpens } from "@/server/account-link";
import { isTapUserId } from "@/server/auth-tickets";
import { withDiscordUid } from "@/server/logger";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const { m } = await getMessages();
	return { title: m.account.title, robots: { index: false } };
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
	if (!session?.user?.id) redirect("/?next=/account");
	const userId = session.user.id;
	const params = await searchParams;
	return withDiscordUid(userId, async () => {
		const viaTap = isTapUserId(userId);
		const tapLinked = !viaTap && (await tapSignInOpens(userId));
		return (
			<main id="content" className="page page-bind">
				<AccountView
					viaTap={viaTap}
					tapLinked={tapLinked}
					linkError={LINK_ERRORS.find((code) => code === params.link)}
					linkedOk={params.linked === "discord" && !viaTap}
				/>
			</main>
		);
	});
}
