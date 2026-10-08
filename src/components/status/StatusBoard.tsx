"use client";

import {
	CheckCircle,
	Question,
	WarningCircle,
	XCircle,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SegRadio } from "@/components/SegRadio";
import { localeTag } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import {
	type CheckBucket,
	STATUS_TARGETS,
	type StatusData,
	type StatusHost,
	type StatusState,
	type StatusTarget,
} from "@/lib/status";
import { rollup } from "@/lib/status-chart";
import { LineChart } from "./LineChart";
import { UptimeBars } from "./UptimeBars";

type Range = "30d" | "24h";

const DAY = 86_400_000;
const HOUR = 3_600_000;

const ICONS = {
	up: CheckCircle,
	degraded: WarningCircle,
	down: XCircle,
	unknown: Question,
} as const;

const SERIES = {
	latency: "var(--series-1)",
	cpu: "var(--series-1)",
	mem: "var(--series-2)",
};

function useFormats() {
	const { locale, m } = useI18n();
	const tag = localeTag(locale);
	const day = new Intl.DateTimeFormat(tag, {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
	const hour = new Intl.DateTimeFormat(tag, {
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
		timeZone: "UTC",
	});
	const dayHour = new Intl.DateTimeFormat(tag, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
		timeZone: "UTC",
	});
	return {
		m,
		day: (t: number) => day.format(t),
		hour: (t: number) => hour.format(t),
		dayHour: (t: number) => dayHour.format(t),
		pct: (v: number | null) =>
			v == null ? "–" : v === 100 ? "100%" : `${v.toFixed(2)}%`,
		usage: (v: number) => `${Math.round(v)}%`,
		ms: (v: number | null) => (v == null ? "–" : `${Math.round(v)} ms`),
	};
}

function StatusPill({ state }: { state: StatusState }) {
	const { m } = useI18n();
	const Icon = ICONS[state];
	return (
		<span className={`status-pill is-${state}`}>
			<Icon size={16} weight="fill" aria-hidden="true" />
			{m.status.states[state]}
		</span>
	);
}

function averageLatency(buckets: CheckBucket[]) {
	let sum = 0;
	let weight = 0;
	for (const b of buckets) {
		if (b.latency == null || !b.checks) continue;
		sum += b.latency * b.checks;
		weight += b.checks;
	}
	return weight ? sum / weight : null;
}

function errorText(code: string, errors: Record<string, string>) {
	const http = /^http_(\d+)$/.exec(code);
	if (http)
		return (errors.http ?? "HTTP {code}").replace("{code}", http[1] ?? "");
	return errors[code] ?? code;
}

function HostPanel({ host, range }: { host: StatusHost; range: Range }) {
	const f = useFormats();
	const t = f.m.status;
	const points = range === "30d" ? host.series30d : host.series24h;
	const gb = (mb: number | null) => (mb == null ? "–" : (mb / 1024).toFixed(1));
	const days = Math.floor(host.uptimeSec / 86_400);
	return (
		<div className="host-panel">
			<dl className="status-stats">
				<div>
					<dt>{t.cpu}</dt>
					<dd>{host.cpu == null ? "–" : f.usage(host.cpu)}</dd>
				</div>
				<div>
					<dt>{t.memory}</dt>
					<dd>
						{host.mem == null ? "–" : f.usage(host.mem)}
						<span className="status-sub">
							{gb(host.memUsedMb)} / {gb(host.memTotalMb)} GB
						</span>
					</dd>
				</div>
				<div>
					<dt>{t.load}</dt>
					<dd>
						{host.load1 ?? "–"}
						<span className="status-sub">
							{host.cores} {t.cores}
						</span>
					</dd>
				</div>
				<div>
					<dt>{t.upFor}</dt>
					<dd>{t.days.replace("{n}", String(days))}</dd>
				</div>
			</dl>
			<h3 className="status-chart-title">{t.usage}</h3>
			<LineChart
				label={`${t.usage}, ${range === "30d" ? t.range30d : t.range24h}`}
				times={points.map((p) => p.t)}
				series={[
					{
						id: "cpu",
						label: t.cpu,
						color: SERIES.cpu,
						values: points.map((p) => p.cpu),
					},
					{
						id: "mem",
						label: t.memory,
						color: SERIES.mem,
						values: points.map((p) => p.mem),
					},
				]}
				max={100}
				format={f.usage}
				formatTime={range === "30d" ? f.dayHour : f.hour}
				endLabels
			/>
		</div>
	);
}

function HostTable({ host, range }: { host: StatusHost; range: Range }) {
	const f = useFormats();
	const t = f.m.status;
	const rows = rollup(
		range === "30d" ? host.series30d : host.series24h,
		range === "30d" ? DAY : HOUR,
		["cpu", "mem"],
	);
	return (
		<table className="status-table">
			<caption className="sr-only">{t.usage}</caption>
			<thead>
				<tr>
					<th scope="col">{t.time}</th>
					<th scope="col">{t.cpu}</th>
					<th scope="col">{t.memory}</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((r) => (
					<tr key={r.t}>
						<th scope="row">{range === "30d" ? f.day(r.t) : f.hour(r.t)}</th>
						<td>{r.cpu == null ? "–" : f.usage(r.cpu)}</td>
						<td>{r.mem == null ? "–" : f.usage(r.mem)}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

function TargetCard({
	target,
	host,
	range,
}: {
	target: StatusTarget;
	host: StatusHost | null;
	range: Range;
}) {
	const f = useFormats();
	const t = f.m.status;
	const info = t.targets[target.id];
	const buckets = range === "30d" ? target.days : target.hours;
	const formatTime = range === "30d" ? f.day : f.hour;
	const rangeLabel = range === "30d" ? t.range30d : t.range24h;
	const titleId = `status-${target.id}`;
	const hasData = buckets.some((b) => b.checks > 0);
	return (
		<article className="status-card" aria-labelledby={titleId}>
			<header className="status-card-head">
				<div>
					<h2 id={titleId}>{info.name}</h2>
					<p className="status-blurb">{info.blurb}</p>
				</div>
				<StatusPill state={target.status} />
			</header>
			<dl className="status-stats">
				<div>
					<dt>
						{t.uptime} · {rangeLabel}
					</dt>
					<dd>
						{f.pct(range === "30d" ? target.uptime30d : target.uptime24h)}
					</dd>
				</div>
				<div>
					<dt>
						{t.latency} · {t.latencyNow}
					</dt>
					<dd>{f.ms(target.latencyMs)}</dd>
				</div>
				<div>
					<dt>
						{t.latency} · {t.latencyAvg}
					</dt>
					<dd>{f.ms(averageLatency(buckets))}</dd>
				</div>
			</dl>
			{target.error ? (
				<p className="status-error">{errorText(target.error, t.errors)}</p>
			) : null}
			{hasData ? (
				<>
					<h3 className="status-chart-title">{t.uptime}</h3>
					<UptimeBars
						label={`${info.name}: ${t.uptime}, ${rangeLabel}`}
						buckets={buckets}
						formatTime={formatTime}
						formatPct={f.pct}
						formatMs={f.ms}
						checksLabel={t.checks}
						noData={t.noData}
					/>
					<h3 className="status-chart-title">{t.latency}</h3>
					<LineChart
						label={`${info.name}: ${t.latency}, ${rangeLabel}`}
						times={buckets.map((b) => b.t)}
						series={[
							{
								id: "latency",
								label: t.latencyAvg,
								color: SERIES.latency,
								values: buckets.map((b) => b.latency),
							},
						]}
						format={f.ms}
						formatTime={formatTime}
						area
					/>
				</>
			) : (
				<p className="status-empty">{t.noData}</p>
			)}
			{host ? <HostPanel host={host} range={range} /> : null}
			{hasData ? (
				<details className="status-details">
					<summary>{t.showTable}</summary>
					<table className="status-table">
						<caption className="sr-only">{info.name}</caption>
						<thead>
							<tr>
								<th scope="col">{t.time}</th>
								<th scope="col">{t.uptime}</th>
								<th scope="col">{t.latencyAvg}</th>
								<th scope="col">{t.p95}</th>
								<th scope="col">{t.checks}</th>
							</tr>
						</thead>
						<tbody>
							{buckets.map((b) => (
								<tr key={b.t}>
									<th scope="row">{formatTime(b.t)}</th>
									<td>{f.pct(b.uptime)}</td>
									<td>{f.ms(b.latency)}</td>
									<td>{f.ms(b.p95)}</td>
									<td>{b.checks}</td>
								</tr>
							))}
						</tbody>
					</table>
					{host ? <HostTable host={host} range={range} /> : null}
				</details>
			) : null}
		</article>
	);
}

function placeholder(id: StatusTarget["id"]): StatusTarget {
	return {
		id,
		status: "unknown",
		latencyMs: null,
		checkedAt: null,
		error: null,
		uptime24h: null,
		uptime30d: null,
		days: [],
		hours: [],
	};
}

export function StatusBoard({ data }: { data: StatusData | null }) {
	const f = useFormats();
	const t = f.m.status;
	const router = useRouter();
	const [range, setRange] = useState<Range>("30d");

	useEffect(() => {
		const id = window.setInterval(() => router.refresh(), 60_000);
		return () => window.clearInterval(id);
	}, [router]);

	const targets = data?.targets ?? STATUS_TARGETS.map(placeholder);
	const overall = !data
		? "unavailable"
		: targets.some((x) => x.status === "down")
			? "down"
			: targets.some((x) => x.status !== "up")
				? "degraded"
				: "up";
	const OverallIcon = ICONS[overall === "unavailable" ? "unknown" : overall];

	return (
		<>
			<header className="status-head">
				<h1>{t.title}</h1>
				<p className="lede">{t.lede}</p>
			</header>
			<div className={`status-banner is-${overall}`} role="status">
				<OverallIcon size={22} weight="fill" aria-hidden="true" />
				<p>{t.overall[overall]}</p>
				{data ? (
					<span className="status-updated">
						{t.updated} {f.dayHour(data.generatedAt)} UTC
					</span>
				) : null}
			</div>
			{data ? (
				<div className="status-filters">
					<SegRadio<Range>
						legend={t.range}
						value={range}
						options={[
							{ value: "30d", label: t.range30d },
							{ value: "24h", label: t.range24h },
						]}
						onChange={setRange}
					/>
				</div>
			) : null}
			<div className="status-list">
				{targets.map((target) => (
					<TargetCard
						key={target.id}
						target={target}
						host={target.id === "assets" && data ? data.host : null}
						range={range}
					/>
				))}
			</div>
			<p className="status-note">{t.utcNote}</p>
		</>
	);
}
