"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "@/components/LocaleLink";
import { SegRadio } from "@/components/SegRadio";
import { Announce } from "@/components/Tool";
import { localeTag } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import {
	type BoardCurve,
	boardRank,
	curveLow,
	curvePoints,
	milestones,
} from "@/lib/rank-curve";
import { fill } from "@/phi/lib/card-i18n";

type Loaded =
	| { state: "loading"; tries: number }
	| { state: "failed" }
	| { state: "ok"; board: BoardCurve };

const W = 640;
const H = 240;
const PAD = { l: 52, r: 16, t: 14, b: 30 };
const TRIES = 9;

function useBoard(
	id: string,
	level: string,
	on: boolean,
): { loaded: Loaded | undefined; retry: () => void } {
	const [loaded, setLoaded] = useState<Record<string, Loaded>>({});
	const now = loaded[level];
	const settled = now?.state === "ok" || now?.state === "failed";
	const tries = now?.state === "loading" ? now.tries : 0;
	useEffect(() => {
		if (!on || settled) return;
		const ac = new AbortController();
		let timer: number | undefined;
		const set = (v: Loaded) => setLoaded((prev) => ({ ...prev, [level]: v }));
		fetch(`/api/chart-board?${new URLSearchParams({ chart: id, level })}`, {
			signal: ac.signal,
		})
			.then(async (res) => {
				if (res.status === 202 && tries + 1 < TRIES) {
					const wait = Number(res.headers.get("Retry-After")) || 10;
					timer = window.setTimeout(
						() => set({ state: "loading", tries: tries + 1 }),
						wait * 1000,
					);
					return;
				}
				if (!res.ok) throw new Error(String(res.status));
				const body = (await res.json()) as BoardCurve;
				if (!Array.isArray(body.q)) throw new Error("shape");
				set({ state: "ok", board: body });
			})
			.catch(() => {
				if (!ac.signal.aborted) set({ state: "failed" });
			});
		return () => {
			ac.abort();
			window.clearTimeout(timer);
		};
	}, [id, level, on, settled, tries]);
	return {
		loaded: now ?? (on ? { state: "loading", tries: 0 } : undefined),
		retry: () =>
			setLoaded((prev) => {
				const next = { ...prev };
				delete next[level];
				return next;
			}),
	};
}

function Curve({ board, mine }: { board: BoardCurve; mine?: number }) {
	const { m, locale } = useI18n();
	const t = m.rankCurve;
	const lo = curveLow(board);
	const points = curvePoints(board, lo);
	const minTop = Math.max(0.01, 100 / (board.n + 1));
	const y0 = Math.log10(minTop);
	const x = (acc: number) =>
		PAD.l + ((acc - lo) / (100 - lo)) * (W - PAD.l - PAD.r);
	const y = (top: number) =>
		PAD.t +
		((Math.log10(Math.max(minTop, top)) - y0) / (2 - y0 || 1)) *
			(H - PAD.t - PAD.b);
	const path = points
		.map(
			([acc, top], i) =>
				`${i ? "L" : "M"}${x(acc).toFixed(1)} ${y(top).toFixed(1)}`,
		)
		.join(" ");
	const yTicks = [0.1, 1, 10, 100].filter((v) => v >= minTop);
	const xTicks: number[] = [];
	const xStep = 100 - lo > 8 ? 2 : 100 - lo > 3 ? 1 : 0.5;
	for (let v = Math.ceil(lo / xStep) * xStep; v <= 100; v += xStep)
		xTicks.push(v);
	const you = mine != null ? boardRank(board, mine) : null;
	const label = fill(t.chartLabel, {
		n: board.n.toLocaleString(localeTag(locale)),
		lo: lo.toFixed(1),
	});
	return (
		<div className="trend-chart rc-chart">
			<svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label}>
				<g className="trend-grid">
					{yTicks.map((v) => (
						<g key={`y${v}`}>
							<line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
							<text x={PAD.l - 6} y={y(v) + 4} textAnchor="end">
								{fill(t.topTick, { p: v })}
							</text>
						</g>
					))}
				</g>
				<g className="trend-axis">
					{xTicks.map((v) => (
						<text key={`x${v}`} x={x(v)} y={H - 10} textAnchor="middle">
							{`${v}%`}
						</text>
					))}
				</g>
				<path className="trend-line" d={path} />
				{you && mine != null && mine >= lo ? (
					<g className="rc-you">
						<circle cx={x(Math.min(100, mine))} cy={y(you.top)} r={5} />
					</g>
				) : null}
			</svg>
		</div>
	);
}

