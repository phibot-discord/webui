"use client";

import { useId, useMemo, useState } from "react";
import Link from "@/components/LocaleLink";
import { SegRadio } from "@/components/SegRadio";
import { useI18n } from "@/i18n/provider";
import {
	DIFF_TIERS,
	type DiffChart,
	defaultLevel,
	difficultyTable,
} from "@/lib/difficulty-table";
import { songPath } from "@/lib/song-path";
import { fill } from "@/phi/lib/card-i18n";

export function DifficultyTable({
	charts,
	jackets,
}: {
	charts: DiffChart[];
	jackets: Record<string, string>;
}) {
	const { m } = useI18n();
	const t = m.difficultyTable;
	const ids = useId();
	const levels = useMemo(() => difficultyTable(charts), [charts]);
	const [level, setLevel] = useState(() => defaultLevel(levels));
	const shown = levels.find((l) => l.level === level) ?? levels[0];
	if (!shown) return null;
	return (
		<section className="pp-section" aria-labelledby={`${ids}-dt`}>
			<h3 id={`${ids}-dt`}>{t.title}</h3>
			<p className="field-hint">{t.lede}</p>
			<SegRadio
				legend={t.level}
				value={String(shown.level)}
				options={levels.map((l) => ({
					value: String(l.level),
					label: String(l.level),
				}))}
				onChange={(next) => setLevel(Number(next))}
			/>
			<p className="field-hint" role="status">
				{fill(t.count, { n: shown.count })}
			</p>
			<dl className="dt-rows">
				{DIFF_TIERS.map((tier) => (
					<div key={tier} className="dt-row" data-tier={tier}>
						<dt>{t.tiers[tier]}</dt>
						<dd>
							{shown.tiers[tier].length ? (
								<ul className="dt-tiles">
									{shown.tiers[tier].map((c) => (
										<li key={`${c.id}:${c.rank}`}>
											<Link
												href={songPath(c.id)}
												prefetch={false}
												className="dt-tile"
												title={fill(t.tile, {
													song: c.song,
													level: c.rank,
													c: c.c.toFixed(1),
													acc: c.acc.toFixed(2),
												})}
											>
												{jackets[c.id] ? (
													// biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain
													<img
														src={jackets[c.id]}
														alt=""
														loading="lazy"
														decoding="async"
														width={128}
														height={68}
													/>
												) : null}
												<span className="dt-name">{c.song}</span>
												<span className="dt-meta">
													<span className={`chart-level chart-level-${c.rank}`}>
														{c.rank}
													</span>{" "}
													{c.c.toFixed(1)} · {c.acc.toFixed(2)}%
												</span>
											</Link>
										</li>
									))}
								</ul>
							) : (
								<span className="muted">{t.none}</span>
							)}
						</dd>
					</div>
				))}
			</dl>
		</section>
	);
}
