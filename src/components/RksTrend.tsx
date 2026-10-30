"use client";

import {
	type KeyboardEvent,
	type PointerEvent,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import Link from "@/components/LocaleLink";
import { SegRadio } from "@/components/SegRadio";
import { Announce } from "@/components/Tool";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { songPath } from "@/lib/song-path";
import {
	defaultRange,
	inRange,
	nearestIndex,
	signedDelta,
	TREND_RANGES,
	type TrendRange,
	timeTicks,
	valueTicks,
} from "@/lib/trend-chart";
import { fill } from "@/phi/lib/card-i18n";
import type { TrendPoint, TrendView } from "@/server/save-views";

const H = 240;
const PAD = { top: 12, right: 16, bottom: 28, left: 56 };
const STEP = 30;

function dayFormat(locale: Locale, withYear = true) {
	return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", {
		timeZone: "Asia/Shanghai",
		year: withYear ? "numeric" : undefined,
		month: "short",
		day: "numeric",
	});
}

function useWidth() {
	const ref = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	useEffect(() => {
		const node = ref.current;
		if (!node) return;
		const ro = new ResizeObserver(([entry]) => {
			if (entry) setWidth(Math.round(entry.contentRect.width));
		});
		ro.observe(node);
		return () => ro.disconnect();
	}, []);
	return { ref, width };
}

function TrendChart({
	points,
	label,
}: {
	points: TrendPoint[];
	label: string;
}) {
	const { locale, m } = useI18n();
	const { ref, width } = useWidth();
	const [at, setAt] = useState<number>();
	const fmt = useMemo(() => dayFormat(locale), [locale]);
	const tickFmt = useMemo(() => dayFormat(locale, false), [locale]);
	const w = Math.max(width, 280);
	const x0 = points[0]?.[0] ?? 0;
	const x1 = points.at(-1)?.[0] ?? x0;
	const values = points.map(([, v]) => v);
	const { min, max, ticks } = valueTicks(
		Math.min(...values),
		Math.max(...values),
	);
	const plotW = w - PAD.left - PAD.right;
	const plotH = H - PAD.top - PAD.bottom;
	const sx = (t: number) =>
		PAD.left + (x1 > x0 ? ((t - x0) / (x1 - x0)) * plotW : plotW / 2);
	const sy = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * plotH;
	const xs = points.map(([t]) => sx(t));
	const path = points
		.map(
			([t, v], i) => `${i ? "L" : "M"}${sx(t).toFixed(1)},${sy(v).toFixed(1)}`,
		)
		.join("");
	const spanYears = x1 - x0 > 300 * 86_400_000;
	const tFmt = spanYears ? fmt : tickFmt;
	const hit = at != null ? points[at] : undefined;
	const say = hit
		? `${fmt.format(hit[0])}: ${m.trend.rks} ${hit[1].toFixed(4)}`
		: "";

	const move = (e: PointerEvent<SVGSVGElement>) => {
		const box = e.currentTarget.getBoundingClientRect();
		setAt(nearestIndex(xs, ((e.clientX - box.left) / box.width) * w));
	};
	const key = (e: KeyboardEvent<SVGSVGElement>) => {
		const last = points.length - 1;
		const cur = at ?? last;
		const next =
			e.key === "ArrowLeft"
				? Math.max(0, cur - 1)
				: e.key === "ArrowRight"
					? Math.min(last, cur + 1)
					: e.key === "Home"
						? 0
						: e.key === "End"
							? last
							: undefined;
		if (next == null) return;
		e.preventDefault();
		setAt(next);
	};

	return (
		<div className="trend-chart" ref={ref}>
			{width ? (
				<svg
					width={w}
					height={H}
					viewBox={`0 0 ${w} ${H}`}
					role="img"
					aria-label={label}
					// biome-ignore lint/a11y/noNoninteractiveTabindex: focusable chart, the arrow keys move the readout
					tabIndex={0}
					onPointerMove={move}
					onPointerLeave={() => setAt(undefined)}
					onFocus={() => setAt((v) => v ?? points.length - 1)}
					onBlur={() => setAt(undefined)}
					onKeyDown={key}
				>
					<g className="trend-grid">
						{ticks.map((v) => (
							<g key={v}>
								<line x1={PAD.left} x2={w - PAD.right} y1={sy(v)} y2={sy(v)} />
								<text x={PAD.left - 8} y={sy(v)} dy="0.32em" textAnchor="end">
									{v.toFixed(2)}
								</text>
							</g>
						))}
					</g>
					<g className="trend-axis">
						{timeTicks(x0, x1, w < 480 ? 2 : 4).map((t, i, all) => (
							<text
								key={t}
								x={sx(t)}
								y={H - 8}
								textAnchor={
									i === 0 ? "start" : i === all.length - 1 ? "end" : "middle"
								}
							>
								{tFmt.format(t)}
							</text>
						))}
					</g>
					<path className="trend-line" d={path} />
					{points.length <= 40
						? points.map(([t, v]) => (
								<circle
									key={t}
									className="trend-dot"
									cx={sx(t)}
									cy={sy(v)}
									r={2.5}
								/>
							))
						: null}
					{hit ? (
						<g className="trend-focus">
							<line
								x1={sx(hit[0])}
								x2={sx(hit[0])}
								y1={PAD.top}
								y2={PAD.top + plotH}
							/>
							<circle cx={sx(hit[0])} cy={sy(hit[1])} r={5} />
						</g>
					) : null}
				</svg>
			) : (
				<div style={{ height: H }} />
			)}
			{hit ? (
				<div
					className="trend-tip"
					aria-hidden="true"
					style={{
						left: Math.min(Math.max(sx(hit[0]), 70), w - 70),
						top: Math.max(sy(hit[1]) - 52, 0),
					}}
				>
					<span className="trend-tip-date">{fmt.format(hit[0])}</span>
					<span className="trend-tip-value">{hit[1].toFixed(4)}</span>
				</div>
			) : null}
			<Announce>{say}</Announce>
		</div>
	);
}

