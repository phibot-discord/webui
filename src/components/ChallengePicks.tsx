"use client";

import Link from "@/components/LocaleLink";
import { useI18n } from "@/i18n/provider";
import { songPath } from "@/lib/song-path";
import { fill } from "@/phi/lib/card-i18n";
import type { ChallengeView } from "@/server/save-views";

export function ChallengePicks({ view }: { view: ChallengeView }) {
	const { m } = useI18n();
	const t = m.challengePicks;
	const colors = m.compare.challengeColors;
	const now = view.now;
	return (
		<>
			<h2 className="desk-section-title">{t.title}</h2>
			<p className="lede">{t.lede}</p>
			{now ? (
				<p className="field-hint">
					{fill(t.now, { rank: `${colors[now.color] ?? ""} ${now.sum}` })}
				</p>
			) : null}
			{view.rows.length ? (
				<>
					<div className="data-scroll">
						<table className="data-table chal-table">
							<thead>
								<tr>
									<th scope="col" className="num">
										{t.sum}
									</th>
									<th scope="col">{t.charts}</th>
									<th scope="col" className="num">
										{t.total}
									</th>
									<th scope="col">{t.reaches}</th>
								</tr>
							</thead>
							<tbody>
								{view.rows.map((row) => {
									const text =
										row.color > 0 ? `${colors[row.color]} ${row.sum}` : t.below;
									const better =
										now !== null &&
										row.color * 100 + row.sum > now.color * 100 + now.sum;
									return (
										<tr key={row.sum}>
											<th scope="row" className="num">
												{row.sum}
											</th>
											<td>
												<ul className="chal-charts">
													{row.charts.map((c) => (
														<li key={`${c.id}:${c.rank}`}>
															<span
																className={`chart-level chart-level-${c.rank}`}
															>
																{c.rank}
															</span>
															{c.level}
															<Link href={songPath(c.id)} prefetch={false}>
																{view.songs[c.id] ?? c.id}
															</Link>
															<span className="muted">{c.acc.toFixed(2)}%</span>
														</li>
													))}
												</ul>
											</td>
											<td className="num">
												{row.total.toLocaleString("en-US")}
											</td>
											<td>{better ? <strong>{text}</strong> : text}</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
					<p className="field-hint chal-note">{t.note}</p>
				</>
			) : (
				<p className="callout">{t.empty}</p>
			)}
		</>
	);
}
