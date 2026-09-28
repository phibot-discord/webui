"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import {
	CHART_LEVELS,
	type ChartLevel,
	type ChartSummary,
	loadChartCatalog,
	searchCharts,
} from "@/lib/chart-catalog";

type CatalogState =
	| { status: "loading" }
	| { status: "ready"; list: ChartSummary[] }
	| { status: "failed" };

/** Loads `/api/charts` once for the page. */
export function useChartCatalog(): CatalogState {
	const [state, setState] = useState<CatalogState>({ status: "loading" });
	useEffect(() => {
		let dead = false;
		loadChartCatalog()
			.then((list) => {
				if (!dead) setState({ status: "ready", list });
			})
			.catch(() => {
				if (!dead) setState({ status: "failed" });
			});
		return () => {
			dead = true;
		};
	}, []);
	return state;
}

export function ChartSearch({
	catalog,
	placeholder,
	onPick,
	disabled,
	isTaken,
}: {
	catalog: CatalogState;
	placeholder: string;
	onPick: (song: ChartSummary, rank: ChartLevel) => void;
	disabled?: boolean;
	/** Dim levels the caller already has (manual editor). */
	isTaken?: (song: ChartSummary, rank: ChartLevel) => boolean;
}) {
	const { m } = useI18n();
	const listId = useId();
	const root = useRef<HTMLDivElement>(null);
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const list = catalog.status === "ready" ? catalog.list : [];
	const hits = open && query ? searchCharts(list, query) : [];

	useEffect(() => {
		if (!open) return;
		const onPointer = (e: PointerEvent) => {
			if (!root.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("pointerdown", onPointer);
		return () => document.removeEventListener("pointerdown", onPointer);
	}, [open]);

	return (
		<div className="chart-search" ref={root}>
			<input
				type="search"
				role="combobox"
				autoComplete="off"
				spellCheck={false}
				disabled={disabled || catalog.status !== "ready"}
				placeholder={
					catalog.status === "loading"
						? m.score.loadingCharts
						: catalog.status === "failed"
							? m.score.chartsFailed
							: placeholder
				}
				value={query}
				aria-controls={listId}
				aria-expanded={hits.length > 0}
				onChange={(e) => {
					setQuery(e.target.value);
					setOpen(true);
				}}
				onFocus={() => setOpen(true)}
				onKeyDown={(e) => {
					if (e.key === "Escape") setOpen(false);
				}}
			/>
			{hits.length ? (
				<ul className="chart-search-list" id={listId}>
					{hits.map((song) => (
						<li key={song.id}>
							<span className="chart-search-song">
								<span className="chart-search-title">{song.song}</span>
								<span className="chart-search-composer">{song.composer}</span>
							</span>
							<span className="chart-search-levels">
								{CHART_LEVELS.map((rank) => {
									const cell = song.charts[rank];
									if (!cell) return null;
									const taken = isTaken?.(song, rank) ?? false;
									return (
										<button
											key={rank}
											type="button"
											className={`chart-level chart-level-${rank}`}
											aria-disabled={taken || undefined}
											title={
												cell[1] != null
													? `${rank} ${cell[0].toFixed(1)} · ${cell[1]} ${m.score.notesShort}`
													: `${rank} ${cell[0].toFixed(1)}`
											}
											onClick={() => {
												if (taken) return;
												onPick(song, rank);
												setQuery("");
												setOpen(false);
											}}
										>
											<span>{rank}</span>
											<span>{cell[0].toFixed(1)}</span>
										</button>
									);
								})}
							</span>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
