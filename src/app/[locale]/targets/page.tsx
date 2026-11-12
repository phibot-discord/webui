import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChallengePicks } from "@/components/ChallengePicks";
import { Desk } from "@/components/Desk";
import { FormTargets } from "@/components/FormTargets";
import { PracticeList } from "@/components/PracticeList";
import { SnapshotLinks } from "@/components/SnapshotLinks";
import { TargetSuggestions } from "@/components/TargetSuggestions";
import { TargetsList } from "@/components/TargetsList";
import { signInHref } from "@/i18n/server";
import { practiceKey } from "@/lib/practice-list";
import { loadTagVotes } from "@/phi/lib/chart-tag-votes";
import { loadCardDesk } from "@/server/card-desk";
import { chartCatalog } from "@/server/charts";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { pageMetadata } from "@/server/og-meta";
import { getPracticeList } from "@/server/practice-list";
import {
	challengeView,
	formTargetsView,
	practiceView,
	suggestionsView,
	targetsView,
} from "@/server/save-views";
import { similarIndex } from "@/server/similar";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("targets", { noindex: true });
}

export default async function TargetsPage() {
	const session = await auth();
	if (!session?.user?.id) redirect(await signInHref("/targets"));
	const userId = session.user.id;
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		const [loaded, catalog, index, votes, kept] = await Promise.all([
			loadCardDesk(host, userId),
			chartCatalog(),
			similarIndex(),
			loadTagVotes().catch(() => undefined),
			getPracticeList(userId).catch(() => []),
		]);
		if ("gate" in loaded) return loaded.gate;
		const { save } = loaded.bound;
		return (
			<Desk {...loaded.desk}>
				<PracticeList view={practiceView(save, kept, catalog.list)} />
				<TargetsList
					view={targetsView(save, catalog.list)}
					kept={kept.map((k) => practiceKey(k.id, k.rank))}
				/>
				<SnapshotLinks view="targets" />
				{votes ? (
					<FormTargets {...formTargetsView(save, catalog.list, votes)} />
				) : null}
				<TargetSuggestions view={suggestionsView(save, index, catalog.list)} />
				<ChallengePicks view={challengeView(save, catalog.list)} />
			</Desk>
		);
	});
}
