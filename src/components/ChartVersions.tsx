"use client";

import {
	type KeyboardEvent,
	type PointerEvent,
	useEffect,
	useId,
	useMemo,
	useState,
} from "react";
import { Announce } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";
import { CHART_LEVELS } from "@/lib/chart-catalog";
import {
	type ChartStats,
	diffStats,
	formatDuration,
	type NoteKinds,
} from "@/lib/chart-stats";
import { fill } from "@/phi/lib/card-i18n";
import type { SongLevelView, SongPageView } from "@/server/song-page";

type Era = NonNullable<SongPageView["history"]>["eras"][number];
type Option = { ver: string; label: string };
type Loaded =
	| { state: "loading" }
	| { state: "failed" }
	| { state: "ok"; stats: ChartStats };

const KINDS: (keyof NoteKinds)[] = ["tap", "drag", "hold", "flick"];
const CURRENT = "current";
const STRIP_H = 44;
const BAR_W = 4;

function shownVersion(version: string): string {
	return version.replace(/-(\d+)$/, " ($1)");
}

function versionSpan(versions: string[]): string {
	const first = shownVersion(versions[0] ?? "");
	const last = shownVersion(versions.at(-1) ?? "") || first;
	return first === last ? first : `${first} – ${last}`;
}

function signed(n: number): string {
	if (!n) return "0";
	return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

function optionsFor(
	rank: string,
	eras: Era[],
	current: string[],
	currentLabel: string,
): Option[] {
	const out: Option[] = [];
	for (const era of eras) {
		const chart = era.charts[rank];
		if (!chart?.rev) continue;
		out.push({ ver: chart.rev, label: versionSpan(era.versions) });
	}
	out.push({
		ver: CURRENT,
		label: current.length
			? `${currentLabel} (${versionSpan(current)})`
			: currentLabel,
	});
	return out;
}

function useStats(id: string, level: string, ver: string): Loaded {
	const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
	useEffect(() => {
		const ac = new AbortController();
		fetch(`/api/chart-stats?${new URLSearchParams({ id, level, ver })}`, {
			signal: ac.signal,
		})
			.then(async (res) => {
				if (!res.ok) throw new Error(String(res.status));
				setLoaded({ state: "ok", stats: (await res.json()) as ChartStats });
			})
			.catch(() => {
				if (!ac.signal.aborted) setLoaded({ state: "failed" });
			});
		return () => ac.abort();
	}, [id, level, ver]);
	return loaded;
}

function Strip({
	values,
	seconds,
	max,
	label,
	diff,
	at,
	onAt,
}: {
	values: number[];
	seconds: number;
	max: number;
	label: string;
	diff?: boolean;
	at?: number;
	onAt: (second: number | undefined) => void;
}) {
	const w = Math.max(1, seconds) * BAR_W;
	const mid = diff ? STRIP_H / 2 : STRIP_H;
	const scale = (diff ? STRIP_H / 2 - 2 : STRIP_H - 2) / Math.max(1, max);
	const move = (e: PointerEvent<SVGSVGElement>) => {
		const box = e.currentTarget.getBoundingClientRect();
		const x = ((e.clientX - box.left) / box.width) * seconds;
		onAt(Math.min(seconds - 1, Math.max(0, Math.floor(x))));
	};
	const key = (e: KeyboardEvent<SVGSVGElement>) => {
		const cur = at ?? 0;
		const next =
			e.key === "ArrowLeft"
				? Math.max(0, cur - 1)
				: e.key === "ArrowRight"
					? Math.min(seconds - 1, cur + 1)
					: e.key === "Home"
						? 0
						: e.key === "End"
							? seconds - 1
							: undefined;
		if (next == null) return;
		e.preventDefault();
		onAt(next);
	};
	return (
		<svg
			className={diff ? "cv-strip cv-diff" : "cv-strip"}
			viewBox={`0 0 ${w} ${STRIP_H}`}
			preserveAspectRatio="none"
			role="img"
			aria-label={label}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: focusable chart, the arrow keys move the readout
			tabIndex={0}
			onPointerMove={move}
			onPointerLeave={() => onAt(undefined)}
			onFocus={() => onAt(at ?? 0)}
			onKeyDown={key}
		>
			{diff ? (
				<line className="cv-mid" x1={0} x2={w} y1={mid} y2={mid} />
			) : null}
			{values.map((v, i) => {
				if (!v) return null;
				const h = Math.max(1.5, Math.abs(v) * scale);
				return (
					<rect
						// biome-ignore lint/suspicious/noArrayIndexKey: one bar per second, the index is the second
						key={i}
						x={i * BAR_W + 0.5}
						width={BAR_W - 1}
						y={v > 0 ? mid - h : mid}
						height={h}
						rx={1}
						data-sign={diff ? (v > 0 ? "up" : "down") : undefined}
					/>
				);
			})}
			{at != null ? (
				<rect
					className="cv-at"
					x={at * BAR_W}
					width={BAR_W}
					y={0}
					height={STRIP_H}
				/>
			) : null}
		</svg>
	);
}

function Compare({
	id,
	rank,
	from,
	to,
	labels,
}: {
	id: string;
	rank: string;
	from: string;
	to: string;
	labels: Record<string, string>;
}) {
	const { m } = useI18n();
	const t = m.chartVersions;
	const a = useStats(id, rank, from);
	const b = useStats(id, rank, to);
	const [at, setAt] = useState<number>();

	if (a.state === "loading" || b.state === "loading") {
		return (
			<p className="field-hint" role="status">
				{t.loading}
			</p>
		);
	}
	if (a.state === "failed" || b.state === "failed") {
		return (
			<p className="callout" role="alert">
				{t.failed}
			</p>
		);
	}
	const sa = a.stats;
	const sb = b.stats;
	const diff = diffStats(sa, sb);
	const seconds = Math.max(sa.density.length, sb.density.length);
	const max = Math.max(...sa.density, ...sb.density, 1);
	const maxDiff = Math.max(...diff.density.map(Math.abs), 1);
	const fromLabel = labels[from] ?? from;
	const toLabel = labels[to] ?? to;
	const rows: { name: string; a: string; b: string; d: string }[] = [
		{
			name: t.notes,
			a: String(sa.notes),
			b: String(sb.notes),
			d: signed(diff.notes),
		},
		...KINDS.map((k) => ({
			name: t.kind[k],
			a: String(sa.kinds[k]),
			b: String(sb.kinds[k]),
			d: signed(diff.kinds[k]),
		})),
		{
			name: t.duration,
			a: formatDuration(sa.duration),
			b: formatDuration(sb.duration),
			d: diff.duration
				? `${diff.duration > 0 ? "+" : "−"}${Math.abs(diff.duration).toFixed(1)}s`
				: "0",
		},
		{
			name: t.peak,
			a: String(sa.peak),
			b: String(sb.peak),
			d: signed(sb.peak - sa.peak),
		},
		{
			name: t.lines,
			a: String(sa.lines),
			b: String(sb.lines),
			d: signed(diff.lines),
		},
		{
			name: t.bpm,
			a: sa.bpms.join(" / "),
			b: sb.bpms.join(" / "),
			d: sa.bpms.join() === sb.bpms.join() ? "=" : "≠",
		},
	];
	const readout =
		at != null
			? fill(t.readout, {
					time: formatDuration(at),
					from: sa.density[at] ?? 0,
					to: sb.density[at] ?? 0,
				})
			: "";

	return (
		<div className="cv-compare">
			<div className="data-scroll">
				<table className="data-table">
					<thead>
						<tr>
							<th scope="col">
								<span className="sr-only">{t.level}</span>
							</th>
							<th scope="col" className="num">
								{fromLabel}
							</th>
							<th scope="col" className="num">
								{toLabel}
							</th>
							<th scope="col" className="num">
								{t.change}
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((r) => (
							<tr key={r.name}>
								<th scope="row">{r.name}</th>
								<td className="num">{r.a}</td>
								<td className="num">{r.b}</td>
								<td
									className="num"
									data-changed={r.d !== "0" && r.d !== "=" ? true : undefined}
								>
									{r.d}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<h4 className="cv-h">{t.densityTitle}</h4>
			<p className="field-hint">{t.readoutHint}</p>
			<p className="cv-readout" aria-hidden="true">
				{readout || " "}
			</p>
			<div className="cv-strips">
				<p className="cv-strip-label">{fromLabel}</p>
				<Strip
					values={sa.density}
					seconds={seconds}
					max={max}
					label={fill(t.densityLabel, {
						version: fromLabel,
						duration: formatDuration(sa.duration),
					})}
					at={at}
					onAt={setAt}
				/>
				<p className="cv-strip-label">{toLabel}</p>
				<Strip
					values={sb.density}
					seconds={seconds}
					max={max}
					label={fill(t.densityLabel, {
						version: toLabel,
						duration: formatDuration(sb.duration),
					})}
					at={at}
					onAt={setAt}
				/>
				<p className="cv-strip-label">{t.diffTitle}</p>
				<Strip
					values={diff.density}
					seconds={seconds}
					max={maxDiff}
					diff
					label={fill(t.diffLabel, { from: fromLabel, to: toLabel })}
					at={at}
					onAt={setAt}
				/>
				<ul className="cv-legend">
					<li data-sign="up">{t.more}</li>
					<li data-sign="down">{t.fewer}</li>
				</ul>
			</div>
			<p className="field-hint">
				{diff.changedSeconds
					? fill(t.changed, { n: diff.changedSeconds })
					: t.same}
			</p>
			<Announce>{readout}</Announce>
		</div>
	);
}

export function ChartVersions({
	id,
	levels,
	history,
}: {
	id: string;
	levels: SongLevelView[];
	history?: SongPageView["history"];
}) {
	const { m } = useI18n();
	const t = m.chartVersions;
	const ids = useId();
	const eras = history?.eras ?? [];
	const changedLevels = useMemo(
		() =>
			CHART_LEVELS.filter((rank) =>
				eras.some((era) => Boolean(era.charts[rank]?.rev)),
			),
		[eras],
	);
	const [rank, setRank] = useState<string>(() => changedLevels.at(-1) ?? "IN");
	const options = useMemo(
		() => optionsFor(rank, eras, history?.current ?? [], t.current),
		[rank, eras, history?.current, t.current],
	);
	const [from, setFrom] = useState<string>(() => options[0]?.ver ?? CURRENT);
	const [to, setTo] = useState<string>(CURRENT);
	const labels = Object.fromEntries(options.map((o) => [o.ver, o.label]));
	const shownLevels = CHART_LEVELS.filter(
		(r) => levels.some((l) => l.rank === r) || eras.some((e) => e.charts[r]),
	);

	return (
		<section className="song-section" aria-labelledby={`${ids}-title`}>
			<h2 id={`${ids}-title`}>{t.title}</h2>
			<p className="field-hint">{t.lede}</p>
			{!eras.length || !changedLevels.length ? (
				<p className="callout">{t.none}</p>
			) : (
				<>
					<div className="data-scroll">
						<table className="data-table cv-eras">
							<thead>
								<tr>
									<th scope="col">{t.versions}</th>
									{shownLevels.map((r) => (
										<th key={r} scope="col" className="num">
											<span className={`chart-level chart-level-${r}`}>
												{r}
											</span>
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								<tr>
									<th scope="row">
										{t.current}
										{history?.current.length ? (
											<span className="muted">
												{" "}
												· {versionSpan(history.current)}
											</span>
										) : null}
									</th>
									{shownLevels.map((r) => {
										const lv = levels.find((l) => l.rank === r);
										return (
											<td key={r} className="num">
												{lv ? (
													<>
														{lv.constant.toFixed(1)}
														{lv.notes ? (
															<span className="muted"> · {lv.notes}</span>
														) : null}
													</>
												) : (
													"—"
												)}
											</td>
										);
									})}
								</tr>
								{[...eras].reverse().map((era) => (
									<tr key={era.versions.join()}>
										<th scope="row">{versionSpan(era.versions)}</th>
										{shownLevels.map((r) => {
											const c = era.charts[r];
											return (
												<td
													key={r}
													className="num"
													data-changed={c?.rev ? true : undefined}
												>
													{c ? (
														<>
															{c.label}
															{c.notes ? (
																<span className="muted"> · {c.notes}</span>
															) : null}
														</>
													) : (
														"—"
													)}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<h3 className="cv-h">{t.compareTitle}</h3>
					<div className="cv-pick">
						<label className="field field-col">
							<span className="field-label">{t.level}</span>
							<select
								className="input"
								value={rank}
								onChange={(e) => {
									const next = e.target.value;
									setRank(next);
									const opts = optionsFor(
										next,
										eras,
										history?.current ?? [],
										t.current,
									);
									setFrom(opts[0]?.ver ?? CURRENT);
									setTo(CURRENT);
								}}
							>
								{changedLevels.map((r) => (
									<option key={r} value={r}>
										{r}
									</option>
								))}
							</select>
						</label>
						<label className="field field-col">
							<span className="field-label">{t.from}</span>
							<select
								className="input"
								value={from}
								onChange={(e) => setFrom(e.target.value)}
							>
								{options.map((o) => (
									<option key={o.ver} value={o.ver}>
										{o.label}
									</option>
								))}
							</select>
						</label>
						<label className="field field-col">
							<span className="field-label">{t.to}</span>
							<select
								className="input"
								value={to}
								onChange={(e) => setTo(e.target.value)}
							>
								{options.map((o) => (
									<option key={o.ver} value={o.ver}>
										{o.label}
									</option>
								))}
							</select>
						</label>
					</div>
					<Compare
						key={`${rank}:${from}:${to}`}
						id={id}
						rank={rank}
						from={from}
						to={to}
						labels={labels}
					/>
				</>
			)}
		</section>
	);
}
