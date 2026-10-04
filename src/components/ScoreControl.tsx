"use client";

import { useEffect, useMemo, useState } from "react";
import { ChartSearch, useChartCatalog } from "@/components/ChartSearch";
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

export function ScoreControl({ initial }: { initial: ScoreControlInitial }) {
	const { m } = useI18n();
	const t = m.score;
	const catalog = useChartCatalog();
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

	// A chart restored from the URL fills the note count once the catalog is here.
	useEffect(() => {
		if (picked?.notes != null && !notes) setNotes(String(picked.notes));
	}, [picked, notes]);

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
	const ready = notes !== "" && target !== "";
	const result = useMemo(
		() => (ready ? planScore(total, score, mode) : undefined),
		[ready, total, score, mode],
	);

	function pick(song: ChartSummary, rank: ChartLevel) {
		const cell = song.charts[rank];
		setChart({ id: song.id, rank });
		if (cell?.[1] != null) setNotes(String(cell[1]));
	}

	return (
		<>
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<section className="callout score-form">
				<div className="score-chart">
					<span className="meta-label">{t.chart}</span>
					<ChartSearch
						catalog={catalog}
						placeholder={t.searchPlaceholder}
						onPick={pick}
					/>
					{picked && chart ? (
						<p className="score-picked">
							<span className={`chart-level chart-level-${chart?.rank}`}>
								<span>{chart?.rank}</span>
								<span>{picked.difficulty.toFixed(1)}</span>
							</span>
							<span className="score-picked-title">{picked.song.song}</span>
							<button
								type="button"
								className="btn btn-ghost btn-mini"
								onClick={() => setChart(undefined)}
								aria-label={t.clearChart}
							>
								×
							</button>
						</p>
					) : null}
				</div>
				<div className="score-inputs">
					<label className="field field-col">
						<span>{t.notes}</span>
						<input
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							value={notes}
							placeholder="1234"
							onChange={(e) => {
								setNotes(digits(e.target.value, MAX_NOTES));
								setChart(undefined);
							}}
						/>
					</label>
					<label className="field field-col">
						<span>{t.target}</span>
						<input
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							value={target}
							placeholder="999999"
							onChange={(e) => setTarget(digits(e.target.value, MAX_SCORE))}
						/>
					</label>
					<div className="field field-col">
						<span>{t.mode}</span>
						<fieldset className="seg" aria-label={t.mode}>
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
					</div>
				</div>
				<p className="field-hint">
					{mode === "challenge" ? t.challengeHint : t.notesHint}
				</p>
				<p className="field-hint">{t.noteAccuracy}</p>
			</section>

			{result ? (
				isNonEmpty(result.plans) ? (
					<PlanResult plans={result.plans} mode={mode} />
				) : (
					<section className="callout score-none" role="status">
						<p>{t.none.replaceAll("{score}", String(score))}</p>
						{result.nearest ? (
							<p className="score-nearest">
								<span className="meta-label">{t.nearest}</span>
								{[result.nearest.below, result.nearest.above]
									.filter((n): n is number => n != null)
									.map((n) => (
										<button
											key={n}
											type="button"
											className="btn btn-ghost"
											onClick={() => setTarget(String(n))}
										>
											{t.useScore.replaceAll("{score}", String(n))}
										</button>
									))}
							</p>
						) : null}
					</section>
				)
			) : null}
		</>
	);
}

/** Full-precision accuracy: the game only shows two decimals, the save keeps more. */
function fmtAcc(acc: number) {
	return `${acc.toFixed(6).replace(/\.?0+$/, "")}%`;
}

function fmtExact(plan: ScorePlan) {
	const sign = plan.delta > 0 ? "+" : plan.delta < 0 ? "−" : "±";
	return `${plan.exact.toFixed(2)} (${sign}${Math.abs(plan.delta).toFixed(2)})`;
}

function PlanResult({
	plans,
	mode,
}: {
	plans: [ScorePlan, ...ScorePlan[]];
	mode: ScoreMode;
}) {
	const { m } = useI18n();
	const t = m.score;
	const best = plans[0];
	const cells: [string, string][] = [
		[t.perfect, String(best.perfect)],
		[t.good, String(best.good)],
		[t.badMiss, String(best.badMiss)],
		...(mode === "normal"
			? ([[t.maxCombo, String(best.maxCombo)]] as [string, string][])
			: []),
		[t.acc, fmtAcc(best.acc)],
		[t.exactScore, fmtExact(best)],
	];
	return (
		<section className="score-result">
			<h2>{t.plan}</h2>
			<dl className="plan-grid">
				{cells.map(([label, value]) => (
					<div key={label}>
						<dt>{label}</dt>
						<dd>{value}</dd>
					</div>
				))}
			</dl>
			<p className="field-hint">{t.roundingHint}</p>
			<h2>{t.allSplits.replaceAll("{n}", String(plans.length))}</h2>
			<p className="field-hint">{t.tip}</p>
			<div className="plan-table-wrap">
				<table className="plan-table">
					<thead>
						<tr>
							<th>{t.perfect}</th>
							<th>{t.good}</th>
							<th>{t.badMiss}</th>
							{mode === "normal" ? <th>{t.maxCombo}</th> : null}
							<th>{t.acc}</th>
							<th>{t.exactScore}</th>
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
			</div>
		</section>
	);
}