export function RksTrend({ view }: { view: TrendView }) {
	const { locale, m } = useI18n();
	const t = m.trend;
	const ids = useId();
	const [range, setRange] = useState<TrendRange>(() =>
		defaultRange(view.points),
	);
	const [shown, setShown] = useState(STEP);
	const fmt = useMemo(() => dayFormat(locale), [locale]);
	const points = useMemo(
		() => inRange(view.points, range),
		[view.points, range],
	);
	const first = points[0];
	const last = points.at(-1);

	return (
		<>
			<h2 className="desk-section-title">{t.title}</h2>
			<p className="lede">{t.lede}</p>
			{view.points.length === 0 ? (
				<p className="callout">{t.empty}</p>
			) : view.points.length === 1 ? (
				<p className="callout">
					{t.one} {fmt.format(view.points[0]?.[0] ?? 0)}:{" "}
					{view.points[0]?.[1].toFixed(4)}
				</p>
			) : (
				<section className="trend" aria-labelledby={`${ids}-title`}>
					<h3 id={`${ids}-title`} className="sr-only">
						{t.title}
					</h3>
					<div className="trend-head">
						<SegRadio
							legend={t.range}
							value={range}
							options={TREND_RANGES.map((value) => ({
								value,
								label: t.ranges[value],
							}))}
							onChange={setRange}
						/>
						{first && last ? (
							<p className="trend-change">
								<span className="meta-value">{last[1].toFixed(4)}</span>{" "}
								<span
									className="sim-delta"
									data-gain={last[1] - first[1] > 5e-5 || undefined}
								>
									{fill(t.change, { delta: signedDelta(last[1] - first[1]) })}
								</span>
							</p>
						) : null}
					</div>
					{points.length > 1 && first && last ? (
						<TrendChart
							points={points}
							label={fill(t.chartLabel, {
								from: fmt.format(first[0]),
								to: fmt.format(last[0]),
							})}
						/>
					) : null}
					<details className="trend-table">
						<summary>{t.tableTitle}</summary>
						<div className="data-scroll">
							<table className="data-table">
								<thead>
									<tr>
										<th scope="col">{t.date}</th>
										<th scope="col" className="num">
											{t.rks}
										</th>
									</tr>
								</thead>
								<tbody>
									{[...points].reverse().map(([time, v]) => (
										<tr key={time}>
											<td>{fmt.format(time)}</td>
											<td className="num">{v.toFixed(4)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</details>
				</section>
			)}

			<section className="trend-events" aria-labelledby={`${ids}-ev`}>
				<h3 id={`${ids}-ev`} className="sim-list-title">
					{t.improvedTitle}
				</h3>
				<p className="field-hint">{t.improvedLede}</p>
				{view.events.length ? (
					<>
						<div className="data-scroll">
							<table className="data-table">
								<thead>
									<tr>
										<th scope="col">{t.date}</th>
										<th scope="col">{t.song}</th>
										<th scope="col">{t.level}</th>
										<th scope="col" className="num">
											{t.before}
										</th>
										<th scope="col" className="num">
											{t.after}
										</th>
									</tr>
								</thead>
								<tbody>
									{view.events.slice(0, shown).map((e) => (
										<tr key={`${e.id}:${e.rank}:${e.t}`}>
											<td>{fmt.format(e.t)}</td>
											<th scope="row" className="data-song">
												<Link href={songPath(e.id)} prefetch={false}>
													{view.songs[e.id] ?? e.id}
												</Link>
											</th>
											<td>
												<span className={`chart-level chart-level-${e.rank}`}>
													{e.rank}
												</span>
											</td>
											<td className="num">
												{e.before ? (
													`${e.before.acc.toFixed(2)}%`
												) : (
													<span className="muted">{t.firstPlay}</span>
												)}
											</td>
											<td className="num">
												{e.after.acc.toFixed(2)}%
												{e.after.score >= 1_000_000 ? (
													<span className="pg-badge" data-status="ap">
														AP
													</span>
												) : e.after.fc ? (
													<span className="pg-badge" data-status="fc">
														FC
													</span>
												) : null}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{view.events.length > shown ? (
							<button
								type="button"
								className="btn btn-ghost data-more"
								onClick={() => setShown((n) => n + STEP)}
							>
								{fill(t.more, {
									n: String(Math.min(STEP, view.events.length - shown)),
								})}
							</button>
						) : null}
					</>
				) : (
					<p className="callout">{t.noImproved}</p>
				)}
			</section>
		</>
	);
}
