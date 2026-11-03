"use client";

import { useId } from "react";
import Link from "@/components/LocaleLink";
import { useI18n } from "@/i18n/provider";
import { songPath } from "@/lib/song-path";
import { fill } from "@/phi/lib/card-i18n";
import type { SuggestionsView } from "@/server/save-views";

export function TargetSuggestions({ view }: { view: SuggestionsView }) {
	const { m } = useI18n();
	const t = m.suggest;
	const ids = useId();
	if (!view.rows.length) return null;
	const nameOf = (id: string) => view.songs[id] ?? id.replace(/\.0$/, "");
	return (
		<section className="song-section tg-suggest" aria-labelledby={`${ids}-h`}>
			<h2 id={`${ids}-h`} className="desk-section-title">
				{t.title}
			</h2>
			<p className="field-hint">{t.basis[view.basis]}</p>
			<div className="data-scroll">
				<table className="data-table">
					<thead>
						<tr>
							<th scope="col">{t.song}</th>
							<th scope="col">{t.level}</th>
							<th scope="col" className="num">
								{t.constant}
							</th>
							<th scope="col">{t.like}</th>
						</tr>
					</thead>
					<tbody>
						{view.rows.map((r) => (
							<tr key={`${r.id}:${r.rank}`}>
								<th scope="row" className="data-song">
									<Link href={songPath(r.id)} prefetch={false}>
										{nameOf(r.id)}
									</Link>
								</th>
								<td>
									<span className={`chart-level chart-level-${r.rank}`}>
										{r.rank}
									</span>
								</td>
								<td className="num">{r.c.toFixed(1)}</td>
								<td>
									{fill(t.likeOf, {
										song: nameOf(r.seed.id),
										level: r.seed.rank,
									})}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
