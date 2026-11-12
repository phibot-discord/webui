import { ProfileTypeShare } from "@/components/ProfileTypeShare";
import { PgtiCard } from "@/components/review/PgtiCard";
import { getMessages } from "@/i18n/server";
import { type Pgti, pgtiOf } from "@/lib/pgti";
import { pgtiWindow } from "@/lib/pgti-window";
import { SITE_ORIGIN } from "@/lib/site";
import { fill } from "@/phi/lib/card-i18n";
import { loadSaveHistory } from "@/phi/lib/history";
import type { Save } from "@/phi/lib/save";
import { chartCatalog, chartCell } from "@/server/charts";
import { getDataHost } from "@/server/data-host";
import { logger } from "@/server/logger";
import { catalogConstants } from "@/server/recap-type";

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
		const modified = new Date(
			save.saveInfo.modifiedAt?.iso ?? Number.NaN,
		).getTime();
		const now = Number.isFinite(modified)
			? Math.max(modified, Date.now())
			: Date.now();
		const period = pgtiWindow(history.scoreHistory, history.rks, now);
		if (period) {
			pgti = pgtiOf({
				history: history.scoreHistory,
				constantOf: (id, rank) => chartCell(id, rank)?.[0],
				constants: catalogConstants(catalog.list),
				until: now,
				...period,
			});
		}
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
			) : null}
		</div>
	);
}
