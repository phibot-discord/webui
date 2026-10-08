"use client";

import { useId } from "react";
import { ChartSearch, type useChartCatalog } from "@/components/ChartSearch";
import { SegRadio } from "@/components/SegRadio";
import { useI18n } from "@/i18n/provider";
import type { ChartSummary } from "@/lib/chart-catalog";
import { SONG_LEVELS, type SongLevel } from "@/server/card-kinds";

export function SongPicker({
	catalog,
	song,
	chart,
	level,
	onChange,
}: {
	catalog: ReturnType<typeof useChartCatalog>;
	song?: ChartSummary;
	chart: string;
	level: SongLevel;
	onChange: (chart: string, level: SongLevel) => void;
}) {
	const { m } = useI18n();
	const labelId = useId();
	const ready = catalog.status === "ready";
	const name = song?.song ?? (ready ? m.card.songUnknown : chart);
	return (
		<section className="song-pick" aria-labelledby={labelId}>
			<div className="song-pick-search">
				<p className="opt-label" id={labelId}>
					{m.card.songChart}
				</p>
				<ChartSearch
					catalog={catalog}
					placeholder={m.card.songSearch}
					labelledBy={labelId}
					onPick={(picked, rank) => onChange(picked.id, rank)}
				/>
			</div>
			{chart ? (
				<div className="song-pick-current">
					<div className="song-pick-id">
						<p className="song-pick-title">{name}</p>
						{song ? (
							<p className="song-pick-composer">{song.composer}</p>
						) : null}
					</div>
					<SegRadio
						legend={m.card.songLevel}
						value={level}
						className="opt-levels"
						options={SONG_LEVELS.map((l) => {
							const cell = song?.charts[l];
							const missing = ready && Boolean(song) && !cell;
							return {
								value: l,
								label: l,
								hint: cell ? cell[0].toFixed(1) : undefined,
								disabled: missing,
								title: missing
									? m.card.songNoLevel.replaceAll("{level}", l)
									: undefined,
								className: `seg-level seg-level-${l}`,
							};
						})}
						onChange={(next) => onChange(chart, next)}
					/>
				</div>
			) : null}
		</section>
	);
}
