"use client";

import { useState } from "react";
import type { CheckBucket } from "@/lib/status";
import { uptimeBand, uptimeHeight } from "@/lib/status-chart";

export function UptimeBars({
	label,
	buckets,
	formatTime,
	formatPct,
	formatMs,
	checksLabel,
	noData,
}: {
	label: string;
	buckets: CheckBucket[];
	formatTime: (t: number) => string;
	formatPct: (v: number | null) => string;
	formatMs: (v: number | null) => string;
	checksLabel: string;
	noData: string;
}) {
	const [active, setActive] = useState<number | null>(null);
	const n = buckets.length;
	const cur = active == null ? null : buckets[active];
	const readout = (i: number) => {
		const b = buckets[i];
		if (!b) return "";
		const value =
			b.uptime == null
				? noData
				: `${formatPct(b.uptime)}, ${formatMs(b.latency)}, ${b.checks} ${checksLabel}`;
		return `${formatTime(b.t)}: ${value}`;
	};

	return (
		<div className="uptime" onPointerLeave={() => setActive(null)}>
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
			<div className="uptime-bars" aria-hidden="true">
				{buckets.map((b, i) => (
					<span
						key={b.t}
						className={`uptime-cell is-${uptimeBand(b.uptime)}${i === active ? " is-active" : ""}`}
						onPointerEnter={() => setActive(i)}
					>
						<span
							className="uptime-fill"
							style={{ height: `${uptimeHeight(b.uptime) * 100}%` }}
						/>
					</span>
				))}
			</div>
			<div className="uptime-axis" aria-hidden="true">
				<span>{formatTime(buckets[0]?.t ?? 0)}</span>
				<span>{formatTime(buckets.at(-1)?.t ?? 0)}</span>
			</div>
			{cur && active != null ? (
				<div
					className="chart-tip uptime-tip"
					style={{ left: `${((active + 0.5) / n) * 100}%` }}
					aria-hidden="true"
				>
					<p className="chart-tip-time">{formatTime(cur.t)}</p>
					{cur.uptime == null ? (
						<p className="chart-tip-row">{noData}</p>
					) : (
						<>
							<p className="chart-tip-row">
								<strong>{formatPct(cur.uptime)}</strong>
								<span>
									{cur.checks} {checksLabel}
								</span>
							</p>
							<p className="chart-tip-row">
								<strong>{formatMs(cur.latency)}</strong>
							</p>
						</>
					)}
				</div>
			) : null}
		</div>
	);
}
