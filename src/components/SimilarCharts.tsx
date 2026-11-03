"use client";

import { useId, useState } from "react";
import Link from "@/components/LocaleLink";
import { SegRadio } from "@/components/SegRadio";
import { useI18n } from "@/i18n/provider";
import { songPath } from "@/lib/song-path";
import type { SimilarRow } from "@/server/song-page";

export function SimilarCharts({
	lists,
	top,
	signedIn,
}: {
	lists: Record<string, SimilarRow[]>;
	top: string;
	signedIn: boolean;
}) {
	const { m } = useI18n();
	const t = m.similar;
	const status = m.progress.status;
	const ids = useId();
	const levels = Object.keys(lists);
	const [level, setLevel] = useState(
		levels.includes(top) ? top : (levels.at(-1) ?? ""),
	);
	const rows = lists[level] ?? [];
	return (
		<section className="song-section" aria-labelledby={`${ids}-h`}>
			<h2 id={`${ids}-h`}>{t.title}</h2>
			<p className="field-hint">{t.lede}</p>
			{levels.length > 1 ? (
				<SegRadio
					className="song-level-pick"
					legend={t.level}
					value={level}
					options={levels.map((value) => ({ value, label: value }))}
					onChange={setLevel}
				/>
			) : null}
			<div className="data-scroll">
				<table className="data-table">
					<thead>
						<tr>
							<th scope="col">{t.song}</th>
							<th scope="col">{t.levelCol}</th>
							<th scope="col" className="num">
								{t.constant}
							</th>
							{signedIn ? <th scope="col">{t.yours}</th> : null}
						</tr>
					</thead>
					<tbody>
						{rows.map((r) => (
							<tr key={`${r.id}:${r.rank}`}>
								<th scope="row" className="data-song">
									<Link href={songPath(r.id)} prefetch={false}>
										{r.title}
									</Link>
								</th>
								<td>
									<span className={`chart-level chart-level-${r.rank}`}>
										{r.rank}
									</span>
								</td>
								<td className="num">{r.c.toFixed(1)}</td>
								{signedIn ? (
									<td>
										{r.status && r.status !== "none" ? (
											<>
												<span className="pg-badge" data-status={r.status}>
													{status[r.status]}
												</span>{" "}
												{r.acc != null ? `${r.acc.toFixed(2)}%` : null}
											</>
										) : (
											<span className="muted">{status.none}</span>
										)}
									</td>
								) : null}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
