import { notFound } from "next/navigation";
import { CardNav } from "@/components/CardNav";
import { CardStage } from "@/components/CardStage";
import { Desk } from "@/components/Desk";
import { getMessages } from "@/i18n/server";
import { displayPlayerId, displayRks } from "@/lib/player-display";
import { getNotes } from "@/phi/lib/notes";
import { lastSyncedIso, loadBound } from "@/server/bound";
import { isPublicKind } from "@/server/card-kinds";
import { getDataHost } from "@/server/data-host";
import { parsePaintQuality } from "@/server/render/paint-budget";
import { userIdForSlug } from "@/server/share";

export const dynamic = "force-dynamic";

export default async function PublicKindPage({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string; kind: string }>;
	searchParams: Promise<{ quality?: string }>;
}) {
	const { slug, kind } = await params;
	if (!isPublicKind(kind)) notFound();
	const userId = await userIdForSlug(slug);
	if (!userId) notFound();
	const host = await getDataHost();
	const [got, notes, q] = await Promise.all([
		loadBound(host, userId),
		getNotes(host.db, userId),
		searchParams,
	]);
	if ("error" in got) notFound();
	const srcBase = `/api/public/${slug}/card/${kind}`;
	const synced = lastSyncedIso(got.save);
	const { m } = await getMessages();

	return (
		<Desk
			title={displayPlayerId(got.save.saveInfo.PlayerId)}
			rks={displayRks(got.save.saveInfo.summary?.rankingScore)}
			lastSyncedIso={synced}
			publicHint
			note={got.manual ? m.manual.deskNote : undefined}
			nav={<CardNav current={kind} base={`/p/${slug}`} />}
		>
			<CardStage
				kind={kind}
				srcBase={srcBase}
				counted={false}
				initialCount={33}
				initialQuality={parsePaintQuality(q.quality ?? notes.cardQuality)}
			/>
		</Desk>
	);
}
