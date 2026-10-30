"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { fill } from "@/phi/lib/card-i18n";

export type YourScore = {
	rank: string;
	constant: number;
	score: number;
	acc: number;
	fc: boolean;
	rks: number;
};

type Rank =
	| { state: "loading" }
	| { state: "failed" }
	| { state: "ok"; rank: number; of: number; percent: number };

function useRank(id: string, row: YourScore): Rank {
	const [rank, setRank] = useState<Rank>({ state: "loading" });
	useEffect(() => {
		const ac = new AbortController();
		fetch(
			`/api/leaderboard?${new URLSearchParams({
				chart: id,
				level: row.rank,
				acc: String(row.acc),
			})}`,
			{ signal: ac.signal },
		)
			.then(async (res) => {
				if (!res.ok) throw new Error(String(res.status));
				const body = (await res.json()) as {
					rank?: number;
					of?: number;
					percent?: number;
				};
				if (typeof body.rank !== "number" || typeof body.of !== "number") {
					throw new Error("shape");
				}
				setRank({
					state: "ok",
					rank: body.rank,
					of: body.of,
					percent: body.percent ?? 0,
				});
			})
			.catch(() => {
				if (!ac.signal.aborted) setRank({ state: "failed" });
			});
		return () => ac.abort();
	}, [id, row.rank, row.acc]);
	return rank;
}

function RankCell({ id, row }: { id: string; row: YourScore }) {
	const { m } = useI18n();
	const t = m.songPage;
	const rank = useRank(id, row);
	if (rank.state === "loading")
		return <span className="muted">{t.rankLoading}</span>;
	if (rank.state === "failed")
		return <span className="muted">{t.rankFailed}</span>;
	return (
		<>
			{fill(t.rankOf, {
				rank: rank.rank.toLocaleString(),
				of: rank.of.toLocaleString(),
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
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
