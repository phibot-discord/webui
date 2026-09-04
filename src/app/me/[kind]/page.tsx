import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { CardNav } from "@/components/CardNav";
import { CardStage } from "@/components/CardStage";
import { Desk, MeGate } from "@/components/Desk";
import { RefreshButton } from "@/components/RefreshButton";
import { ShareToggle } from "@/components/ShareToggle";
import { UnbindButton } from "@/components/UnbindButton";
import { displayPlayerId, displayRks } from "@/lib/player-display";
import { getNotes } from "@/phi/lib/notes";
import {
	lastSyncedIso,
	loadBound,
	refreshCooldownRemaining,
} from "@/server/bound";
import { clampCount, isCardKind } from "@/server/card-kinds";
import { getDataHost } from "@/server/data-host";
import { getShareSlug } from "@/server/share";

export const dynamic = "force-dynamic";

export default async function KindPage({
	params,
	searchParams,
}: {
	params: Promise<{ kind: string }>;
	searchParams: Promise<{ count?: string }>;
}) {
	const session = await auth();
	if (!session?.user?.id) redirect("/");
	const userId = session.user.id;
	const { kind } = await params;
	if (!isCardKind(kind)) notFound();
	const host = await getDataHost();
	const got = await loadBound(host, userId);
	const shareSlug = await getShareSlug(userId);
	const cooldown = await refreshCooldownRemaining(userId);

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
	const notes = await getNotes(host.db, userId);

	return (
		<Desk
			title={displayPlayerId(got.save.saveInfo.PlayerId)}
			rks={displayRks(got.save.saveInfo.summary?.rankingScore)}
			lastSyncedIso={synced}
			tools={
				<>
					<RefreshButton cooldownMs={cooldown} />
					<ShareToggle slug={shareSlug} />
					<UnbindButton />
				</>
			}
			nav={<CardNav current={kind} />}
		>
			<CardStage
				kind={kind}
				srcBase={srcBase}
				counted={counted}
				initialCount={count}
				tagProfile={
					counted ? { on: notes.showTagAnalysis !== false } : undefined
				}
			/>
		</Desk>
	);
}
