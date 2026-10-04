"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChartSearch, useChartCatalog } from "@/components/ChartSearch";
import { useI18n } from "@/i18n/provider";
import {
	type ChartLevel,
	type ChartSummary,
	findChart,
} from "@/lib/chart-catalog";
import { persistCardReload } from "@/lib/save-refresh";
import {
	chartRks,
	estimateScore,
	MANUAL_MAX_RECORDS,
	MANUAL_NAME_MAX,
	type ManualRecord,
	type ManualSaveData,
	manualRecordKey,
	rankingScoreOf,
	roundAcc,
	validAcc,
	validScore,
} from "@/phi/lib/manual-score";

type Row = {
	key: string;
	id: string;
	rank: ChartLevel;
	song: string;
	difficulty: number;
	acc: string;
	score: string;
	fc: boolean;
};

function parseAcc(raw: string): number | undefined {
	if (!/^\d{1,3}(\.\d{0,6})?$/.test(raw)) return;
	const n = Number(raw);
	return validAcc(n) ? roundAcc(n) : undefined;
}

function parseScore(raw: string): number | undefined | null {
	if (raw === "") return null;
	if (!/^\d{1,7}$/.test(raw)) return;
	const n = Number(raw);
	return validScore(n) ? n : undefined;
}

function rowsFrom(records: ManualRecord[], list: ChartSummary[]): Row[] {
	return records.map((rec) => {
		const hit = findChart(list, { id: rec.id, rank: rec.rank });
		return {
			key: manualRecordKey(rec.id, rec.rank),
			id: rec.id,
			rank: rec.rank,
			song: hit?.song.song ?? rec.id.replace(/\.0$/, ""),
			difficulty: hit?.difficulty ?? 0,
			acc: String(rec.acc),
			score: rec.score != null ? String(rec.score) : "",
			fc: rec.fc === true || rec.acc >= 100,
		};
	});
}

