"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
	ChartSearch,
	type ChartSearchText,
	useChartCatalog,
} from "@/components/ChartSearch";
import { Announce } from "@/components/Tool";
import type { Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";
import {
	type ChartLevel,
	type ChartRef,
	type ChartSummary,
	findChart,
} from "@/lib/chart-catalog";
import {
	MAX_NOTES,
	MAX_SCORE,
	planScore,
	type ScoreMode,
	type ScorePlan,
} from "@/phi/lib/score-control";

export type ScoreControlInitial = {
	notes?: string;
	target?: string;
	mode?: string;
	chart?: string;
};

function parseChartRef(raw: string | undefined): ChartRef | undefined {
	if (!raw) return;
	const i = raw.lastIndexOf(":");
	if (i <= 0) return;
	const rank = raw.slice(i + 1);
	if (rank !== "EZ" && rank !== "HD" && rank !== "IN" && rank !== "AT") return;
	return { id: raw.slice(0, i), rank };
}

function digits(raw: string | undefined, max: number) {
	const s = (raw ?? "").replace(/[^\d]/g, "").slice(0, String(max).length);
	return s;
}

function isNonEmpty<T>(list: T[]): list is [T, ...T[]] {
	return list.length > 0;
}

function asMode(raw: string | undefined): ScoreMode {
	return raw === "challenge" ? "challenge" : "normal";
}

export function chartSearchText(m: Messages): ChartSearchText {
	const t = m.chartSearch;
	return {
		label: t.label,
		viaAlias: t.viaAlias,
		noResults: t.noResults,
		results: (n) =>
			n === 1 ? t.resultsOne : t.results.replaceAll("{n}", String(n)),
	};
}

function useSettled(text: string, ms = 700) {
	const [settled, setSettled] = useState("");
	useEffect(() => {
		const id = window.setTimeout(() => setSettled(text), ms);
		return () => window.clearTimeout(id);
	}, [text, ms]);
	return settled;
}

type RankState =
	| { status: "idle" | "loading" | "none" | "busy" }
	| { status: "ok"; rank: number; of: number; percent: number; tied: number };

function useChartRank(chart: ChartRef | undefined, acc: number | undefined) {
	const [state, setState] = useState<RankState>({ status: "idle" });
	const [attempt, setAttempt] = useState(0);
	const url =
		chart && acc != null
			? `/api/leaderboard?${new URLSearchParams({
					chart: chart.id,
					level: chart.rank,
					acc: acc.toFixed(6),
				})}`
			: undefined;
	const request = url ? `${url}#${attempt}` : undefined;

	useEffect(() => {
		if (!request) {
			setState({ status: "idle" });
			return;
		}
		setState({ status: "loading" });
		const ac = new AbortController();
		const timer = window.setTimeout(() => {
			fetch(request, { signal: ac.signal })
				.then(async (res) => {
					if (res.status === 404) return setState({ status: "none" });
					if (!res.ok) return setState({ status: "busy" });
					const body = (await res.json()) as Partial<{
						rank: number;
						of: number;
						percent: number;
						tied: number;
					}>;
					if (
						typeof body.rank !== "number" ||
						typeof body.of !== "number" ||
						typeof body.percent !== "number"
					) {
						return setState({ status: "busy" });
					}
					setState({
						status: "ok",
						rank: body.rank,
						of: body.of,
						percent: body.percent,
						tied: body.tied ?? 0,
					});
				})
				.catch(() => {
					if (!ac.signal.aborted) setState({ status: "busy" });
				});
		}, 600);
		return () => {
			window.clearTimeout(timer);
			ac.abort();
		};
	}, [request]);

	return [state, () => setAttempt((n) => n + 1)] as const;
}

export function ScoreControl({ initial }: { initial: ScoreControlInitial }) {
	const { m } = useI18n();
	const t = m.score;
	const catalog = useChartCatalog();
	const ids = useId();
	const chartLabelId = `${ids}-chart`;
	const modeLabelId = `${ids}-mode`;
	const notesHintId = `${ids}-notes-hint`;
	const notesErrorId = `${ids}-notes-error`;
	const targetErrorId = `${ids}-target-error`;
	const modeHintId = `${ids}-mode-hint`;
	const chartBox = useRef<HTMLDivElement>(null);
	const targetRef = useRef<HTMLInputElement>(null);
	const [notes, setNotes] = useState(digits(initial.notes, MAX_NOTES));
	const [target, setTarget] = useState(digits(initial.target, MAX_SCORE));
	const [mode, setMode] = useState<ScoreMode>(asMode(initial.mode));
	const [chart, setChart] = useState<ChartRef | undefined>(
		parseChartRef(initial.chart),
	);

	const picked =
		chart && catalog.status === "ready"
			? findChart(catalog.list, chart)
			: undefined;

	useEffect(() => {
		if (picked?.notes != null && !notes) setNotes(String(picked.notes));
	}, [picked, notes]);

	const stale = Boolean(chart) && catalog.status === "ready" && !picked;
	useEffect(() => {
		if (stale) setChart(undefined);
	}, [stale]);

	useEffect(() => {
		const url = new URL(window.location.href);
		const set = (k: string, v: string | undefined) => {
			if (v) url.searchParams.set(k, v);
			else url.searchParams.delete(k);
		};
		set("n", notes);
		set("s", target);
		set("mode", mode === "challenge" ? mode : undefined);
		set("chart", chart ? `${chart.id}:${chart.rank}` : undefined);
		window.history.replaceState(null, "", `${url.pathname}${url.search}`);
	}, [notes, target, mode, chart]);

	const total = Number(notes);
	const score = Number(target);
	const notesBad = notes !== "" && (total < 1 || total > MAX_NOTES);
	const targetBad = target !== "" && score > MAX_SCORE;
	const ready = notes !== "" && target !== "" && !notesBad && !targetBad;
	const result = useMemo(
		() => (ready ? planScore(total, score, mode) : undefined),
		[ready, total, score, mode],
	);
	const best = result?.plans[0];
	const none = t.none
		.replaceAll("{notes}", String(total))
		.replaceAll("{score}", String(score));

	const outcome = !result
		? ""
		: best
			? t.announce
					.replaceAll("{perfect}", String(best.perfect))
					.replaceAll("{good}", String(best.good))
					.replaceAll("{badMiss}", String(best.badMiss))
					.replaceAll("{exact}", best.exact.toFixed(2))
			: none;
	const said = useSettled(
		notesBad ? t.notesRange : targetBad ? t.targetRange : outcome,
	);

	function pick(song: ChartSummary, rank: ChartLevel) {
		const cell = song.charts[rank];
		setChart({ id: song.id, rank });
		if (cell?.[1] != null) setNotes(String(cell[1]));
	}

	function clearChart() {
		setChart(undefined);
		chartBox.current?.querySelector<HTMLInputElement>("input")?.focus();
	}

	return (
		<>
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<section className="callout score-form">
				<div className="score-chart" ref={chartBox}>
					<span className="field-label" id={chartLabelId}>
						{t.chart}
					</span>
					<ChartSearch
						catalog={catalog}
						placeholder={t.searchPlaceholder}
						onPick={pick}
						labelledBy={chartLabelId}
						text={chartSearchText(m)}
					/>
					{catalog.status === "failed" ? (
						<p className="field-hint score-warn">{t.chartsFailedHint}</p>
					) : null}
					{picked && chart ? (
						<div className="score-picked">
							<span className={`chart-level chart-level-${chart.rank}`}>
								<span>{chart.rank}</span>
								<span>{picked.difficulty.toFixed(1)}</span>
							</span>
							<span className="score-picked-song">
								<span className="score-picked-title">{picked.song.song}</span>
								<span className="score-picked-meta">
									<span className="score-picked-parts">
										<span>{picked.song.composer}</span>
										{picked.notes != null ? (
											<span className="score-picked-notes">{`${picked.notes} ${t.notesShort}`}</span>
										) : null}
									</span>
								</span>
							</span>
							<button
								type="button"
								className="btn btn-quiet btn-icon"
								onClick={clearChart}
								aria-label={t.clearChart}
								title={t.clearChart}
							>
								<X size={18} weight="bold" aria-hidden />
							</button>
						</div>
					) : null}
				</div>
				<div className="score-inputs">
					<div className="field field-col">
						<label className="field-label" htmlFor={`${ids}-notes`}>
							{t.notes}
						</label>
						<input
							id={`${ids}-notes`}
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							autoComplete="off"
							value={notes}
							placeholder="1234"
							aria-invalid={notesBad || undefined}
							aria-describedby={
								notesBad ? `${notesErrorId} ${notesHintId}` : notesHintId
							}
							onChange={(e) => {
								setNotes(digits(e.target.value, MAX_NOTES));
								setChart(undefined);
							}}
						/>
						{notesBad ? (
							<span className="field-error" id={notesErrorId}>
								{t.notesRange}
							</span>
						) : null}
						<span className="field-hint" id={notesHintId}>
							{t.notesHint}
						</span>
					</div>
					<div className="field field-col">
						<label className="field-label" htmlFor={`${ids}-target`}>
							{t.target}
						</label>
						<input
							ref={targetRef}
							id={`${ids}-target`}
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							autoComplete="off"
							value={target}
							placeholder="999999"
							aria-invalid={targetBad || undefined}
							aria-describedby={targetBad ? targetErrorId : undefined}
							onChange={(e) => setTarget(digits(e.target.value, MAX_SCORE))}
						/>
						{targetBad ? (
							<span className="field-error" id={targetErrorId}>
								{t.targetRange}
							</span>
						) : null}
					</div>
					<div className="field field-col">
						<span className="field-label" id={modeLabelId}>
							{t.mode}
						</span>
						<fieldset
							className="seg"
							aria-labelledby={modeLabelId}
							aria-describedby={mode === "challenge" ? modeHintId : undefined}
						>
							<button
								type="button"
								aria-pressed={mode === "normal"}
								onClick={() => setMode("normal")}
							>
								{t.modeNormal}
							</button>
							<button
								type="button"
								aria-pressed={mode === "challenge"}
								onClick={() => setMode("challenge")}
							>
								{t.modeChallenge}
							</button>
						</fieldset>
						{mode === "challenge" ? (
							<span className="field-hint" id={modeHintId}>
								{t.challengeHint}
							</span>
						) : null}
					</div>
				</div>
			</section>

			<Announce>{said}</Announce>

			{result ? (
				isNonEmpty(result.plans) ? (
					<PlanResult
						plans={result.plans}
						mode={mode}
						chart={picked ? chart : undefined}
					/>
				) : (
					<section className="callout score-none">
						<p>{none}</p>
						{result.nearest ? (
							<div className="score-nearest">
								<span className="meta-label">{t.nearest}</span>
								{[result.nearest.below, result.nearest.above]
									.filter((n): n is number => n != null)
									.map((n) => (
										<button
											key={n}
											type="button"
											className="btn btn-ghost"
											onClick={() => {
												setTarget(String(n));
												targetRef.current?.focus();
											}}
										>
											{t.useScore.replaceAll("{score}", String(n))}
										</button>
									))}
							</div>
						) : null}
					</section>
				)
			) : null}
		</>
	);
}

function fmtAcc(acc: number) {
	return `${acc.toFixed(6).replace(/\.?0+$/, "")}%`;
}

function fmtDelta(plan: ScorePlan) {
	const sign = plan.delta > 0 ? "+" : plan.delta < 0 ? "−" : "±";
	return `${sign}${Math.abs(plan.delta).toFixed(2)}`;
}

function fmtExact(plan: ScorePlan) {
	return `${plan.exact.toFixed(2)} (${fmtDelta(plan)})`;
}

function fmtPercent(p: number) {
	const v = Math.min(100, Math.max(0.01, p));
	return v < 1 ? v.toFixed(2) : v.toFixed(1);
}

function PlanResult({
	plans,
	mode,
	chart,
}: {
	plans: [ScorePlan, ...ScorePlan[]];
	mode: ScoreMode;
	chart: ChartRef | undefined;
}) {
	const { m } = useI18n();
	const t = m.score;
	const ids = useId();
	const planId = `${ids}-plan`;
	const splitsId = `${ids}-splits`;
	const best = plans[0];
	const cells: [string, string][] = [
		[t.perfect, String(best.perfect)],
		[t.good, String(best.good)],
		[t.badMiss, String(best.badMiss)],
		...(mode === "normal"
			? ([[t.maxCombo, String(best.maxCombo)]] as [string, string][])
			: []),
		[t.acc, fmtAcc(best.acc)],
	];
	return (
		<section className="score-result" aria-labelledby={planId}>
			<h2 id={planId}>{t.plan}</h2>
			<dl className="plan-grid">
				{cells.map(([label, value]) => (
					<div key={label}>
						<dt>{label}</dt>
						<dd>{value}</dd>
					</div>
				))}
				<div>
					<dt>{t.exactScore}</dt>
					<dd>
						{best.exact.toFixed(2)}{" "}
						<span className="plan-delta">({fmtDelta(best)})</span>
					</dd>
				</div>
			</dl>
			{chart ? <ChartRank chart={chart} acc={best.acc} /> : null}
			<p className="field-hint">{t.noteAccuracy}</p>
			<p className="field-hint">{t.roundingHint}</p>
			<h2 id={splitsId}>
				{t.allSplits.replaceAll("{n}", String(plans.length))}
			</h2>
			<p className="field-hint">{t.tip}</p>
			<section
				className="plan-table-wrap"
				aria-labelledby={splitsId}
				// biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling region must be reachable by keyboard
				tabIndex={0}
			>
				<table className="plan-table">
					<thead>
						<tr>
							<th scope="col">{t.perfect}</th>
							<th scope="col">{t.good}</th>
							<th scope="col">{t.badMiss}</th>
							{mode === "normal" ? <th scope="col">{t.maxCombo}</th> : null}
							<th scope="col">{t.acc}</th>
							<th scope="col">{t.exactScore}</th>
						</tr>
					</thead>
					<tbody>
						{plans.map((p) => (
							<tr key={`${p.perfect}-${p.good}-${p.maxCombo}`}>
								<td>{p.perfect}</td>
								<td>{p.good}</td>
								<td>{p.badMiss}</td>
								{mode === "normal" ? <td>{p.maxCombo}</td> : null}
								<td>{fmtAcc(p.acc)}</td>
								<td>{fmtExact(p)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</section>
		</section>
	);
}

function ChartRank({ chart, acc }: { chart: ChartRef; acc: number }) {
	const { m, locale } = useI18n();
	const t = m.score;
	const [rank, retry] = useChartRank(chart, acc);
	const box = useRef<HTMLDivElement>(null);
	const num = (n: number) => n.toLocaleString(locale === "zh" ? "zh-CN" : "en");
	const result =
		rank.status === "ok"
			? t.rankResult
					.replaceAll("{rank}", num(rank.rank))
					.replaceAll("{of}", num(rank.of))
					.replaceAll("{percent}", fmtPercent(rank.percent))
			: "";
	const said =
		rank.status === "ok"
			? `${t.rankTitle}: ${result}`
			: rank.status === "none"
				? t.rankNoData
				: rank.status === "busy"
					? t.rankBusy
					: "";
	return (
		<>
			<Announce>{said}</Announce>
			{rank.status === "idle" ? null : (
				<div
					className="score-rank"
					ref={box}
					tabIndex={-1}
					aria-busy={rank.status === "loading"}
				>
					<span className="meta-label">{t.rankTitle}</span>
					{rank.status === "ok" ? (
						<p className="score-rank-value">
							{result}
							{rank.tied > 0 ? (
								<span className="score-rank-tied">
									{" · "}
									{t.rankTied.replaceAll("{n}", num(rank.tied))}
								</span>
							) : null}
						</p>
					) : rank.status === "loading" ? (
						<p className="score-rank-note">{t.rankLoading}</p>
					) : rank.status === "none" ? (
						<p className="score-rank-note">{t.rankNoData}</p>
					) : (
						<p className="score-rank-note">
							{t.rankBusy}{" "}
							<button
								type="button"
								className="btn btn-ghost btn-sm"
								onClick={() => {
									retry();
									box.current?.focus();
								}}
							>
								{m.error.retry}
							</button>
						</p>
					)}
					{rank.status === "ok" ? (
						<p className="field-hint">{t.rankHint}</p>
					) : null}
				</div>
			)}
		</>
	);
}
