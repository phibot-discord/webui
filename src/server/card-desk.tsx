import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BypassCacheButton } from "@/components/BypassCacheButton";
import { MeGate } from "@/components/Desk";
import { ExportRecords } from "@/components/ExportRecords";
import Link from "@/components/LocaleLink";
import { MoreMenu } from "@/components/MoreMenu";
import { RefreshButton } from "@/components/RefreshButton";
import { ShareToggle } from "@/components/ShareToggle";
import { UnbindButton } from "@/components/UnbindButton";
import { getMessages, localeHref } from "@/i18n/server";
import { displayPlayerId, displayRks } from "@/lib/player-display";
import {
	type Bound,
	bypassCacheCooldownRemaining,
	lastSyncedIso,
	loadBound,
	refreshCooldownRemaining,
} from "./bound";
import type { DataHost } from "./data-host";
import { getShareSlug } from "./share";

export type CardDeskProps = {
	title: string;
	rks: string;
	lastSyncedIso: string | undefined;
	note: string | undefined;
	tools: ReactNode;
};

export async function loadCardDesk(
	host: DataHost,
	userId: string,
): Promise<{ gate: ReactNode } | { bound: Bound; desk: CardDeskProps }> {
	const [got, shareSlug, cooldown, bypassCooldown, { m }] = await Promise.all([
		loadBound(host, userId),
		getShareSlug(userId),
		refreshCooldownRemaining(userId),
		bypassCacheCooldownRemaining(userId),
		getMessages(),
	]);
	if ("error" in got) {
		if (got.error === "not_bound") redirect(await localeHref("/me"));
		return {
			gate: (
				<MeGate
					reason={got.error === "banned" ? "banned" : "no_save"}
					cooldown={cooldown}
				/>
			),
		};
	}
	return {
		bound: got,
		desk: {
			title: displayPlayerId(got.save.saveInfo.PlayerId),
			rks: displayRks(got.save.saveInfo.summary?.rankingScore),
			lastSyncedIso: lastSyncedIso(got.save),
			note: got.manual ? m.manual.deskNote : undefined,
			tools: (
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
						<ExportRecords />
						{got.manual ? <UnbindButton manual inline /> : null}
					</MoreMenu>
				</>
			),
		},
	};
}
