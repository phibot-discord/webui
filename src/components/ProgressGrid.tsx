"use client";

import { type CSSProperties, useId, useMemo, useRef, useState } from "react";
import Link from "@/components/LocaleLink";
import { SegRadio } from "@/components/SegRadio";
import { useI18n } from "@/i18n/provider";
import { type ChartStatus, STATUS_ORDER } from "@/lib/chart-status";
import { songPath } from "@/lib/song-path";
import { fill } from "@/phi/lib/card-i18n";
import { LEVEL, type LevelKind } from "@/phi/lib/const";
import type { ProgressRow, ProgressView } from "@/server/save-views";

type Metric = "clear" | "fc" | "ap";
const METRICS: Metric[] = ["clear", "fc", "ap"];
const COUNTS: Record<Metric, ReadonlySet<ChartStatus>> = {
	clear: new Set(["ap", "fc", "clear"]),
	fc: new Set(["ap", "fc"]),
	ap: new Set(["ap"]),
};

type Cell = { rows: ProgressRow[]; by: Record<ChartStatus, number> };
type Pick = { rank: LevelKind; bucket: number | "all" };

function emptyCell(): Cell {
	return { rows: [], by: { ap: 0, fc: 0, clear: 0, played: 0, none: 0 } };
}

function countOf(cell: Cell, metric: Metric) {
	let n = 0;
	for (const s of COUNTS[metric]) n += cell.by[s];
	return n;
}

