"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "@/components/LocaleLink";
import { useI18n } from "@/i18n/provider";
import { practiceKey } from "@/lib/practice-list";
import { songPath } from "@/lib/song-path";
import { fill, signed } from "@/phi/lib/card-i18n";
import type { PracticeView } from "@/server/save-views";

export function PracticeList({ view }: { view: PracticeView }) {
	const { m } = useI18n();
	const t = m.practice;
	const router = useRouter();
	const [busy, setBusy] = useState<string | null>(null);
	const [failed, setFailed] = useState(false);

	async function remove(id: string, rank: string) {
		setBusy(practiceKey(id, rank));
		setFailed(false);
		try {
			const res = await fetch("/api/practice-list", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ op: "remove", id, rank }),
			});
			if (!res.ok) throw new Error(String(res.status));
			router.refresh();
		} catch {
			setFailed(true);
		} finally {
			setBusy(null);
		}
	}

	return (
		<>
			<h2 className="desk-section-title">{t.title}</h2>
			<p className="lede">{t.lede}</p>
			{view.rows.length ? (
				<>
					<p className="field-hint">
						{fill(t.count, { n: view.rows.length, max: view.max })}
					</p>
					<div className="data-scroll prac-scroll">
						<table className="data-table prac-table">
							<thead>
								<tr>
									<th scope="col">{m.targets.song}</th>
									<th scope="col">{m.targets.level}</th>
									<th scope="col" className="num">
										{m.targets.constant}
									</th>
									<th scope="col">{t.goal}</th>
									<th scope="col" className="num">
										{t.now}
									</th>
									<th scope="col" className="num">
										{t.since}
									</th>
									<th scope="col" />
								</tr>
							</thead>
							<tbody>
								{view.rows.map((r) => {
									const key = practiceKey(r.id, r.rank);
									const song = view.songs[r.id] ?? r.id;
									return (
										<tr key={key} data-done={r.done ? "true" : undefined}>
											<th scope="row" className="data-song">
												<Link href={songPath(r.id)} prefetch={false}>
													{song}
												</Link>
											</th>
											<td>
												<span className={`chart-level chart-level-${r.rank}`}>
													{r.rank}
												</span>
											</td>
											<td className="num">
												{r.c != null ? r.c.toFixed(1) : "—"}
											</td>
											<td>
												{r.goal === "acc"
													? fill(t.goals.acc, {
															value: (r.value ?? 100).toFixed(2),
														})
													: t.goals[r.goal]}
											</td>
											<td className="num">
												{r.acc == null ? (
													<span className="muted">{m.targets.notPlayed}</span>
												) : (
													<>
														{`${r.acc.toFixed(2)}%`}
														{r.ap ? (
															<span className="pg-badge" data-status="ap">
																AP
															</span>
														) : r.fc ? (
															<span className="pg-badge" data-status="fc">
																FC
															</span>
														) : null}
													</>
												)}
											</td>
											<td className="num">
												{r.acc != null && r.from != null
													? signed(r.acc - r.from)
													: "—"}
											</td>
											<td>
												{r.done ? (
													<span className="prac-done">{t.reached}</span>
												) : null}
												<button
													type="button"
													className="btn btn-ghost btn-sm"
													aria-label={fill(t.removeLabel, {
														song,
														level: r.rank,
													})}
													disabled={busy === key}
													onClick={() => void remove(r.id, r.rank)}
												>
													{t.remove}
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
					{failed ? (
						<p className="callout" role="status">
							{t.failed}
						</p>
					) : null}
				</>
			) : (
				<p className="field-hint">{t.empty}</p>
			)}
		</>
	);
}
