import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { CardNav } from "@/components/CardNav";
import { CardStage } from "@/components/CardStage";
import { Desk } from "@/components/Desk";
import { getMessages } from "@/i18n/server";
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
import { loadCardDesk } from "@/server/card-desk";
import { clampCount, isCardKind, parseSongLevel } from "@/server/card-kinds";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { pageOg } from "@/server/og-meta";
import { parsePaintQuality } from "@/server/render/paint-budget";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ kind: string }>;
}): Promise<Metadata> {
	const [{ kind }, { m }] = await Promise.all([params, getMessages()]);
	if (!isCardKind(kind)) return {};
	const copy = { title: m.card.titles[kind] };
	return {
		...copy,
		robots: { index: false },
		...(await pageOg("cards", copy)),
	};
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
		const [loaded, notes] = await Promise.all([
			loadCardDesk(host, userId),
			getNotes(host.db, userId),
		]);
		if ("gate" in loaded) return loaded.gate;
		const { desk } = loaded;

		const q = await searchParams;
		const counted = kind === "b30" || kind === "x30" || kind === "fc30";
		const player = desk.title;
		const rks = desk.rks;

		return (
			<Desk {...desk} nav={<CardNav current={kind} />}>
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
					stddevExcludeP3={
						kind === "b30" ? { on: notes.stddevExcludeP3 === true } : undefined
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