export function ManualScores({
	initial,
	defaultName,
}: {
	initial: ManualSaveData | null;
	defaultName: string;
}) {
	const { m } = useI18n();
	const t = m.manual;
	const router = useRouter();
	const catalog = useChartCatalog();
	const [name, setName] = useState(initial?.playerId || defaultName);
	const [rows, setRows] = useState<Row[]>([]);
	const [hydrated, setHydrated] = useState(false);
	const [pending, setPending] = useState<"save" | "clear" | undefined>();
	const [confirmClear, setConfirmClear] = useState(false);
	const [error, setError] = useState<string>();

	useEffect(() => {
		if (hydrated || catalog.status !== "ready") return;
		setRows(rowsFrom(initial?.records ?? [], catalog.list));
		setHydrated(true);
	}, [catalog, hydrated, initial]);

	const parsed = useMemo(
		() =>
			rows.map((row) => {
				const acc = parseAcc(row.acc);
				const score = parseScore(row.score);
				const fc = row.fc || acc === 100;
				const rks = acc != null ? chartRks(acc, row.difficulty) : 0;
				return {
					row,
					acc,
					score,
					fc,
					rks,
					estimated: acc != null ? estimateScore(acc, fc) : undefined,
					valid: acc != null && score !== undefined,
				};
			}),
		[rows],
	);
	const allValid = parsed.every((p) => p.valid);
	const rks = rankingScoreOf(
		parsed.flatMap((p) => (p.acc != null ? [{ acc: p.acc, rks: p.rks }] : [])),
	);

	function add(song: ChartSummary, rank: ChartLevel) {
		const cell = song.charts[rank];
		if (!cell) return;
		const key = manualRecordKey(song.id, rank);
		setRows((prev) =>
			prev.some((r) => r.key === key) || prev.length >= MANUAL_MAX_RECORDS
				? prev
				: [
						{
							key,
							id: song.id,
							rank,
							song: song.song,
							difficulty: cell[0],
							acc: "",
							score: "",
							fc: false,
						},
						...prev,
					],
		);
	}

	function patch(key: string, next: Partial<Row>) {
		setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...next } : r)));
	}

	async function save() {
		if (!allValid || pending) return;
		setPending("save");
		setError(undefined);
		try {
			const records = parsed.map((p) => ({
				id: p.row.id,
				rank: p.row.rank,
				acc: p.acc,
				score: p.score ?? undefined,
				fc: p.fc || undefined,
			}));
			const res = await fetch("/api/manual", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ playerId: name, records }),
			});
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as { error?: string };
				setError(data.error || t.saveFailed);
				return;
			}
			persistCardReload();
			router.push("/me/b30");
		} catch {
			setError(t.saveFailed);
		} finally {
			setPending(undefined);
		}
	}

	async function clear() {
		if (pending) return;
		setPending("clear");
		setError(undefined);
		try {
			const res = await fetch("/api/manual", { method: "DELETE" });
			if (!res.ok) {
				setError(t.clearFailed);
				return;
			}
			persistCardReload();
			router.push("/me");
		} catch {
			setError(t.clearFailed);
		} finally {
			setPending(undefined);
			setConfirmClear(false);
		}
	}

	return (
		<>
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<p className="manual-notice" role="note">
				{t.notice}
			</p>

			<div className="manual-head">
				<label className="field field-col">
					<span>{t.playerName}</span>
					<input
						type="text"
						maxLength={MANUAL_NAME_MAX}
						value={name}
						placeholder={t.playerNamePlaceholder}
						onChange={(e) => setName(e.target.value)}
					/>
				</label>
				<div className="field field-col">
					<span>{t.addChart}</span>
					<ChartSearch
						catalog={catalog}
						placeholder={t.searchPlaceholder}
						onPick={add}
						isTaken={(song, rank) =>
							rows.some((r) => r.key === manualRecordKey(song.id, rank))
						}
					/>
				</div>
			</div>

			<p className="manual-summary">
				<span>
					<span className="meta-label">{t.rks} </span>
					<span className="meta-value">{rks.toFixed(4)}</span>
				</span>
				<span className="meta-label">
					{t.charts.replaceAll("{n}", String(rows.length))}
				</span>
			</p>

			{rows.length ? (
				<div className="manual-table-wrap">
					<table className="manual-table">
						<thead>
							<tr>
								<th>{m.score.chart}</th>
								<th className="num">{t.acc}</th>
								<th className="num">{t.score}</th>
								<th>{t.fc}</th>
								<th className="num">{t.rks}</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{parsed.map(({ row, acc, score, fc, rks, estimated, valid }) => (
								<tr key={row.key} data-invalid={valid ? undefined : "true"}>
									<td>
										<span className="manual-song">
											<span className={`chart-level chart-level-${row.rank}`}>
												<span>{row.rank}</span>
												<span>{row.difficulty.toFixed(1)}</span>
											</span>
											<span className="manual-song-title">{row.song}</span>
										</span>
									</td>
									<td className="num">
										<div className="manual-field">
											<input
												type="text"
												inputMode="decimal"
												placeholder="99.87"
												aria-label={t.acc}
												value={row.acc}
												onChange={(e) =>
													patch(row.key, {
														acc: e.target.value
															.replace(/[^\d.]/g, "")
															.slice(0, 10),
													})
												}
											/>
											{score === null && estimated != null ? (
												<span className="manual-estimated" aria-hidden="true">
													{"\u00a0"}
												</span>
											) : null}
										</div>
									</td>
									<td className="num">
										<div className="manual-field">
											<input
												type="text"
												inputMode="numeric"
												aria-label={t.score}
												placeholder={
													estimated != null ? String(estimated) : "—"
												}
												value={row.score}
												onChange={(e) =>
													patch(row.key, {
														score: e.target.value
															.replace(/\D/g, "")
															.slice(0, 7),
													})
												}
											/>
											{score === null && estimated != null ? (
												<span className="manual-estimated">
													{t.scoreEstimated}
												</span>
											) : null}
										</div>
									</td>
									<td>
										<input
											type="checkbox"
											aria-label={t.fc}
											checked={fc}
											disabled={acc === 100}
											onChange={(e) => patch(row.key, { fc: e.target.checked })}
										/>
									</td>
									<td className="num">{acc != null ? rks.toFixed(2) : "—"}</td>
									<td>
										<button
											type="button"
											className="btn btn-ghost btn-mini"
											aria-label={t.remove}
											onClick={() =>
												setRows((prev) => prev.filter((r) => r.key !== row.key))
											}
										>
											×
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p className="manual-empty">{t.empty}</p>
			)}

			{!allValid ? (
				<p className="bind-error" role="alert">
					{t.invalid}
				</p>
			) : null}
			{error ? (
				<p className="bind-error" role="alert">
					{error}
				</p>
			) : null}

			<div className="manual-actions">
				<button
					type="button"
					className="btn btn-primary"
					disabled={!hydrated || !allValid || !rows.length || Boolean(pending)}
					onClick={() => void save()}
				>
					{pending === "save" ? t.saving : t.save}
				</button>
				{initial ? (
					confirmClear ? (
						<>
							<span className="meta-label">{t.clearConfirm}</span>
							<button
								type="button"
								className="btn btn-danger"
								disabled={Boolean(pending)}
								onClick={() => void clear()}
							>
								{pending === "clear" ? t.clearing : t.clear}
							</button>
							<button
								type="button"
								className="btn btn-ghost"
								disabled={Boolean(pending)}
								onClick={() => setConfirmClear(false)}
							>
								{m.bind.unbindNo}
							</button>
						</>
					) : (
						<button
							type="button"
							className="btn btn-ghost"
							disabled={Boolean(pending)}
							onClick={() => setConfirmClear(true)}
						>
							{t.clear}
						</button>
					)
				) : null}
			</div>
		</>
	);
}
