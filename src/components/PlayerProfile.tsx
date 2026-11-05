"use client";

import { type ReactNode, useState } from "react";
import Link from "@/components/LocaleLink";
import { formatDateTime } from "@/i18n/datetime";
import { useI18n } from "@/i18n/provider";
import { songPath } from "@/lib/song-path";
import { fill, signed } from "@/phi/lib/card-i18n";
import type {
	PlayerProfileView,
	ProfileB30Row,
	ProfileChartRow,
	ProfileTagUse,
	TagProfileView,
} from "@/server/profile-view";

type Copy = ReturnType<typeof useI18n>["m"]["profile"];

const pct = (n: number) => `${n.toFixed(2)}%`;

function Level({ rank, c }: { rank: string; c?: number }) {
	return (
		<span className={`chart-level chart-level-${rank}`}>
			{rank}
			{c != null ? <span> {c.toFixed(1)}</span> : null}
		</span>
	);
}

const FAINT = 0.03;

function Diff({ value }: { value: number }) {
	const text = signed(value);
	return (
		<span
			className="pp-diff"
			data-sign={Math.abs(value) < FAINT ? "flat" : value > 0 ? "up" : "down"}
		>
			{text}
		</span>
	);
}

function BestTable({ rows, t }: { rows: ProfileB30Row[]; t: Copy }) {
	return (
		<div className="data-scroll">
			<table className="data-table pp-best">
				<thead>
					<tr>
						<th scope="col">{t.slot}</th>
						<th scope="col">{t.song}</th>
						<th scope="col">{t.level}</th>
						<th scope="col" className="num">
							{t.score}
						</th>
						<th scope="col" className="num">
							{t.acc}
						</th>
						<th scope="col" className="num">
							{t.rks}
						</th>
						<th scope="col" className="num">
							{t.push}
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((r) => (
						<tr key={`${r.slot}:${r.id}:${r.rank}`}>
							<td className="muted">{r.slot}</td>
							<th scope="row" className="data-song">
								<Link href={songPath(r.id)} prefetch={false}>
									{r.song}
								</Link>
							</th>
							<td>
								<Level rank={r.rank} c={r.c} />
							</td>
							<td className="num">
								{r.score.toLocaleString("en")}
								{r.score === 1_000_000 ? (
									<span className="pg-badge" data-status="ap">
										{t.ap}
									</span>
								) : r.fc ? (
									<span className="pg-badge" data-status="fc">
										{t.fc}
									</span>
								) : null}
							</td>
							<td className="num">{r.acc.toFixed(4)}%</td>
							<td className="num">{r.rks.toFixed(4)}</td>
							<td className="num muted">{r.push ?? t.noPush}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function ChartsTable({
	uses,
	charts,
	t,
	label,
	worstFirst,
	aps,
}: {
	uses: ProfileTagUse[];
	charts: ProfileChartRow[];
	t: Copy;
	label: string;
	worstFirst: boolean;
	aps: boolean;
}) {
	const dir = worstFirst ? 1 : -1;
	const key = (i: number) =>
		aps ? (charts[i]?.c ?? 0) : (charts[i]?.diff ?? 0);
	const rows = [...uses].sort((a, b) => dir * (key(a.chart) - key(b.chart)));
	return (
		<div className="data-scroll">
			<table className="data-table pp-charts">
				<caption className="sr-only">{label}</caption>
				<thead>
					<tr>
						<th scope="col">{t.song}</th>
						<th scope="col">{t.level}</th>
						<th scope="col" className="num">
							{t.acc}
						</th>
						<th scope="col" className="num">
							{t.rks}
						</th>
						<th scope="col" className="num">
							{t.expected}
						</th>
						<th scope="col" className="num">
							{t.diff}
						</th>
						<th scope="col" className="num">
							{t.share}
						</th>
						<th scope="col">{t.third}</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((u) => {
						const c = charts[u.chart];
						if (!c) return null;
						return (
							<tr key={`${c.id}:${c.rank}`}>
								<th scope="row" className="data-song">
									<Link href={songPath(c.id)} prefetch={false}>
										{c.song}
									</Link>
								</th>
								<td>
									<Level rank={c.rank} c={c.c} />
								</td>
								<td className="num">
									{pct(c.acc)}
									{c.weight < 1 ? (
										<span className="muted"> ×{c.weight.toFixed(1)}</span>
									) : null}
								</td>
								<td className="num">{c.rks.toFixed(2)}</td>
								<td className="num muted">{aps ? "–" : pct(c.expected)}</td>
								<td className="num">{aps ? "–" : <Diff value={c.diff} />}</td>
								<td className="num muted">{Math.round(u.share * 100)}%</td>
								<td>
									<span className="pp-group" data-group={c.group}>
										{t.groups[c.group]}
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function TagDetails({
	summary,
	children,
}: {
	summary: ReactNode;
	children: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	return (
		<details
			className="pp-tag"
			role="listitem"
			onToggle={(e) => setOpen(e.currentTarget.open)}
		>
			<summary>{summary}</summary>
			{open ? children : null}
		</details>
	);
}

function TagList({
	profile,
	t,
	kind,
}: {
	profile: TagProfileView;
	t: Copy;
	kind: "tags" | "categories";
}) {
	const rows =
		kind === "tags"
			? profile.tags
			: profile.categories.filter((c) => c.hasVotes);
	return (
		<div className="pp-tags" role="list">
			<div className="pp-tag-head" aria-hidden="true">
				<span>{kind === "tags" ? t.tag : t.category}</span>
				<span className="num">{t.mean}</span>
				<span className="num">{t.net}</span>
				<span className="num">{t.charts}</span>
				<span className="num">{t.hold}</span>
				{kind === "tags" ? <span>{t.verdict}</span> : null}
			</div>
			{rows.map((row) => {
				const side = "side" in row ? row.side : undefined;
				const few = kind === "tags" && row.charts < profile.minTagCharts;
				const aps = profile.basis === "aps";
				return (
					<TagDetails
						key={row.name}
						summary={
							<>
								<span className="pp-tag-name">{row.name}</span>
								<span className="num">
									{aps ? "–" : <Diff value={row.mean} />}
								</span>
								<span className="num">
									{side && !aps ? <Diff value={row.diff} /> : "–"}
								</span>
								<span className="num">{row.charts}</span>
								<span className="num">
									{side ? `${Math.floor(row.hold * 100)}%` : "–"}
								</span>
								{side ? (
									<span
										className="pp-side"
										data-side={side}
										data-slight={
											side !== "even" && (row.slight || !row.firm)
												? ""
												: undefined
										}
									>
										{side === "even"
											? t.sides.even
											: aps
												? t.aps[side]
												: row.faint
													? t.faint[side]
													: !row.firm
														? t.leaning[side]
														: row.slight
															? t.slight[side]
															: t.sides[side]}
									</span>
								) : null}
							</>
						}
					>
						{few ? (
							<p className="field-hint">
								{fill(t.few, { n: profile.minTagCharts })}
							</p>
						) : null}
						<ChartsTable
							uses={row.uses}
							charts={profile.charts}
							t={t}
							label={fill(t.chartsFor, { name: row.name })}
							worstFirst={row.diff < 0}
							aps={aps}
						/>
					</TagDetails>
				);
			})}
		</div>
	);
}

function TagSection({ view, t }: { view: PlayerProfileView; t: Copy }) {
	const { locale } = useI18n();
	const p = view.profile;
	return (
		<section className="pp-section" aria-labelledby="pp-tags-h">
			<h3 id="pp-tags-h">{t.tagsTitle}</h3>
			{!p ? (
				<p className="lede">{t.votesMissing}</p>
			) : (
				<>
					{p.range ? (
						<p className="pp-meta">
							{fill(t.meta, {
								min: p.range.min.toFixed(1),
								max: p.range.max.toFixed(1),
								scores: p.recordCount,
								charts: p.chartCount,
								votes: p.totalVotes,
							})}
						</p>
					) : null}
					<p className="pp-baseline">{t.baseline}</p>
					{p.basis === "aps" ? <p className="pp-note">{t.apsNote}</p> : null}
					{p.basis === "history" && p.asOf ? (
						<p className="pp-note">
							{fill(t.historyNote, {
								date: formatDateTime(p.asOf, locale),
							})}
						</p>
					) : null}
					<p className="field-hint">
						<Link href="/tags#formula">{t.howLink}</Link>
						{p.fetchedAt
							? ` · ${fill(t.source, { date: formatDateTime(p.fetchedAt, locale) })}`
							: null}
					</p>
					{p.insufficient ? (
						<p className="pp-note">
							{fill(t.insufficient, { n: p.chartCount, min: p.minCharts })}
						</p>
					) : null}
					{p.categories.some((c) => c.hasVotes) ? (
						<>
							<h4>{t.categoriesTitle}</h4>
							<TagList profile={p} t={t} kind="categories" />
						</>
					) : null}
					{p.tags.length ? (
						<>
							<h4>{t.allTagsTitle}</h4>
							<p className="field-hint">
								{fill(t.allTagsHint, {
									hold: Math.round(p.minHold * 100),
									firm: Math.round(p.firmHold * 100),
									n: p.minTagCharts,
								})}
							</p>
							<p className="field-hint">
								<span className="pp-side" data-side="strong" data-slight="">
									{t.leaning.strong}
								</span>{" "}
								<span className="pp-side" data-side="weak" data-slight="">
									{t.slight.weak}
								</span>{" "}
								{t.slightHint}
							</p>
							<TagList profile={p} t={t} kind="tags" />
						</>
					) : null}
				</>
			)}
		</section>
	);
}

export function PlayerProfile({ view }: { view: PlayerProfileView }) {
	const { m } = useI18n();
	const t = m.profile;
	return (
		<div className="pp">
			<h2 className="desk-section-title">{t.title}</h2>
			<p className="lede">{t.lede}</p>
			<section className="pp-section" aria-labelledby="pp-best-h">
				<h3 id="pp-best-h">{t.bestTitle}</h3>
				{view.best.length ? (
					<BestTable rows={view.best} t={t} />
				) : (
					<p className="lede">{t.empty}</p>
				)}
				{view.extra.length ? (
					<>
						<h4>{t.extraTitle}</h4>
						<BestTable rows={view.extra} t={t} />
					</>
				) : null}
			</section>
			<section className="pp-section" aria-labelledby="pp-analysis-h">
				<h3 id="pp-analysis-h">{t.analysisTitle}</h3>
				<dl className="pp-stats">
					<div>
						<dt>{t.average}</dt>
						<dd>{view.average.toFixed(4)}</dd>
					</div>
					<div>
						<dt>{t.stddev}</dt>
						<dd>± {view.stddev.toFixed(4)}</dd>
					</div>
				</dl>
			</section>
			<TagSection view={view} t={t} />
		</div>
	);
}
