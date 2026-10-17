"use client";

import {
	ArrowCounterClockwise,
	ArrowsClockwise,
	Trash,
	X,
} from "@phosphor-icons/react";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { ChartSearch, useChartCatalog } from "@/components/ChartSearch";
import { SyncTime } from "@/components/Desk";
import { chartSearchText } from "@/components/ScoreControl";
import { Announce } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";
import {
	type ChartLevel,
	type ChartSummary,
	findChart,
} from "@/lib/chart-catalog";
import { parseSimBase, readSim, startFrom, writeSim } from "@/lib/sim-storage";
import type { LevelKind } from "@/phi/lib/const";
import {
	chartRks,
	isLevelKind,
	manualRecordKey,
	parseAcc,
	roundAcc,
} from "@/phi/lib/manual-score";
import {
	isBlank,
	SIM_MAX_EDITS,
	type SimBase,
	type SimChart,
	type SimEdit,
	type SimSlot,
	simulate,
	withAcc,
	withAp,
	withScore,
} from "@/phi/lib/simulation";

function fmtRks(n: number) {
	return n.toFixed(4);
}

function fmtDelta(n: number) {
	const abs = Math.abs(n);
	if (abs < 5e-5) return fmtRks(0);
	return `${n > 0 ? "+" : "−"}${fmtRks(abs)}`;
}

function fmtAcc(n: number) {
	return `${n.toFixed(4)}%`;
}

function slotNumber(slot: string) {
	return Number(slot.slice(1));
}

function fieldOf(
	root: HTMLElement | null,
	row: string,
	field: string,
): HTMLElement | null {
	return (
		root?.querySelector<HTMLElement>(
			`[data-row="${CSS.escape(row)}"][data-field="${field}"]`,
		) ?? null
	);
}

const REST_STEP = 50;

type Row = {
	rowKey: string;
	chartKey: string;
	extra: boolean;
	slot?: string;
	place?: number;
	id: string;
	rank: LevelKind;
	difficulty?: number;
	song: string;
	realAcc?: number;
	realScore?: number;
	realRks?: number;
	edit?: SimEdit;
	chart?: SimChart;
};

type After = {
	text: string;
	kind: "up" | "down" | "same" | "new" | "out" | "none";
};