export function RankCurve({
	id,
	levels,
	top,
	mine,
	signIn,
}: {
	id: string;
	levels: string[];
	top: string;
	mine: Record<string, number>;
	signIn?: string;
}) {
	const { m, locale } = useI18n();
	const t = m.rankCurve;
	const ids = useId();
	const [level, setLevel] = useState(
		levels.includes(top) ? top : (levels[0] ?? "IN"),
	);
	const [on, setOn] = useState(false);
	const head = useRef<HTMLHeadingElement>(null);
	const { loaded, retry } = useBoard(id, level, on);
	const acc = mine[level];
	const board = loaded?.state === "ok" ? loaded.board : undefined;
	const now = board && acc != null ? boardRank(board, acc) : null;
	const status =
		loaded?.state === "loading"
			? loaded.tries
				? t.gathering
				: t.loading
			: loaded?.state === "failed"
				? t.failed
				: "";

	return (
		<section className="song-section" aria-labelledby={`${ids}-h`}>
			<h2 id={`${ids}-h`} ref={head} tabIndex={-1} className="rc-head">
				{t.title}
			</h2>
			<p className="field-hint">{t.lede}</p>
			{levels.length > 1 && !signIn ? (
				<SegRadio
					className="song-level-pick"
					legend={t.level}
					value={level}
					options={levels.map((value) => ({ value, label: value }))}
					onChange={setLevel}
				/>
			) : null}
			{signIn ? (
				<p className="callout">
					{t.signedOut}{" "}
					<Link href={signIn} prefetch={false}>
						{m.songPage.signIn}
					</Link>
				</p>
			) : !on ? (
				<button
					type="button"
					className="btn btn-ghost"
					onClick={() => {
						setOn(true);
						requestAnimationFrame(() => head.current?.focus());
					}}
				>
					{t.load}
				</button>
			) : null}
			<Announce>{status}</Announce>
			{loaded?.state === "failed" ? (
				<p className="callout">
					{status}{" "}
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						onClick={retry}
					>
						{t.retry}
					</button>
				</p>
			) : status ? (
				<p className="muted">{status}</p>
			) : null}
			{board && !board.n ? <p className="callout">{t.none}</p> : null}
			{board?.n ? (
				<>
					<p className="rc-sum">
						{fill(t.summary, {
							n: board.n.toLocaleString(localeTag(locale)),
							ap: board.ap.toLocaleString(localeTag(locale)),
							fc: board.fc.toLocaleString(localeTag(locale)),
						})}
					</p>
					<Curve board={board} mine={acc} />
					<div className="data-scroll">
						<table className="data-table rc-table">
							<thead>
								<tr>
									<th scope="col" className="num">
										{t.acc}
									</th>
									<th scope="col" className="num">
										{t.rank}
									</th>
									<th scope="col" className="num">
										{t.top}
									</th>
									{now ? (
										<th scope="col" className="num">
											{t.gain}
										</th>
									) : null}
								</tr>
							</thead>
							<tbody>
								{milestones(acc ?? null).map((a) => {
									const r = boardRank(board, a);
									if (!r) return null;
									const current = acc != null && a === acc;
									return (
										<tr key={a} data-current={current || undefined}>
											<th scope="row" className="num">
												{a >= 100 ? t.ap : `${a.toFixed(2)}%`}
												{current ? (
													<span className="rc-you-tag">{t.you}</span>
												) : null}
											</th>
											<td className="num">
												{a >= 100
													? fill(t.tied, {
															n: r.tied.toLocaleString(localeTag(locale)),
														})
													: fill(t.about, {
															rank: r.rank.toLocaleString(localeTag(locale)),
														})}
											</td>
											<td className="num">
												{r.top < 0.01
													? "< 0.01"
													: r.top < 1
														? r.top.toFixed(2)
														: r.top.toFixed(1)}
												%
											</td>
											{now ? (
												<td className="num">
													{current
														? "—"
														: now.rank > r.rank
															? fill(t.places, {
																	n: (now.rank - r.rank).toLocaleString(
																		localeTag(locale),
																	),
																})
															: "—"}
												</td>
											) : null}
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
					<p className="field-hint">
						{fill(t.source, {
							date: new Date(board.at).toLocaleString(localeTag(locale), {
								dateStyle: "medium",
								timeStyle: "short",
							}),
						})}
					</p>
				</>
			) : null}
		</section>
	);
}
