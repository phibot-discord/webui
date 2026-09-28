import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { BypassCacheButton } from "@/components/BypassCacheButton";
import { CardNav } from "@/components/CardNav";
import { CardStage } from "@/components/CardStage";
import { Desk, MeGate } from "@/components/Desk";
import { RefreshButton } from "@/components/RefreshButton";
import { ShareToggle } from "@/components/ShareToggle";
import { UnbindButton } from "@/components/UnbindButton";
import { getMessages } from "@/i18n/server";
import { displayPlayerId, displayRks } from "@/lib/player-display";
import { getNotes } from "@/phi/lib/notes";
import {
	bypassCacheCooldownRemaining,
	lastSyncedIso,
	loadBound,
	refreshCooldownRemaining,
} from "@/server/bound";
import { clampCount, isCardKind } from "@/server/card-kinds";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { parsePaintQuality } from "@/server/render/paint-budget";
import { getShareSlug } from "@/server/share";

export const dynamic = "force-dynamic";

export default async function KindPage({
	params,
	searchParams,
}: {
	params: Promise<{ kind: string }>;
	searchParams: Promise<{ count?: string; quality?: string }>;
}) {
	const session = await auth();
	if (!session?.user?.id) redirect("/");
	const userId = session.user.id;
	return withDiscordUid(userId, async () => {
		const { kind } = await params;
		if (!isCardKind(kind)) notFound();
		const host = await getDataHost();
		const [got, shareSlug, cooldown, bypassCooldown, notes] = await Promise.all(
			[
				loadBound(host, userId),
				getShareSlug(userId),
				refreshCooldownRemaining(userId),
				bypassCacheCooldownRemaining(userId),
				getNotes(host.db, userId),
			],
		);

		if ("error" in got) {
			if (got.reason === "not_bound") redirect("/me");
			return (
				<MeGate
					reason={got.reason === "banned" ? "banned" : "no_save"}
					cooldown={cooldown}
				/>
			);
		}

		const q = await searchParams;
		const count = clampCount(q.count);
		const counted = kind === "b30" || kind === "x30" || kind === "fc30";
		const srcBase = `/api/card/${kind}`;
		const synced = lastSyncedIso(got.save);
		const { m } = await getMessages();

		return (
			<Desk
				title={displayPlayerId(got.save.saveInfo.PlayerId)}
				rks={displayRks(got.save.saveInfo.summary?.rankingScore)}
				lastSyncedIso={synced}
				note={got.manual ? m.manual.deskNote : undefined}
				tools={
					got.manual ? (
						<>
							<Link
								className="btn btn-ghost"
								href="/me/manual"
								prefetch={false}
							>
								{m.manual.edit}
							</Link>
							<BypassCacheButton cooldownMs={bypassCooldown} />
							<ShareToggle slug={shareSlug} />
							<UnbindButton manual />
						</>
					) : (
						<>
							<RefreshButton cooldownMs={cooldown} />
							<BypassCacheButton cooldownMs={bypassCooldown} />
							<ShareToggle slug={shareSlug} />
							<UnbindButton />
						</>
					)
				}
				nav={<CardNav current={kind} />}
			>
				<CardStage
					kind={kind}
					srcBase={srcBase}
					counted={counted}
					initialCount={count}
					initialQuality={parsePaintQuality(q.quality ?? notes.cardQuality)}
					persistQuality
					tagProfile={
						counted ? { on: notes.showTagAnalysis !== false } : undefined
					}
				/>
			</Desk>
		);
	});
}