export function SongSimulation({
	userId,
	playerId,
	initial,
}: {
	userId: string;
	playerId: string;
	initial: SimBase;
}) {
	const { m } = useI18n();
	const t = m.simulate;
	const catalog = useChartCatalog();
	const ids = useId();
	const addLabelId = `${ids}-add`;
	const listRef = useRef<HTMLUListElement>(null);
	const searchRef = useRef<HTMLDivElement>(null);
	const resetRef = useRef<HTMLButtonElement>(null);
	const keepRef = useRef<HTMLButtonElement>(null);
	const syncRef = useRef<HTMLButtonElement>(null);
	const syncKeepRef = useRef<HTMLButtonElement>(null);
	const focusNext = useRef<
		{ row: string; field: string } | "search" | undefined
	>(undefined);
	const [ready, setReady] = useState(false);
	const [base, setBase] = useState<SimBase>(initial);
	const [edits, setEdits] = useState<SimEdit[]>([]);
	const [latestRev, setLatestRev] = useState(initial.rev);
	const [stored, setStored] = useState(true);
	const [syncing, setSyncing] = useState(false);
	const [confirmReset, setConfirmReset] = useState<boolean | "back">(false);
	const [confirmSync, setConfirmSync] = useState<boolean | "back">(false);
	const [restShown, setRestShown] = useState(0);
	const [error, setError] = useState<string>();
	const [said, setSaid] = useState("");
	const editsRef = useRef(edits);
	editsRef.current = edits;
	const baseRef = useRef(base);
	baseRef.current = base;

	useEffect(() => {
		const start = startFrom(readSim(userId), initial);
		setBase(start.base);
		setEdits(start.edits);
		setReady(true);
	}, [userId, initial]);

	useEffect(() => {
		if (!ready) return;
		setStored(writeSim(userId, { v: 1, base, edits }));
	}, [ready, userId, base, edits]);

	useEffect(() => {
		const next = focusNext.current;
		if (!next) return;
		focusNext.current = undefined;
		if (next === "search") {
			searchRef.current?.querySelector<HTMLInputElement>("input")?.focus();
		} else {
			fieldOf(listRef.current, next.row, next.field)?.focus();
		}
	});

	useEffect(() => {
		if (confirmReset === true) keepRef.current?.focus();
		if (confirmReset === "back") resetRef.current?.focus();
	}, [confirmReset]);

	useEffect(() => {
		if (confirmSync === true) syncKeepRef.current?.focus();
		if (confirmSync === "back") syncRef.current?.focus();
	}, [confirmSync]);

	const list = catalog.status === "ready" ? catalog.list : undefined;
	const names = useMemo(
		() => new Map((list ?? []).map((s) => [s.id, s.song] as const)),
		[list],
	);
	const nameOf = useCallback(
		(id: string, song?: string) =>
			names.get(id) ?? song ?? id.replace(/\.0$/, ""),
		[names],
	);
	const difficultyOf = useCallback(
		(id: string, rank: SimEdit["rank"]) =>
			list ? findChart(list, { id, rank })?.difficulty : undefined,
		[list],
	);
	const result = useMemo(
		() => simulate(base.records, edits, difficultyOf),
		[base, edits, difficultyOf],
	);
	const current = useMemo(
		() => simulate(base.records, []).current,
		[base.records],
	);
	const realScores = useMemo(
		() =>
			new Map(
				base.records.map((r) => [manualRecordKey(r[0], r[1]), r[4]] as const),
			),
		[base],
	);
	const realAccs = useMemo(
		() =>
			new Map(
				base.records.map((r) => [manualRecordKey(r[0], r[1]), r[2]] as const),
			),
		[base],
	);

	const rest = useMemo(() => {
		const held = new Set([...current.phi, ...current.best].map((s) => s.key));
		return base.records
			.map(([id, rank, acc, difficulty, score]) => ({
				key: manualRecordKey(id, rank),
				id,
				rank,
				acc,
				difficulty,
				score,
				rks: chartRks(acc, difficulty),
			}))
			.filter((e) => !held.has(e.key))
			.sort((a, b) => b.rks - a.rks || (a.key < b.key ? -1 : 1));
	}, [base, current]);

	const rows = useMemo<Row[]>(() => {
		const inSave = [...current.phi, ...current.best];
		const shownRest = rest.slice(0, restShown);
		const held = new Set([
			...inSave.map((s) => s.key),
			...shownRest.map((e) => e.key),
		]);
		const byKey = new Map(result.charts.map((c) => [c.key, c] as const));
		const outside = result.charts
			.filter((c) => !held.has(c.key))
			.map<Row>((c) => ({
				rowKey: `x|${c.key}`,
				chartKey: c.key,
				extra: true,
				id: c.edit.id,
				rank: c.edit.rank,
				difficulty: c.difficulty,
				song: nameOf(c.edit.id, c.edit.song),
				realAcc: c.realAcc,
				realScore: realScores.get(c.key),
				realRks: c.realRks,
				edit: c.edit,
				chart: c,
			}));
		const inList = inSave.map<Row>((s) => {
			const c = byKey.get(s.key);
			return {
				rowKey: `${s.slot}|${s.key}`,
				chartKey: s.key,
				extra: false,
				slot: s.slot,
				id: s.id,
				rank: s.rank,
				difficulty: s.difficulty,
				song: nameOf(s.id),
				realAcc: s.acc,
				realScore: realScores.get(s.key),
				realRks: s.rks,
				edit: c?.edit,
				chart: c,
			};
		});
		const below = shownRest.map<Row>((e, i) => {
			const c = byKey.get(e.key);
			return {
				rowKey: `#${inSave.length + i + 1}|${e.key}`,
				chartKey: e.key,
				extra: false,
				place: 27 + i + 1,
				id: e.id,
				rank: e.rank,
				difficulty: e.difficulty,
				song: nameOf(e.id),
				realAcc: e.acc,
				realScore: e.score,
				realRks: e.rks,
				edit: c?.edit,
				chart: c,
			};
		});
		return [...outside, ...inList, ...below];
	}, [result, current, rest, restShown, nameOf, realScores]);

	const afterOf = useMemo(() => {
		const phi = new Map(result.phi.map((s) => [s.key, s.slot] as const));
		const best = new Map(result.best.map((s) => [s.key, s.slot] as const));
		const nowPhi = new Set(current.phi.map((s) => s.key));
		const nowBest = new Set(current.best.map((s) => s.key));
		return (row: Row): After => {
			const k = row.chartKey;
			if (!row.slot) {
				const at = [phi.get(k), best.get(k)].filter(Boolean);
				return at.length
					? { text: at.join(" · "), kind: "new" }
					: { text: "—", kind: "none" };
			}
			const inP = row.slot.startsWith("P");
			const own = (inP ? phi : best).get(k);
			const other = (inP ? nowBest : nowPhi).has(k)
				? undefined
				: (inP ? best : phi).get(k);
			const text = [own ?? t.out, other].filter(Boolean).join(" · ");
			if (!own) return { text, kind: "out" };
			const d = slotNumber(own) - slotNumber(row.slot);
			return { text, kind: d < 0 ? "up" : d > 0 ? "down" : "same" };
		};
	}, [result, current, t.out]);

	const stale = ready && base.rev !== latestRev;
	const full = edits.length >= SIM_MAX_EDITS;

	function seedOf(
		real?: number,
		score?: number,
	): Pick<SimEdit, "acc" | "score"> {
		return real == null
			? { acc: "" }
			: {
					acc: String(roundAcc(real)),
					score: score != null ? String(score) : undefined,
				};
	}

	function matchesSave(edit: SimEdit, row: Row) {
		if (row.realAcc == null) return isBlank(edit);
		return (
			parseAcc(edit.acc) === roundAcc(row.realAcc) ||
			(row.realScore != null && edit.score === String(row.realScore))
		);
	}

	function add(song: ChartSummary, rank: ChartLevel) {
		const cell = song.charts[rank];
		if (!cell || !isLevelKind(rank) || full) return;
		const key = manualRecordKey(song.id, rank);
		const chart = `${song.song} ${rank} ${cell[0].toFixed(1)}`;
		const held = rows.find((r) => r.chartKey === key);
		if (held) {
			focusNext.current = { row: held.rowKey, field: "acc" };
			setSaid(t.alreadyListed.replaceAll("{chart}", chart));
			return;
		}
		setEdits((prev) => [
			{
				id: song.id,
				rank,
				...seedOf(realAccs.get(key), realScores.get(key)),
				difficulty: cell[0],
				song: song.song,
			},
			...prev,
		]);
		focusNext.current = { row: `x|${key}`, field: "acc" };
		setSaid(t.added.replaceAll("{chart}", chart));
	}

	function change(row: Row, next: (e: SimEdit) => SimEdit) {
		setEdits((prev) => {
			const i = prev.findIndex(
				(e) => manualRecordKey(e.id, e.rank) === row.chartKey,
			);
			const had = i >= 0 ? prev[i] : undefined;
			const edit = next(
				had ?? {
					id: row.id,
					rank: row.rank,
					...seedOf(row.realAcc, row.realScore),
					difficulty: row.difficulty,
					song: row.song,
				},
			);
			if (!row.extra && matchesSave(edit, row)) {
				return had ? prev.filter((_, j) => j !== i) : prev;
			}
			if (had) return prev.map((e, j) => (j === i ? edit : e));
			if (prev.length >= SIM_MAX_EDITS) return prev;
			return [edit, ...prev];
		});
	}

	function revert(row: Row) {
		setEdits((prev) =>
			row.extra
				? prev.map((e) =>
						manualRecordKey(e.id, e.rank) === row.chartKey
							? { ...e, ...seedOf(row.realAcc, row.realScore) }
							: e,
					)
				: prev.filter((e) => manualRecordKey(e.id, e.rank) !== row.chartKey),
		);
	}

	function dropEdit(row: Row) {
		setEdits((prev) =>
			prev.filter((e) => manualRecordKey(e.id, e.rank) !== row.chartKey),
		);
		focusNext.current = row.extra
			? "search"
			: { row: row.rowKey, field: "acc" };
		setSaid(
			(row.extra ? t.removed : t.cleared).replaceAll(
				"{chart}",
				`${row.song} ${row.rank}`,
			),
		);
	}

	function walk(e: KeyboardEvent<HTMLInputElement>, field: string) {
		const dir =
			e.key === "Enter" || e.key === "ArrowDown"
				? 1
				: e.key === "ArrowUp"
					? -1
					: 0;
		if (!dir || e.nativeEvent.isComposing) return;
		const li = e.currentTarget.closest("li");
		const next = dir > 0 ? li?.nextElementSibling : li?.previousElementSibling;
		const input = next?.querySelector<HTMLInputElement>(
			`[data-field="${field}"]`,
		);
		if (!input) return;
		e.preventDefault();
		input.focus();
		input.select();
	}

	function reset() {
		setEdits([]);
		if (baseRef.current.rev !== latestRev) setBase(initial);
		setConfirmReset("back");
		setSaid(t.resetDone);
	}

	async function sync(confirmed = false) {
		if (syncing) return;
		if (editsRef.current.length && !confirmed) {
			setConfirmSync(true);
			return;
		}
		setConfirmSync("back");
		setSyncing(true);
		setError(undefined);
		try {
			const res = await fetch("/api/sim", { cache: "no-store" });
			const data = (await res.json().catch(() => ({}))) as {
				base?: unknown;
				error?: string;
			};
			const fresh = res.ok ? parseSimBase(data.base) : undefined;
			if (!fresh) {
				setError(res.ok ? t.syncFailed : data.error || t.syncFailed);
				return;
			}
			const same = fresh.rev === baseRef.current.rev;
			const changed = editsRef.current.length > 0;
			setLatestRev(fresh.rev);
			setBase(fresh);
			setEdits([]);
			setSaid(same && !changed ? t.alreadyLatest : t.synced);
		} catch {
			setError(t.syncFailed);
		} finally {
			setSyncing(false);
		}
	}

	return (
		<>
			<h2 className="desk-section-title">{t.title}</h2>
			<p className="lede">{t.lede}</p>
			<p className="manual-notice">{t.notice}</p>

			{ready ? (
				<>
					<div className="sim-bar">
						<p className="sim-based">
							{playerId} · {t.basedOn}{" "}
							{base.lastSynced ? <SyncTime iso={base.lastSynced} /> : "—"}
						</p>
						<button
							ref={syncRef}
							type="button"
							className={`btn btn-sm ${stale ? "btn-primary" : "btn-ghost"}`}
							aria-disabled={syncing || undefined}
							aria-busy={syncing || undefined}
							onClick={() => void sync()}
						>
							<ArrowsClockwise size={16} aria-hidden />
							{syncing ? t.syncing : t.sync}
						</button>
						<p className="field-hint sim-hint">{t.syncHint}</p>
					</div>
					{confirmSync === true ? (
						<fieldset
							className="manual-confirm sim-confirm"
							onKeyDown={(e) => {
								if (e.key === "Escape") setConfirmSync("back");
							}}
						>
							<legend>
								{t.syncConfirm.replaceAll("{n}", String(edits.length))}
							</legend>
							<div className="manual-confirm-actions">
								<button
									type="button"
									className="btn btn-danger"
									onClick={() => void sync(true)}
								>
									{t.sync}
								</button>
								<button
									ref={syncKeepRef}
									type="button"
									className="btn btn-ghost"
									onClick={() => setConfirmSync("back")}
								>
									{m.bind.unbindNo}
								</button>
							</div>
						</fieldset>
					) : null}
					{stale ? (
						<p className="callout sim-stale" role="status">
							{t.stale}
						</p>
					) : null}
					{stored ? null : (
						<p className="callout manual-warn" role="status">
							{t.storageOff}
						</p>
					)}
					{error ? (
						<p className="manual-error" role="alert">
							{error}
						</p>
					) : null}

					<div className="field field-col sim-add" ref={searchRef}>
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
						/>
						{full ? (
							<span className="field-hint">
								{t.full.replaceAll("{n}", String(SIM_MAX_EDITS))}
							</span>
						) : null}
					</div>

					<p className="manual-summary sim-summary">
						<span>
							<span className="meta-label">{t.rksBefore} </span>
							<span className="meta-value">{fmtRks(result.before)}</span>
						</span>
						<span aria-hidden="true">→</span>
						<span>
							<span className="meta-label">{t.rksAfter} </span>
							<span className="meta-value">{fmtRks(result.after)}</span>
						</span>
						<span
							className="sim-delta"
							data-gain={result.delta > 5e-5 || undefined}
						>
							{fmtDelta(result.delta)}
						</span>
					</p>

					<P3Panel phi={result.phi} nameOf={nameOf} />

					<Announce>{said}</Announce>

					<h3 className="sim-list-title">{t.listTitle}</h3>
					<p className="field-hint sim-list-lede">
						{t.listLede} {t.scoreHint}
					</p>
					<div className="sim-cols" aria-hidden="true">
						<span>{t.slot}</span>
						<span>{t.chart}</span>
						<span className="num">{t.acc}</span>
						<span className="num">{t.score}</span>
						<span>{t.ap}</span>
						<span className="num">{t.chartRks}</span>
						<span>{t.after}</span>
						<span />
					</div>
					<ul className="manual-rows" ref={listRef} aria-label={t.listLabel}>
						{rows.map((row, i) => {
							const { chart, edit } = row;
							const rid = `${ids}-${i}`;
							const chartId = `${rid}-chart`;
							const title = `${row.song} ${row.rank}${row.difficulty != null ? ` ${row.difficulty.toFixed(1)}` : ""}`;
							const typed = edit ? parseAcc(edit.acc) : undefined;
							const real = row.realAcc ?? 0;
							const ap = Math.max(real, typed ?? 0) >= 100;
							const after = afterOf(row);
							const afterRks =
								chart?.status === "better"
									? chart.newRks
									: chart?.status === "no_gain"
										? chart.realRks
										: undefined;
							const seed = seedOf(row.realAcc, row.realScore);
							const accValue = edit ? edit.acc : seed.acc;
							const scoreValue = edit ? (edit.score ?? "") : (seed.score ?? "");
							const unchanged =
								row.realAcc != null && typed === roundAcc(row.realAcc);
							const note =
								chart?.status === "no_gain" && !unchanged
									? t.noGain
									: chart?.status === "unknown"
										? t.unknown
										: chart?.status === "invalid" && edit?.acc !== ""
											? m.manual.accInvalid
											: undefined;
							const settle = () => {
								if (edit && edit.acc === "" && row.realAcc != null) revert(row);
							};
							return (
								<li
									key={row.rowKey}
									className="sim-row"
									data-better={chart?.status === "better" || undefined}
								>
									<span className="sim-slot">
										{row.slot ?? (row.place ? `#${row.place}` : "—")}
									</span>
									<div className="sim-chart">
										<div className="manual-song">
											<span className={`chart-level chart-level-${row.rank}`}>
												<span>{row.rank}</span>
												{row.difficulty != null ? (
													<span>{row.difficulty.toFixed(1)}</span>
												) : null}
											</span>
											<span className="manual-song-title">{row.song}</span>
											<span id={chartId} hidden>
												{title}
											</span>
										</div>
										<p className="sim-now">
											{row.realAcc != null
												? `${t.currentAcc} ${fmtAcc(row.realAcc)}${row.realScore != null ? ` · ${row.realScore}` : ""}`
												: t.noRecord}
										</p>
									</div>
									<div className="manual-cell manual-acc">
										<label
											className="manual-label"
											id={`${rid}-acc-l`}
											htmlFor={`${rid}-acc`}
										>
											{t.newAcc}
										</label>
										<input
											id={`${rid}-acc`}
											data-row={row.rowKey}
											data-field="acc"
											className="input"
											type="text"
											inputMode="decimal"
											autoComplete="off"
											aria-labelledby={`${rid}-acc-l ${chartId}`}
											aria-describedby={note ? `${rid}-acc-n` : undefined}
											value={accValue}
											onChange={(e) =>
												change(row, (ed) => withAcc(ed, e.target.value))
											}
											onBlur={settle}
											onKeyDown={(e) => walk(e, "acc")}
										/>
										{note ? (
											<span className="sim-note" id={`${rid}-acc-n`}>
												{note}
											</span>
										) : null}
									</div>
									<div className="manual-cell manual-score">
										<label
											className="manual-label"
											id={`${rid}-score-l`}
											htmlFor={`${rid}-score`}
										>
											{t.score}
										</label>
										<input
											id={`${rid}-score`}
											data-row={row.rowKey}
											data-field="score"
											className="input"
											type="text"
											inputMode="numeric"
											autoComplete="off"
											placeholder="—"
											aria-labelledby={`${rid}-score-l ${chartId}`}
											value={scoreValue}
											onChange={(e) =>
												change(row, (ed) => withScore(ed, e.target.value))
											}
											onBlur={settle}
											onKeyDown={(e) => walk(e, "score")}
										/>
									</div>
									<div className="manual-cell manual-fc">
										<label className="manual-fc-toggle">
											<input
												type="checkbox"
												data-row={row.rowKey}
												data-field="ap"
												aria-labelledby={`${rid}-ap-l ${chartId}`}
												checked={ap}
												disabled={real >= 100}
												onChange={(e) => {
													if (e.target.checked) {
														change(row, (ed) => withAp(ed, true));
													} else {
														revert(row);
													}
												}}
											/>
											<span id={`${rid}-ap-l`}>{t.ap}</span>
										</label>
									</div>
									<p className="sim-chart-rks">
										<span className="manual-label">{t.chartRks} </span>
										{edit ? (
											<>
												{row.realRks != null ? fmtRks(row.realRks) : "—"}
												<span aria-hidden="true">→</span>
												{afterRks != null ? fmtRks(afterRks) : "—"}
											</>
										) : row.realRks != null ? (
											fmtRks(row.realRks)
										) : (
											"—"
										)}
									</p>
									<p className="sim-after" data-kind={after.kind}>
										<span className="manual-label">{t.after} </span>
										{after.text}
									</p>
									<div className="manual-cell manual-remove">
										{edit ? (
											<button
												type="button"
												className="btn btn-quiet btn-icon"
												data-row={row.rowKey}
												data-field="remove"
												aria-label={(row.extra
													? t.removeRow
													: t.clearRow
												).replaceAll("{chart}", title)}
												onClick={() => dropEdit(row)}
											>
												{row.extra ? (
													<Trash size={18} aria-hidden />
												) : (
													<X size={18} aria-hidden />
												)}
											</button>
										) : null}
									</div>
								</li>
							);
						})}
					</ul>

					{restShown < rest.length ? (
						<button
							type="button"
							className="btn btn-ghost btn-sm sim-more"
							onClick={() => setRestShown((n) => n + REST_STEP)}
						>
							{t.moreCharts
								.replaceAll(
									"{n}",
									String(Math.min(REST_STEP, rest.length - restShown)),
								)
								.replaceAll("{shown}", String(restShown))
								.replaceAll("{total}", String(rest.length))}
						</button>
					) : null}

					<div className="manual-actions">
						{confirmReset === true ? (
							<fieldset
								className="manual-confirm"
								onKeyDown={(e) => {
									if (e.key === "Escape") setConfirmReset("back");
								}}
							>
								<legend>{t.resetConfirm}</legend>
								<div className="manual-confirm-actions">
									<button
										type="button"
										className="btn btn-danger"
										onClick={reset}
									>
										{t.reset}
									</button>
									<button
										ref={keepRef}
										type="button"
										className="btn btn-ghost"
										onClick={() => setConfirmReset("back")}
									>
										{m.bind.unbindNo}
									</button>
								</div>
							</fieldset>
						) : (
							<button
								ref={resetRef}
								type="button"
								className="btn btn-ghost manual-clear"
								aria-disabled={edits.length ? undefined : true}
								onClick={() => {
									if (edits.length) setConfirmReset(true);
								}}
							>
								<ArrowCounterClockwise size={16} aria-hidden />
								{t.reset}
							</button>
						)}
					</div>
				</>
			) : (
				<div className="manual-loading" aria-busy="true">
					<p className="sr-only">{t.loading}</p>
					{[0, 1, 2].map((i) => (
						<div key={i} className="manual-skeleton" aria-hidden="true">
							<span />
							<span />
							<span />
						</div>
					))}
				</div>
			)}
		</>
	);
}