export function ProgressGrid({ view }: { view: ProgressView }) {
	const { m } = useI18n();
	const t = m.progress;
	const ids = useId();
	const detail = useRef<HTMLHeadingElement>(null);
	const [metric, setMetric] = useState<Metric>("clear");
	const [picked, setPicked] = useState<Pick>();

	const { buckets, cells, totals } = useMemo(() => {
		const cells = new Map<string, Cell>();
		const totals = new Map<LevelKind, Cell>();
		let lo = Number.POSITIVE_INFINITY;
		let hi = 0;
		for (const row of view.rows) {
			const [, rank, constant, status] = row;
			const bucket = Math.floor(constant);
			lo = Math.min(lo, bucket);
			hi = Math.max(hi, bucket);
			const key = `${rank}:${bucket}`;
			const cell = cells.get(key) ?? emptyCell();
			cell.rows.push(row);
			cell.by[status]++;
			cells.set(key, cell);
			const total = totals.get(rank) ?? emptyCell();
			total.rows.push(row);
			total.by[status]++;
			totals.set(rank, total);
		}
		const buckets: number[] = [];
		for (let b = hi; b >= lo; b--) buckets.push(b);
		return { buckets, cells, totals };
	}, [view.rows]);

	if (!view.rows.length) {
		return (
			<>
				<h2 className="desk-section-title">{t.title}</h2>
				<p className="lede">{t.empty}</p>
			</>
		);
	}

	const cellAt = (p: Pick) =>
		p.bucket === "all"
			? totals.get(p.rank)
			: cells.get(`${p.rank}:${p.bucket}`);
	const what = t.show[metric];
	const top = [...LEVEL].reverse().find((rank) => totals.has(rank)) ?? "IN";
	const shown: Pick = picked ?? { rank: top, bucket: "all" };
	const pickedCell = cellAt(shown);
	const pickedRows = pickedCell
		? [...pickedCell.rows].sort(
				(a, b) =>
					STATUS_ORDER.indexOf(a[3]) - STATUS_ORDER.indexOf(b[3]) ||
					b[2] - a[2] ||
					b[4] - a[4],
			)
		: [];

	const choose = (p: Pick) => {
		setPicked(p);
		requestAnimationFrame(() => detail.current?.focus());
	};

	const renderCell = (p: Pick, label: string) => {
		const cell = cellAt(p);
		if (!cell) {
			return (
				<td key={p.rank} className="pg-cell pg-empty">
					<span aria-hidden="true">·</span>
				</td>
			);
		}
		const total = cell.rows.length;
		const n = countOf(cell, metric);
		const on =
			shown.rank === p.rank && shown.bucket === p.bucket ? true : undefined;
		return (
			<td key={p.rank} className="pg-cell">
				<button
					type="button"
					className="pg-btn"
					aria-pressed={on ?? false}
					aria-controls={`${ids}-list`}
					aria-label={fill(t.cell, {
						level: p.rank,
						constant: label,
						n,
						total,
						what,
					})}
					style={{ "--p": n / total } as CSSProperties}
					data-done={n === total || undefined}
					onClick={() => choose(p)}
				>
					<span className="pg-n">{n}</span>
					<span className="pg-of">/{total}</span>
				</button>
			</td>
		);
	};

	return (
		<>
			<h2 className="desk-section-title">{t.title}</h2>
			<p className="lede">{t.lede}</p>
			<div className="pg-layout">
				<div className="pg-side">
					<SegRadio
						legend={t.showLabel}
						value={metric}
						options={METRICS.map((value) => ({ value, label: t.show[value] }))}
						onChange={setMetric}
						note={t.legend}
					/>
					<div className="data-scroll pg-scroll">
						<table className="pg-grid">
							<thead>
								<tr>
									<th scope="col">{t.constant}</th>
									{LEVEL.map((rank) => (
										<th key={rank} scope="col">
											<span className={`chart-level chart-level-${rank}`}>
												{rank}
											</span>
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{buckets.map((bucket) => (
									<tr key={bucket}>
										<th scope="row" className="num">
											{bucket}
										</th>
										{LEVEL.map((rank) =>
											renderCell({ rank, bucket }, String(bucket)),
										)}
									</tr>
								))}
							</tbody>
							<tfoot>
								<tr>
									<th scope="row">{t.total}</th>
									{LEVEL.map((rank) =>
										renderCell({ rank, bucket: "all" }, t.total),
									)}
								</tr>
							</tfoot>
						</table>
					</div>
					<p className="field-hint pg-hint">{t.pick}</p>
				</div>

				<section className="pg-detail" aria-labelledby={`${ids}-list-title`}>
					<h3 id={`${ids}-list-title`} ref={detail} tabIndex={-1}>
						{shown.bucket === "all"
							? fill(t.listTitleAll, { level: shown.rank })
							: fill(t.listTitle, {
									level: shown.rank,
									constant: shown.bucket,
								})}
					</h3>
					<div id={`${ids}-list`}>
						{pickedCell ? (
							<>
								<ul className="pg-status-sum">
									{STATUS_ORDER.map((s) =>
										pickedCell.by[s] ? (
											<li key={s} data-status={s}>
												{t.status[s]} {pickedCell.by[s]}
											</li>
										) : null,
									)}
								</ul>
								<div className="data-scroll">
									<table className="data-table pg-table">
										<thead>
											<tr>
												<th scope="col">{t.song}</th>
												<th scope="col" className="num">
													{t.constant}
												</th>
												<th scope="col">{t.statusCol}</th>
												<th scope="col" className="num">
													{t.acc}
												</th>
												<th scope="col" className="num">
													{t.score}
												</th>
											</tr>
										</thead>
										<tbody>
											{pickedRows.map(
												([id, rank, constant, status, acc, score]) => (
													<tr key={`${id}:${rank}`} data-status={status}>
														<th scope="row" className="data-song">
															<Link href={songPath(id)} prefetch={false}>
																{view.songs[id] ?? id}
															</Link>
														</th>
														<td className="num">{constant.toFixed(1)}</td>
														<td>
															<span className="pg-badge" data-status={status}>
																{t.status[status]}
															</span>
														</td>
														<td className="num">
															{status === "none" ? "—" : `${acc.toFixed(2)}%`}
														</td>
														<td className="num">
															{status === "none"
																? "—"
																: score.toString().padStart(7, "0")}
														</td>
													</tr>
												),
											)}
										</tbody>
									</table>
								</div>
							</>
						) : null}
					</div>
				</section>
			</div>
		</>
	);
}
