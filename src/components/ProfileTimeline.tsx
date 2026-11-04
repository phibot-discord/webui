import { localeTag } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { profileTimeline } from "@/lib/profile-timeline";
import { fill, localizeChartTagName, signed } from "@/phi/lib/card-i18n";
import type { TagVotes } from "@/phi/lib/chart-tag-votes";
import { loadSaveHistory } from "@/phi/lib/history";
import type { Save } from "@/phi/lib/save";
import { profileRecordsOf } from "@/phi/lib/tag-profile";
import { chartCell } from "@/server/charts";
import { getDataHost } from "@/server/data-host";

export async function ProfileTimeline({
	save,
	token,
	votes,
}: {
	save: Save;
	token: string;
	votes: TagVotes;
}) {
	const [{ m, locale }, host] = await Promise.all([
		getMessages(),
		getDataHost(),
	]);
	const t = m.profile.timeline;
	const history = await loadSaveHistory(host.rt, host.db, token);
	const modified = new Date(
		save.saveInfo.modifiedAt?.iso ?? Number.NaN,
	).getTime();
	const view = profileTimeline(
		history.scoreHistory,
		(id, rank) => chartCell(id, rank)?.[0],
		votes,
		{
			records: profileRecordsOf(save.gameRecord),
			t: Number.isFinite(modified) ? modified : Date.now(),
		},
	);
	const fmt = new Intl.DateTimeFormat(localeTag(locale), {
		timeZone: "Asia/Shanghai",
		month: "short",
		day: "numeric",
		year: "2-digit",
	});
	const phiLocale = locale;
	return (
		<section className="pp-section" aria-labelledby="pp-timeline">
			<h3 id="pp-timeline">{t.title}</h3>
			<p className="field-hint">{t.lede}</p>
			{!view ? (
				<p className="callout">{t.none}</p>
			) : (
				<>
					{view.coverage < 0.9 ? (
						<p className="field-hint">
							{fill(t.partial, { pct: Math.round(view.coverage * 100) })}
						</p>
					) : null}
					{view.rows.length ? (
						<>
							<p className="field-hint">{t.leaningHint}</p>
							<div className="data-scroll">
								<table className="data-table pp-time">
									<thead>
										<tr>
											<th scope="col">{t.date}</th>
											{view.points.map((p) => (
												<th key={p.t} scope="col" className="num">
													{p.now ? t.now : fmt.format(p.t)}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										<tr className="pp-time-meta">
											<th scope="row">{t.b27}</th>
											{view.points.map((p) => (
												<td key={p.t} className="num">
													{p.rks ? p.rks.toFixed(2) : "—"}
												</td>
											))}
										</tr>
										<tr className="pp-time-meta">
											<th scope="row">{t.pool}</th>
											{view.points.map((p) => (
												<td key={p.t} className="num">
													{p.insufficient ? (
														<span className="muted">
															{p.charts} · {t.few}
														</span>
													) : (
														p.charts
													)}
												</td>
											))}
										</tr>
										{view.rows.map((row) => (
											<tr key={row.name}>
												<th scope="row">
													{localizeChartTagName(row.name, phiLocale)}
												</th>
												{row.cells.map((c, i) => (
													<td key={view.points[i]?.t ?? i} className="num">
														{c ? (
															<span
																className="pp-diff"
																data-sign={
																	Math.abs(c.net) < 0.03
																		? "flat"
																		: c.net > 0
																			? "up"
																			: "down"
																}
																data-listed={c.side !== "even" || undefined}
															>
																{signed(c.net)}
															</span>
														) : (
															<span className="muted">—</span>
														)}
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</>
					) : (
						<p className="callout">{t.noTags}</p>
					)}
				</>
			)}
		</section>
	);
}
