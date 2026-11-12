"use client";

import { useEffect, useState } from "react";
import { localeTag } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { DARE_DAYS } from "@/lib/dare";
import { fetchRank, rankUrl } from "@/lib/rank-lookup";
import { fill } from "@/phi/lib/card-i18n";

export type YourScore = {
	rank: string;
	constant: number;
	score: number;
	acc: number;
	fc: boolean;
	rks: number;
	history: [t: number, acc: number][];
};

const SPARK_W = 96;
const SPARK_H = 24;
const SPARK_PAD = 3;

function AccHistory({ points }: { points: YourScore["history"] }) {
	const { m, locale } = useI18n();
	const t = m.songPage;
	const first = points[0];
	const last = points.at(-1);
	if (!first || !last) return <span className="muted">—</span>;
	const day = (ms: number) =>
		new Date(ms).toLocaleDateString(localeTag(locale), {
			timeZone: "Asia/Shanghai",
			dateStyle: "medium",
		});
	if (points.length < 2) {
		return (
			<span className="muted">
				{fill(t.historyOne, { date: day(first[0]) })}
			</span>
		);
	}
	const accs = points.map((p) => p[1]);
	const lo = Math.min(...accs);
	const hi = Math.max(...accs);
	const span = hi - lo || 1;
	const step = (SPARK_W - SPARK_PAD * 2) / (points.length - 1);
	const path = points
		.map((p, i) => {
			const x = SPARK_PAD + i * step;
			const y =
				SPARK_PAD + (1 - (p[1] - lo) / span) * (SPARK_H - SPARK_PAD * 2);
			return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
		})
		.join(" ");
	const label = fill(t.historySummary, {
		n: points.length,
		from: `${first[1].toFixed(2)}%`,
		to: `${last[1].toFixed(2)}%`,
		date: day(first[0]),
	});
	return (
		<span className="acc-spark">
			<svg
				role="img"
				aria-label={label}
				width={SPARK_W}
				height={SPARK_H}
				viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
			>
				<title>{label}</title>
				<path d={path} />
				<circle
					cx={SPARK_PAD + (points.length - 1) * step}
					cy={
						SPARK_PAD + (1 - (last[1] - lo) / span) * (SPARK_H - SPARK_PAD * 2)
					}
					r={2.5}
				/>
			</svg>
			<span className="acc-spark-gain" aria-hidden="true">
				{last[1] > first[1] ? `+${(last[1] - first[1]).toFixed(2)}` : "="}
			</span>
		</span>
	);
}

type Rank =
	| { state: "loading" }
	| { state: "failed" }
	| { state: "ok"; rank: number; of: number; percent: number };

function useRank(id: string, row: YourScore): Rank {
	const [rank, setRank] = useState<Rank>({ state: "loading" });
	useEffect(() => {
		const ac = new AbortController();
		void fetchRank(rankUrl(id, row.rank, row.acc), ac.signal).then((got) => {
			if (ac.signal.aborted) return;
			setRank(
				got.kind === "ranked"
					? {
							state: "ok",
							rank: got.rank,
							of: got.of,
							percent: got.percent ?? 0,
						}
					: { state: "failed" },
			);
		});
		return () => ac.abort();
	}, [id, row.rank, row.acc]);
	return rank;
}

function RankCell({ id, row }: { id: string; row: YourScore }) {
	const { m, locale } = useI18n();
	const t = m.songPage;
	const rank = useRank(id, row);
	if (rank.state === "loading")
		return <span className="muted">{t.rankLoading}</span>;
	if (rank.state === "failed")
		return <span className="muted">{t.rankFailed}</span>;
	return (
		<>
			{fill(t.rankOf, {
				rank: rank.rank.toLocaleString(localeTag(locale)),
				of: rank.of.toLocaleString(localeTag(locale)),
			})}
		</>
	);
}

export function SongYourScores({
	id,
	rows,
}: {
	id: string;
	rows: YourScore[];
}) {
	const { m } = useI18n();
	const t = m.songPage;
	const d = m.dare;
	const [busy, setBusy] = useState<string | null>(null);
	const [note, setNote] = useState<{ rank: string; text: string } | null>(null);

	async function dare(rank: string) {
		setBusy(rank);
		setNote(null);
		try {
			const res = await fetch("/api/dare", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ id, rank }),
			});
			if (!res.ok) throw new Error(String(res.status));
			const { path } = (await res.json()) as { path: string };
			await navigator.clipboard.writeText(
				new URL(path, window.location.origin).href,
			);
			setNote({ rank, text: fill(d.copied, { days: DARE_DAYS }) });
		} catch {
			setNote({ rank, text: d.failed });
		} finally {
			setBusy(null);
		}
	}

	return (
		<div className="data-scroll">
			<table className="data-table">
				<thead>
					<tr>
						<th scope="col">{t.level}</th>
						<th scope="col" className="num">
							{t.scoreCol}
						</th>
						<th scope="col" className="num">
							{t.acc}
						</th>
						<th scope="col" className="num">
							{t.rks}
						</th>
						<th scope="col" className="num">
							{t.rank}
						</th>
						<th scope="col">{t.history}</th>
						<th scope="col">{d.col}</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.rank}>
							<th scope="row">
								<span className={`chart-level chart-level-${row.rank}`}>
									{row.rank}
								</span>
							</th>
							<td className="num">
								{row.score.toString().padStart(7, "0")}
								{row.score >= 1_000_000 ? (
									<span className="pg-badge" data-status="ap">
										AP
									</span>
								) : row.fc ? (
									<span className="pg-badge" data-status="fc">
										FC
									</span>
								) : null}
							</td>
							<td className="num">{row.acc.toFixed(2)}%</td>
							<td className="num">{row.rks.toFixed(2)}</td>
							<td className="num">
								<RankCell id={id} row={row} />
							</td>
							<td>
								<AccHistory points={row.history} />
							</td>
							<td>
								<button
									type="button"
									className="btn btn-ghost btn-sm"
									disabled={busy === row.rank}
									onClick={() => void dare(row.rank)}
								>
									{d.button}
								</button>
								{note?.rank === row.rank ? (
									<span className="field-hint" role="status">
										{" "}
										{note.text}
									</span>
								) : null}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
