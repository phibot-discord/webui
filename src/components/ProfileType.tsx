import { ProfileTypeShare } from "@/components/ProfileTypeShare";
import { PgtiCard } from "@/components/review/PgtiCard";
import { SnapshotLinks } from "@/components/SnapshotLinks";
import { getMessages } from "@/i18n/server";
import type { Pgti } from "@/lib/pgti";
import { SITE_ORIGIN } from "@/lib/site";
import { fill } from "@/phi/lib/card-i18n";
import { loadSaveHistory } from "@/phi/lib/history";
import type { Save } from "@/phi/lib/save";
import { chartCatalog } from "@/server/charts";
import { getDataHost } from "@/server/data-host";
import { logger } from "@/server/logger";
import { rollingPgti } from "@/server/recap-type";

export async function ProfileType({
	save,
	token,
}: {
	save: Save;
	token: string;
}) {
	const [{ m }, host, catalog] = await Promise.all([
		getMessages(),
		getDataHost(),
		chartCatalog(),
	]);
	const t = m.wrapped.pgti;
	let pgti: Pgti | null = null;
	try {
		const history = await loadSaveHistory(host.rt, host.db, token);
		pgti = rollingPgti(save, history, catalog.list)?.pgti ?? null;
	} catch (err) {
		logger.warn(
			`profile type unavailable: ${err instanceof Error ? err.message : err}`,
		);
	}
	const code = pgti
		? `${pgti.aim.letter}${pgti.range.letter}${pgti.grip.letter}${pgti.pace.letter}`
		: "";
	return (
		<div className="pp-section">
			<PgtiCard pgti={pgti} rolling />
			{pgti ? (
				<SnapshotLinks
					view="type"
					lead={
						<ProfileTypeShare
							copy={t.rolling.copy}
							copied={t.rolling.copied}
							text={fill(t.rolling.shareText, {
								code,
								name: t.names[code as keyof typeof t.names],
								family: t.families[pgti.family].name,
								style: t.styles[pgti.style].name,
								url: SITE_ORIGIN,
							})}
						/>
					}
				/>
			) : null}
		</div>
	);
}
