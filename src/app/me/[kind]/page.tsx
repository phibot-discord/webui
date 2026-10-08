import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { BypassCacheButton } from "@/components/BypassCacheButton";
import { CardNav } from "@/components/CardNav";
import { CardStage } from "@/components/CardStage";
import { Desk, MeGate } from "@/components/Desk";
import { MoreMenu } from "@/components/MoreMenu";
import { RefreshButton } from "@/components/RefreshButton";
import { ShareToggle } from "@/components/ShareToggle";
import { UnbindButton } from "@/components/UnbindButton";
import { getMessages } from "@/i18n/server";
import { displayPlayerId, displayRks } from "@/lib/player-display";
import {
	cardStyles,
	isStyledKind,
	parseCardStyle,
} from "@/phi/lib/card-styles";
import { backgroundOptions, knownBackground } from "@/phi/lib/catalog";
import {
	b30AvgKindOf,
	getNotes,
	rankBandShowOf,
	rankScopeOf,
} from "@/phi/lib/notes";
import {
	bypassCacheCooldownRemaining,
	lastSyncedIso,
	loadBound,
	refreshCooldownRemaining,
} from "@/server/bound";
import { clampCount, isCardKind, parseSongLevel } from "@/server/card-kinds";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { parsePaintQuality } from "@/server/render/paint-budget";
import { getShareSlug } from "@/server/share";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ kind: string }>;
}): Promise<Metadata> {
	const [{ kind }, { m }] = await Promise.all([params, getMessages()]);
	if (!isCardKind(kind)) return {};
	return { title: m.card.titles[kind], robots: { index: false } };
}

export default async function KindPage({
	params,
	searchParams,
}: {
	params: Promise<{ kind: string }>;
	searchParams: Promise<{
		count?: string;
		quality?: string;
		style?: string;
		chart?: string;
		level?: string;
	}>;
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
		const counted = kind === "b30" || kind === "x30" || kind === "fc30";
		const player = displayPlayerId(got.save.saveInfo.PlayerId);
		const rks = displayRks(got.save.saveInfo.summary?.rankingScore);
		const { m } = await getMessages();

		return (
			<Desk
				title={player}
				rks={rks}
				lastSyncedIso={lastSyncedIso(got.save)}
				note={got.manual ? m.manual.deskNote : undefined}
				tools={
					<>
						{got.manual ? (
							<Link
								className="btn btn-primary"
								href="/me/manual"
								prefetch={false}
							>
								{m.manual.edit}
							</Link>
						) : (
							<RefreshButton cooldownMs={cooldown} />
						)}
						<ShareToggle slug={shareSlug} />
						<MoreMenu>
							<BypassCacheButton cooldownMs={bypassCooldown} />
							<UnbindButton manual={got.manual} inline />
						</MoreMenu>
					</>
				}
				nav={<CardNav current={kind} />}
			>
				<CardStage
					kind={kind}
					srcBase={`/api/card/${kind}`}
					player={player}
					rks={rks}
					counted={counted}
					initialCount={clampCount(q.count)}
					initialQuality={parsePaintQuality(q.quality ?? notes.cardQuality)}
					persist
					tagProfile={
						counted ? { on: notes.showTagAnalysis !== false } : undefined
					}
					recordStats={
						counted ? { on: notes.showRecordStats !== false } : undefined
					}
					backgrounds={kind === "song" ? undefined : backgroundOptions()}
					initialBackground={knownBackground(notes.cardBackground)}
					styles={cardStyles(kind)}
					initialStyle={parseCardStyle(
						kind,
						q.style ??
							(isStyledKind(kind) ? notes.cardStyle?.[kind] : undefined),
					)}
					initialPeer={counted ? b30AvgKindOf(notes) : undefined}
					initialRankScope={rankScopeOf(notes)}
					initialRankBandShow={rankBandShowOf(notes)}
					initialPeerWait={notes.peerWait === true}
					song={
						kind === "song"
							? {
									chart: (q.chart ?? "").trim(),
									level: parseSongLevel(q.level),
								}
							: undefined
					}
				/>
			</Desk>
		);
	});
}
