import { notFound } from "next/navigation";
import { CardNav } from "@/components/CardNav";
import { CardStage } from "@/components/CardStage";
import { Desk } from "@/components/Desk";
import { displayPlayerId, displayRks } from "@/lib/player-display";
import { lastSyncedIso, loadBound } from "@/server/bound";
import { isPublicKind } from "@/server/card-kinds";
import { getDataHost } from "@/server/data-host";
import { userIdForSlug } from "@/server/share";

export const dynamic = "force-dynamic";

export default async function PublicKindPage({
	params,
}: {
	params: Promise<{ slug: string; kind: string }>;
}) {
	const { slug, kind } = await params;
	if (!isPublicKind(kind)) notFound();
	const userId = await userIdForSlug(slug);
	if (!userId) notFound();
	const host = await getDataHost();
	const got = await loadBound(host, userId);
	if ("error" in got) notFound();
	const srcBase = `/api/public/${slug}/card/${kind}`;
	const synced = lastSyncedIso(got.save);

	return (
		<Desk
			title={displayPlayerId(got.save.saveInfo.PlayerId)}
			rks={displayRks(got.save.saveInfo.summary?.rankingScore)}
			lastSyncedIso={synced}
			publicHint
			nav={<CardNav current={kind} base={`/p/${slug}`} />}
		>
			<CardStage
				kind={kind}
				srcBase={srcBase}
				counted={false}
				initialCount={33}
			/>
		</Desk>
	);
}
