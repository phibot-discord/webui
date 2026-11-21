"use client";

import { useId } from "react";
import Link from "@/components/LocaleLink";
import { useI18n } from "@/i18n/provider";
import { AP_GOODS_MAX } from "@/lib/near-misses";
import { songPath } from "@/lib/song-path";
import { fill } from "@/phi/lib/card-i18n";
import type { NearMissesView } from "@/server/save-views";

const pct = (n: number) => `${n.toFixed(2)}%`;
const grouped = (n: number) => n.toLocaleString("en-US");

export function NearMisses({ view }: { view: NearMissesView }) {
	const { m } = useI18n();
	const t = m.nearMisses;
	const ids = useId();
	const name = (id: string) => view.songs[id] ?? id.replace(/\.0$/, "");
	return (
		<section className="song-section nm-section" aria-labelledby={`${ids}-h`}>
			<h2 id={`${ids}-h`} className="desk-section-title">
				{t.title}
			</h2>
			<p className="field-hint">{t.lede}</p>
			<h3>{t.apTitle}</h3>
			{view.ap.length ? (
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
									{t.score}
								</th>
								<th scope="col" className="num">
									{t.acc}
								</th>
								<th scope="col" className="num">
									{t.goods}
								</th>
								<th scope="col" className="num">
									{t.apGain}
								</th>
							</tr>
						</thead>
						<tbody>
							{view.ap.map((r) => (
								<tr key={`${r.id}:${r.rank}`}>
									<th scope="row" className="data-song">
										<Link href={songPath(r.id)} prefetch={false}>
											{name(r.id)}
										</Link>
									</th>
									<td>
										<span className={`chart-level chart-level-${r.rank}`}>
											{r.rank}
										</span>
									</td>
									<td className="num">{r.c.toFixed(1)}</td>
									<td className="num">{grouped(r.score)}</td>
									<td className="num">{pct(r.acc)}</td>
									<td className="num">{r.goods}</td>
									<td className="num">
										{r.gain == null ? "—" : `+${r.gain.toFixed(4)}`}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p className="callout">{fill(t.apNone, { n: AP_GOODS_MAX })}</p>
			)}
			<h3>{t.breakTitle}</h3>
			{view.breaks.length ? (
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
									{t.score}
								</th>
								<th scope="col" className="num">
									{t.acc}
								</th>
								<th scope="col" className="num">
									{t.combo}
								</th>
								<th scope="col" className="num">
									{t.goods}
								</th>
							</tr>
						</thead>
						<tbody>
							{view.breaks.map((r) => (
								<tr key={`${r.id}:${r.rank}`}>
									<th scope="row" className="data-song">
										<Link href={songPath(r.id)} prefetch={false}>
											{name(r.id)}
										</Link>
									</th>
									<td>
										<span className={`chart-level chart-level-${r.rank}`}>
											{r.rank}
										</span>
									</td>
									<td className="num">{r.c.toFixed(1)}</td>
									<td className="num">{grouped(r.score)}</td>
									<td className="num">{pct(r.acc)}</td>
									<td className="num">
										{r.combo} / {r.notes}
									</td>
									<td className="num">{r.goods}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p className="callout">{t.breakNone}</p>
			)}
		</section>
	);
}
