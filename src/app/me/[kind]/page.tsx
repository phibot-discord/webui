import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { CardNav } from "@/components/CardNav";
import { CardViewer } from "@/components/CardViewer";
import { CountSelect } from "@/components/CountSelect";
import { Desk, displayPlayerId, displayRks, MeGate } from "@/components/Desk";
import { RefreshButton } from "@/components/RefreshButton";
import { ShareToggle } from "@/components/ShareToggle";
import { UnbindButton } from "@/components/UnbindButton";
import { formatDateTime, getMessages } from "@/i18n/server";
import {
	lastSyncedIso,
	loadBound,
	refreshCooldownRemaining,
} from "@/server/bound";
import { type CardKind, clampCount, isCardKind } from "@/server/card-kinds";
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
	const { locale, m } = await getMessages();
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
	const src = counted
		? `/api/card/${kind}?count=${count}`
		: `/api/card/${kind}`;
	const title = m.card.titles[kind as CardKind];
	const synced = lastSyncedIso(got.save);

	return (
		<Desk
			title={displayPlayerId(got.save.saveInfo.PlayerId)}
			rksLabel={m.me.rks}
			rks={displayRks(got.save.saveInfo.summary?.rankingScore)}
			syncedLabel={m.me.lastSynced}
			synced={synced ? formatDateTime(synced, locale) : m.me.cachedSave}
			tools={
				<>
					<RefreshButton cooldownMs={cooldown} />
					<ShareToggle slug={shareSlug} />
					<UnbindButton />
				</>
			}
			nav={<CardNav current={kind} />}
			toolbar={
				<div className="toolbar">
					{counted ? (
						<Suspense
							fallback={<span className="meta-label">{m.card.charts}</span>}
						>
							<CountSelect value={count} />
						</Suspense>
					) : null}
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
