"use client";

import { type PointerEvent, useRef, useState } from "react";
import { areaPath, linePath, nearestIndex, niceMax } from "@/lib/status-chart";
import { useWidth } from "./useWidth";

export type ChartSeries = {
	id: string;
	label: string;
	color: string;
	values: (number | null)[];
};

const PAD = { l: 48, t: 10, b: 26 };

function lastIndex(values: (number | null)[]) {
	for (let i = values.length - 1; i >= 0; i--) if (values[i] != null) return i;
	return -1;
}

export function LineChart({
	label,
	times,
	series,
	max,
	format,
	formatTime,
	height = 168,
	area = false,
	endLabels = false,
}: {
	label: string;
	times: number[];
	series: ChartSeries[];
	max?: number;
	format: (v: number) => string;
	formatTime: (t: number) => string;
	height?: number;
	area?: boolean;
	endLabels?: boolean;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const width = useWidth(ref);
	const [active, setActive] = useState<number | null>(null);
	const n = times.length;
	const padR = endLabels ? 84 : 14;
	const plotW = Math.max(0, width - PAD.l - padR);
	const plotH = height - PAD.t - PAD.b;
	const peak = Math.max(
		0,
		...series.flatMap((s) => s.values.filter((v): v is number => v != null)),
	);
	const yMax = max ?? niceMax(peak * 1.1);
	const step = n > 1 ? plotW / (n - 1) : 0;
	const x = (i: number) => PAD.l + i * step;
	const y = (v: number) => PAD.t + plotH - (Math.min(v, yMax) / yMax) * plotH;
	const base = PAD.t + plotH;
	const ticks = [0, yMax / 2, yMax];

	const ends = series.map((s) => {
		const i = lastIndex(s.values);
		const v = i >= 0 ? s.values[i] : null;
		return { s, i, v, py: v == null ? 0 : y(v) };
	});
	const endsFit =
		endLabels &&
		ends.every((e, k) =>
			ends.every(
				(o, j) =>
					j === k || e.v == null || o.v == null || Math.abs(e.py - o.py) >= 16,
			),
		);

	const pick = (e: PointerEvent<SVGRectElement>) => {
		const box = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
		if (!box) return;
		setActive(nearestIndex(e.clientX - box.left, PAD.l, step, n));
	};

	const readout = (i: number) =>
		`${formatTime(times[i] ?? 0)}: ${series
			.map((s) => {
				const v = s.values[i];
				return `${s.label} ${v == null ? "–" : format(v)}`;
			})
			.join(", ")}`;

	const tipLeft =
		active == null
			? 0
			: Math.min(Math.max(x(active), 80), Math.max(80, width - 80));

	return (
		<div className="line-chart">
			{series.length > 1 ? (
				<ul className="chart-legend">
					{series.map((s) => (
						<li key={s.id}>
							<span className="chart-key" style={{ background: s.color }} />
							{s.label}
						</li>
					))}
				</ul>
			) : null}
			<div ref={ref} className="line-chart-plot" style={{ height }}>
				<input
					className="chart-scrub"
					type="range"
					min={0}
					max={Math.max(0, n - 1)}
					step={1}
					value={active ?? Math.max(0, n - 1)}
					aria-label={label}
					aria-valuetext={n ? readout(active ?? n - 1) : undefined}
					onChange={(e) => setActive(Number(e.target.value))}
					onFocus={() => setActive((a) => a ?? n - 1)}
					onBlur={() => setActive(null)}
					onKeyDown={(e) => {
						if (e.key === "Escape") setActive(null);
					}}
				/>
				{width > 0 ? (
					<svg width={width} height={height} aria-hidden="true">
						{ticks.map((t) => (
							<g key={t}>
								<line
									className="chart-grid"
									x1={PAD.l}
									x2={PAD.l + plotW}
									y1={y(t)}
									y2={y(t)}
								/>
								<text
									className="chart-tick"
									x={PAD.l - 8}
									y={y(t)}
									dy="0.32em"
									textAnchor="end"
								>
									{format(t)}
								</text>
							</g>
						))}
						{n > 0
							? [0, Math.floor((n - 1) / 2), n - 1].map((i, k) => (
									<text
										key={`x${i}`}
										className="chart-tick"
										x={x(i)}
										y={height - 6}
										textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
									>
										{formatTime(times[i] ?? 0)}
									</text>
								))
							: null}
						{area && series.length === 1 && series[0] ? (
							<path
								d={areaPath(series[0].values, x, y, base)}
								fill={series[0].color}
								opacity={0.1}
							/>
						) : null}
						{series.map((s) => (
							<path
								key={s.id}
								d={linePath(s.values, x, y)}
								fill="none"
								stroke={s.color}
								strokeWidth={2}
								strokeLinejoin="round"
								strokeLinecap="round"
							/>
						))}
						{endsFit
							? ends.map((e) =>
									e.v == null ? null : (
										<text
											key={`end-${e.s.id}`}
											className="chart-end"
											x={x(e.i) + 10}
											y={e.py}
											dy="0.32em"
										>
											{`${e.s.label} ${format(e.v)}`}
										</text>
									),
								)
							: null}
						{active != null ? (
							<g>
								<line
									className="chart-crosshair"
									x1={x(active)}
									x2={x(active)}
									y1={PAD.t}
									y2={base}
								/>
								{series.map((s) => {
									const v = s.values[active];
									return v == null ? null : (
										<circle
											key={`dot-${s.id}`}
											className="chart-dot"
											cx={x(active)}
											cy={y(v)}
											r={4}
											fill={s.color}
										/>
									);
								})}
							</g>
						) : null}
						<rect
							x={PAD.l - 6}
							y={0}
							width={plotW + 12}
							height={height}
							fill="transparent"
							onPointerMove={pick}
							onPointerLeave={() => setActive(null)}
						/>
					</svg>
				) : null}
				{active != null ? (
					<div
						className="chart-tip"
						style={{ left: tipLeft }}
						aria-hidden="true"
					>
						<p className="chart-tip-time">{formatTime(times[active] ?? 0)}</p>
						{series.map((s) => {
							const v = s.values[active];
							return (
								<p key={s.id} className="chart-tip-row">
									<span
										className="chart-tip-key"
										style={{ background: s.color }}
									/>
									<strong>{v == null ? "–" : format(v)}</strong>
									<span>{s.label}</span>
								</p>
							);
						})}
					</div>
				) : null}
			</div>
		</div>
	);
}
