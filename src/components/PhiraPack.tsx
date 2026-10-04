"use client";

import { useState } from "react";
import { ChartSearch, useChartCatalog } from "@/components/ChartSearch";
import { useI18n } from "@/i18n/provider";
import {
	CHART_LEVELS,
	type ChartSummary,
} from "@/lib/chart-catalog";

export function PhiraPack() {
	const { m } = useI18n();
	const t = m.phira;
	const catalog = useChartCatalog();
	const [song, setSong] = useState<ChartSummary | undefined>();

	return (
		<>
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<section className="callout score-form">
				<ChartSearch
					catalog={catalog}
					placeholder={t.searchPlaceholder}
					onPick={(picked) => setSong(picked)}
				/>
				{song ? (
					<ul className="phira-levels">
						{CHART_LEVELS.map((rank) => {
							const cell = song.charts[rank];
							if (!cell) return null;
							const href = `/api/phira?id=${encodeURIComponent(song.id)}&level=${rank}`;
							return (
								<li key={rank}>
									<span className="phira-level-name">
										{rank} {cell[0].toFixed(1)}
									</span>
									<a className="btn btn-ghost" href={href}>
										{t.download}
									</a>
								</li>
							);
						})}
					</ul>
				) : (
					<p className="meta">{t.empty}</p>
				)}
			</section>
		</>
	);
}
