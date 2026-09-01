import { notFound } from "next/navigation";
import { CardNav } from "@/components/CardNav";
import { CardViewer } from "@/components/CardViewer";
import { Desk, displayPlayerId, displayRks } from "@/components/Desk";
import { formatDateTime, getMessages } from "@/i18n/server";
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
	const { locale, m } = await getMessages();
	const host = await getDataHost();
	const got = await loadBound(host, userId);
	if ("error" in got) notFound();
	const src = `/api/public/${slug}/card/${kind}`;
	const title = m.card.titles[kind];
	const synced = lastSyncedIso(got.save);

	return (
		<Desk
			title={displayPlayerId(got.save.saveInfo.PlayerId)}
			rksLabel={m.me.rks}
			rks={displayRks(got.save.saveInfo.summary?.rankingScore)}
			syncedLabel={m.me.lastSynced}
			synced={synced ? formatDateTime(synced, locale) : m.me.cachedSave}
			note={m.public.hint}
			nav={<CardNav current={kind} base={`/p/${slug}`} />}
			toolbar={
				<div className="toolbar">
					<a className="btn btn-ghost" href={src} download={`${kind}.png`}>
						{m.card.download}
					</a>
				</div>
			}
		>
			<CardViewer
				key={locale}
				src={src}
				alt={m.card.alt.replaceAll("{name}", title)}
			/>
		</Desk>
	);
}
