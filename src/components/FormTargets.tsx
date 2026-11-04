"use client";

import { useId } from "react";
import Link from "@/components/LocaleLink";
import { useI18n } from "@/i18n/provider";
import type { FormTarget } from "@/lib/form-targets";
import { songPath } from "@/lib/song-path";
import { localizeChartTagName } from "@/phi/lib/card-i18n";
import type { SongNames } from "@/server/save-views";

const pct = (n: number) => `${n.toFixed(2)}%`;

export function FormTargets({
	rows,
	songs,
}: {
	rows: FormTarget[];
	songs: SongNames;
}) {
	const { m, locale } = useI18n();
	const t = m.formTargets;
	const ids = useId();
	const tagLocale = locale;
	return (
		<section className="song-section tg-suggest" aria-labelledby={`${ids}-h`}>
			<h2 id={`${ids}-h`} className="desk-section-title">
				{t.title}
			</h2>
			<p className="field-hint">
				{t.lede}{" "}
				<Link href="/profile" prefetch={false}>
					{t.profileLink}
				</Link>
			</p>
			{rows.length ? (
				<div className="data-scroll">
					<table className="data-table">
						<thead>
							<tr>
								<th scope="col">{t.song}</th>
								<th scope="col">{t.level}</th>
								<th scope="col" className="num">
									{t.constant}
								</th>
								<th scope="col" className="num">
									{t.acc}
								</th>
								<th scope="col" className="num">
									{t.expected}
								</th>
								<th scope="col" className="num">
									{t.gain}
								</th>
								<th scope="col">{t.weak}</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((r) => (
								<tr key={`${r.id}:${r.rank}`}>
									<th scope="row" className="data-song">
										<Link href={songPath(r.id)} prefetch={false}>
											{songs[r.id] ?? r.id.replace(/\.0$/, "")}
										</Link>
									</th>
									<td>
										<span className={`chart-level chart-level-${r.rank}`}>
											{r.rank}
										</span>
									</td>
									<td className="num">{r.c.toFixed(1)}</td>
									<td className="num">{pct(r.acc)}</td>
									<td className="num">{pct(r.expected)}</td>
									<td className="num">+{r.gain.toFixed(4)}</td>
									<td>
										{r.weak.length ? (
											r.weak
												.map((name) => localizeChartTagName(name, tagLocale))
												.join(" · ")
										) : (
											<span className="muted">—</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p className="callout">{t.none}</p>
			)}
		</section>
	);
}
