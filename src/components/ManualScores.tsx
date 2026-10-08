"use client";

import {
	ArrowCounterClockwise,
	Trash,
	WarningCircle,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChartSearch, useChartCatalog } from "@/components/ChartSearch";
import { chartSearchText } from "@/components/ScoreControl";
import { Announce } from "@/components/Tool";
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
	acc: string;
	score: string;
	fc: boolean;
	song?: string;
	difficulty?: number;
};

type Field = "acc" | "score";

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

function rowsFrom(records: ManualRecord[]): Row[] {
	return records.map((rec) => ({
		key: manualRecordKey(rec.id, rec.rank),
		id: rec.id,
		rank: rec.rank,
		acc: String(rec.acc),
		score: rec.score != null ? String(rec.score) : "",
		fc: rec.fc === true || rec.acc >= 100,
	}));
}

function fieldOf(
	root: HTMLElement | null,
	key: string,
	field: string,
): HTMLElement | null {
	return (
		root?.querySelector<HTMLElement>(
			`[data-row="${CSS.escape(key)}"][data-field="${field}"]`,
		) ?? null
	);
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
	const ids = useId();
	const addLabelId = `${ids}-add`;
	const listRef = useRef<HTMLUListElement>(null);
	const searchRef = useRef<HTMLDivElement>(null);
	const clearRef = useRef<HTMLButtonElement>(null);
	const keepRef = useRef<HTMLButtonElement>(null);
	const focusNext = useRef<
		{ key: string; field: string } | "search" | undefined
	>(undefined);
	const [name, setName] = useState(initial?.playerId || defaultName);
	const [rows, setRows] = useState<Row[]>(() =>
		rowsFrom(initial?.records ?? []),
	);
	const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
	const [submitted, setSubmitted] = useState(false);
	const [pending, setPending] = useState<"save" | "clear" | undefined>();
	const [confirmClear, setConfirmClear] = useState<boolean | "back">(false);
	const [error, setError] = useState<string>();
	const [said, setSaid] = useState("");

	const list = catalog.status === "ready" ? catalog.list : undefined;
	const loading = catalog.status === "loading" && rows.length > 0;

	const parsed = useMemo(
		() =>
			rows.map((row) => {
				const hit = list ? findChart(list, row) : undefined;
				const song = hit?.song.song ?? row.song ?? row.id.replace(/\.0$/, "");
				const difficulty = hit?.difficulty ?? row.difficulty;
				const acc = parseAcc(row.acc);
				const score = parseScore(row.score);
				const fc = row.fc || acc === 100;
				return {
					row,
					song,
					difficulty,
					chart: `${song} ${row.rank}${difficulty != null ? ` ${difficulty.toFixed(1)}` : ""}`,
					acc,
					score,
					fc,
					rks:
						acc != null && difficulty != null
							? chartRks(acc, difficulty)
							: undefined,
					estimated: acc != null ? estimateScore(acc, fc) : undefined,
					accError:
						acc != null
							? undefined
							: row.acc === ""
								? t.accRequired
								: t.accInvalid,
					scoreError: score === undefined ? t.scoreInvalid : undefined,
				};
			}),
		[rows, list, t],
	);
	const allValid = parsed.every((p) => !p.accError && !p.scoreError);
	const rks = parsed.every((p) => p.difficulty != null)
		? rankingScoreOf(
				parsed.flatMap((p) =>
					p.acc != null && p.rks != null ? [{ acc: p.acc, rks: p.rks }] : [],
				),
			)
		: undefined;
	const full = rows.length >= MANUAL_MAX_RECORDS;

	useEffect(() => {
		const next = focusNext.current;
		if (!next) return;
		focusNext.current = undefined;
		if (next === "search") {
			searchRef.current?.querySelector<HTMLInputElement>("input")?.focus();
		} else {
			fieldOf(listRef.current, next.key, next.field)?.focus();
		}
	});

	useEffect(() => {
		if (confirmClear === true) keepRef.current?.focus();
		if (confirmClear === "back") clearRef.current?.focus();
	}, [confirmClear]);

	function add(song: ChartSummary, rank: ChartLevel) {
		const cell = song.charts[rank];
		if (!cell || full) return;
		const key = manualRecordKey(song.id, rank);
		if (rows.some((r) => r.key === key)) return;
		setRows((prev) => [
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
		]);
		focusNext.current = { key, field: "acc" };
		setSaid(
			t.added.replaceAll(
				"{chart}",
				`${song.song} ${rank} ${cell[0].toFixed(1)}`,
			),
		);
	}

	function remove(index: number) {
		const gone = parsed[index];
		if (!gone) return;
		const after = rows[index + 1] ?? rows[index - 1];
		setRows((prev) => prev.filter((r) => r.key !== gone.row.key));
		focusNext.current = after ? { key: after.key, field: "remove" } : "search";
		setSaid(t.removed.replaceAll("{chart}", gone.chart));
	}

	function patch(key: string, next: Partial<Row>) {
		setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...next } : r)));
	}

	function touch(key: string, field: Field) {
		setTouched((prev) => {
			const id = `${key}:${field}`;
			if (prev.has(id)) return prev;
			const next = new Set(prev);
			next.add(id);
			return next;
		});
	}

	async function save() {
		if (pending) return;
		if (!allValid) {
			setSubmitted(true);
			const bad = parsed.find((p) => p.accError || p.scoreError);
			if (bad) {
				fieldOf(
					listRef.current,
					bad.row.key,
					bad.accError ? "acc" : "score",
				)?.focus();
			}
			return;
		}
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
				setConfirmClear("back");
				return;
			}
			persistCardReload();
			router.push("/me");
		} catch {
			setError(t.clearFailed);
			setConfirmClear("back");
		} finally {
			setPending(undefined);
		}
	}

	return (
		<>
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<p className="manual-notice">{t.notice}</p>

			<div className="manual-head">
				<label className="field field-col">
					<span className="field-label">{t.playerName}</span>
					<input
						type="text"
						autoComplete="off"
						maxLength={MANUAL_NAME_MAX}
						value={name}
						placeholder={t.playerNamePlaceholder}
						onChange={(e) => setName(e.target.value)}
					/>
				</label>
				<div className="field field-col" ref={searchRef}>
					<span className="field-label" id={addLabelId}>
						{t.addChart}
					</span>
					<ChartSearch
						catalog={catalog}
						placeholder={t.searchPlaceholder}
						onPick={add}
						labelledBy={addLabelId}
						text={chartSearchText(m)}
						disabled={full}
						isTaken={(song, rank) =>
							rows.some((r) => r.key === manualRecordKey(song.id, rank))
						}
					/>
					{full ? (
						<span className="field-hint">
							{t.full.replaceAll("{n}", String(MANUAL_MAX_RECORDS))}
						</span>
					) : null}
				</div>
			</div>

			{catalog.status === "failed" ? (
				rows.length ? (
					<p className="callout manual-warn" role="alert">
						{t.catalogFailed}
					</p>
				) : (
					<div className="manual-failed" role="alert">
						<p>
							<WarningCircle size={18} weight="fill" aria-hidden />
							{t.catalogFailedEmpty}
						</p>
						<button
							type="button"
							className="btn btn-ghost btn-sm"
							onClick={() => window.location.reload()}
						>
							<ArrowCounterClockwise size={16} aria-hidden />
							{m.phira.reload}
						</button>
					</div>
				)
			) : null}

			<p className="manual-summary">
				<span>
					<span className="meta-label">{t.rks} </span>
					<span className="meta-value">
						{loading || rks == null || !parsed.some((p) => p.rks != null)
							? "—"
							: rks.toFixed(4)}
					</span>
				</span>
				<span className="meta-label">
					{rows.length === 1
						? t.chartsOne
						: t.charts.replaceAll("{n}", String(rows.length))}
				</span>
			</p>

			<Announce>{said}</Announce>

			{loading ? (
				<div className="manual-loading" aria-busy="true">
					<p className="sr-only">{t.loading}</p>
					{rows.slice(0, 4).map((row) => (
						<div key={row.key} className="manual-skeleton" aria-hidden="true">
							<span />
							<span />
							<span />
						</div>
					))}
				</div>
			) : rows.length ? (
				<>
					<div className="manual-cols" aria-hidden="true">
						<span>{m.score.chart}</span>
						<span className="num">{t.acc}</span>
						<span className="num">{t.score}</span>
						<span>{t.fc}</span>
						<span className="num">{t.rks}</span>
						<span />
					</div>
					<ul className="manual-rows" ref={listRef} aria-label={t.listLabel}>
						{parsed.map((p, i) => {
							const { row } = p;
							const base = `${ids}-${i}`;
							const chartId = `${base}-chart`;
							const showAcc =
								Boolean(p.accError) &&
								(submitted || touched.has(`${row.key}:acc`));
							const showScore =
								Boolean(p.scoreError) &&
								(submitted || touched.has(`${row.key}:score`));
							const estimatedHint = p.score === null && p.estimated != null;
							return (
								<li
									key={row.key}
									className="manual-row"
									data-invalid={showAcc || showScore ? "true" : undefined}
								>
									<div className="manual-song">
										<span className={`chart-level chart-level-${row.rank}`}>
											<span>{row.rank}</span>
											{p.difficulty != null ? (
												<span>{p.difficulty.toFixed(1)}</span>
											) : null}
										</span>
										<span className="manual-song-title">{p.song}</span>
										<span id={chartId} hidden>
											{p.chart}
										</span>
									</div>
									<div className="manual-cell manual-acc">
										<label
											className="manual-label"
											id={`${base}-acc-l`}
											htmlFor={`${base}-acc`}
										>
											{t.acc}
										</label>
										<input
											id={`${base}-acc`}
											data-row={row.key}
											data-field="acc"
											className="input"
											type="text"
											inputMode="decimal"
											autoComplete="off"
											aria-labelledby={`${base}-acc-l ${chartId}`}
											aria-invalid={showAcc || undefined}
											aria-describedby={showAcc ? `${base}-acc-e` : undefined}
											value={row.acc}
											onBlur={() => touch(row.key, "acc")}
											onChange={(e) =>
												patch(row.key, {
													acc: e.target.value
														.replace(/[^\d.]/g, "")
														.slice(0, 10),
												})
											}
										/>
										{showAcc ? (
											<span className="field-error" id={`${base}-acc-e`}>
												{p.accError}
											</span>
										) : null}
									</div>
									<div className="manual-cell manual-score">
										<label
											className="manual-label"
											id={`${base}-score-l`}
											htmlFor={`${base}-score`}
										>
											{t.score}
										</label>
										<input
											id={`${base}-score`}
											data-row={row.key}
											data-field="score"
											className="input"
											type="text"
											inputMode="numeric"
											autoComplete="off"
											placeholder={
												p.estimated != null ? String(p.estimated) : "—"
											}
											aria-labelledby={`${base}-score-l ${chartId}`}
											aria-invalid={showScore || undefined}
											aria-describedby={
												showScore
													? `${base}-score-e`
													: estimatedHint
														? `${base}-score-h`
														: undefined
											}
											value={row.score}
											onBlur={() => touch(row.key, "score")}
											onChange={(e) =>
												patch(row.key, {
													score: e.target.value.replace(/\D/g, "").slice(0, 7),
												})
											}
										/>
										{showScore ? (
											<span className="field-error" id={`${base}-score-e`}>
												{p.scoreError}
											</span>
										) : estimatedHint ? (
											<span className="manual-estimated" id={`${base}-score-h`}>
												{t.scoreEstimated}
											</span>
										) : null}
									</div>
									<div className="manual-cell manual-fc">
										<label className="manual-fc-toggle">
											<input
												type="checkbox"
												data-row={row.key}
												data-field="fc"
												aria-labelledby={`${base}-fc-l ${chartId}`}
												checked={p.fc}
												disabled={p.acc === 100}
												onChange={(e) =>
													patch(row.key, { fc: e.target.checked })
												}
											/>
											<span id={`${base}-fc-l`}>{t.fc}</span>
										</label>
									</div>
									<div className="manual-end">
										<p className="manual-cell manual-rks">
											<span className="manual-label">{t.rks} </span>
											<span className="manual-rks-value">
												{p.rks != null ? p.rks.toFixed(2) : "—"}
											</span>
										</p>
										<div className="manual-cell manual-remove">
											<button
												type="button"
												className="btn btn-quiet btn-icon"
												data-row={row.key}
												data-field="remove"
												aria-label={t.removeRow.replaceAll("{chart}", p.chart)}
												title={t.remove}
												onClick={() => remove(i)}
											>
												<Trash size={18} aria-hidden />
											</button>
										</div>
									</div>
								</li>
							);
						})}
					</ul>
				</>
			) : catalog.status === "failed" ? null : (
				<p className="manual-empty">{t.empty}</p>
			)}

			{submitted && !allValid ? (
				<p className="manual-error" role="alert">
					{t.invalid}
				</p>
			) : null}
			{error ? (
				<p className="manual-error" role="alert">
					{error}
				</p>
			) : null}

			<div className="manual-actions">
				<button
					type="button"
					className="btn btn-primary"
					disabled={loading || !rows.length}
					aria-disabled={pending ? true : undefined}
					aria-busy={pending === "save" || undefined}
					onClick={() => void save()}
				>
					{pending === "save" ? t.saving : t.save}
				</button>
				{initial ? (
					confirmClear === true ? (
						<fieldset
							className="manual-confirm"
							onKeyDown={(e) => {
								if (e.key === "Escape" && !pending) setConfirmClear("back");
							}}
						>
							<legend>{t.clearConfirm}</legend>
							<div className="manual-confirm-actions">
								<button
									type="button"
									className="btn btn-danger"
									aria-disabled={pending ? true : undefined}
									aria-busy={pending === "clear" || undefined}
									onClick={() => void clear()}
								>
									{pending === "clear" ? t.clearing : t.clear}
								</button>
								<button
									ref={keepRef}
									type="button"
									className="btn btn-ghost"
									aria-disabled={pending ? true : undefined}
									onClick={() => {
										if (!pending) setConfirmClear("back");
									}}
								>
									{m.bind.unbindNo}
								</button>
							</div>
						</fieldset>
					) : (
						<button
							ref={clearRef}
							type="button"
							className="btn btn-quiet manual-clear"
							aria-disabled={pending ? true : undefined}
							onClick={() => {
								if (!pending) setConfirmClear(true);
							}}
						>
							{t.clear}
						</button>
					)
				) : null}
			</div>
		</>
	);
}