function P3Panel({
	phi,
	nameOf,
}: {
	phi: SimSlot[];
	nameOf: (id: string) => string;
}) {
	const { m } = useI18n();
	const t = m.simulate;
	const titleId = useId();
	return (
		<section className="sim-p3" aria-labelledby={titleId}>
			<h3 id={titleId}>{t.p3Title}</h3>
			{phi.length ? (
				<ol>
					{phi.map((s) => {
						const mark = !s.was
							? t.isNew
							: s.was === s.slot
								? ""
								: slotNumber(s.was) > slotNumber(s.slot)
									? t.movedUp.replaceAll("{from}", s.was)
									: t.movedDown.replaceAll("{from}", s.was);
						return (
							<li key={s.slot} data-new={!s.was || undefined}>
								<span className="sim-slot">{s.slot}</span>
								<span className="manual-song-title">{nameOf(s.id)}</span>
								<span className={`chart-level chart-level-${s.rank}`}>
									<span>{s.rank}</span>
									<span>{s.difficulty.toFixed(1)}</span>
								</span>
								<span className="sim-p3-rks">{fmtRks(s.rks)}</span>
								{mark ? <span className="sim-p3-mark">{mark}</span> : null}
							</li>
						);
					})}
				</ol>
			) : (
				<p className="field-hint">{t.p3None}</p>
			)}
		</section>
	);
}
