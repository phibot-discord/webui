import type { Metadata } from "next";
import { type ReactNode, Suspense } from "react";
import { auth } from "@/auth";
import Link from "@/components/LocaleLink";
import { localeTag } from "@/i18n/config";
import { getMessages, signInLink } from "@/i18n/server";
import { localePath } from "@/lib/locale-path";
import { songPath } from "@/lib/song-path";
import { signedDelta } from "@/lib/trend-chart";
import {
	b30Under,
	diffTables,
	type Movement,
	pickVersions,
	type RecordAcc,
	rksSeries,
	type SlotRow,
	slotMoves,
	VERSION_LEVELS,
	type VersionLevel,
	type VersionTable,
	yourChanges,
} from "@/lib/versions";
import { fill } from "@/phi/lib/card-i18n";
import { fCompute } from "@/phi/lib/fcompute";
import { loadBound } from "@/server/bound";
import { songCatalog } from "@/server/charts";
import { getDataHost } from "@/server/data-host";
import { pageMetadata } from "@/server/og-meta";
import {
	everyVersionTable,
	type VersionOption,
	versionOptions,
	versionTable,
} from "@/server/versions";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("versions", { path: "/versions" });
}

type Search = Promise<{ from?: string | string[]; to?: string | string[] }>;

const codeOf = (v: string | string[] | undefined) => {
	const n = Number(Array.isArray(v) ? v[0] : v);
	return Number.isInteger(n) && n > 0 ? n : undefined;
};

async function myRecords(): Promise<RecordAcc[] | "signed-out" | "unbound"> {
	const userId = (await auth())?.user?.id;
	if (!userId) return "signed-out";
	const got = await loadBound(await getDataHost(), userId, { memo: true });
	if ("error" in got) return "unbound";
	return got.save
		.getRecord()
		.filter((r) => r.score > 0)
		.map((r) => ({ id: r.id, rank: r.rank, acc: r.acc }));
}

function Levels({ levels }: { levels: Partial<Record<VersionLevel, number>> }) {
	return (
		<>
			{VERSION_LEVELS.map((rank) => (
				<td key={rank} className="num">
					{levels[rank]?.toFixed(1) ?? "—"}
				</td>
			))}
		</>
	);
}

type Copy = Awaited<ReturnType<typeof getMessages>>["m"]["versions"];

function releasedOn(
	date: number | null,
	locale: Parameters<typeof localeTag>[0],
) {
	return date
		? new Date(date).toLocaleDateString(localeTag(locale), {
				timeZone: "Asia/Shanghai",
				dateStyle: "medium",
			})
		: "";
}

async function YourSeries({
	records,
	options,
}: {
	records: RecordAcc[];
	options: VersionOption[];
}) {
	const { m, locale } = await getMessages();
	const t = m.versions;
	const tables = await everyVersionTable(options);
	const series = rksSeries(records, tables);
	const shown = series.filter(
		(p, i) => i === 0 || i === series.length - 1 || (p.delta ?? 0) !== 0,
	);
	if (shown.length < 2) return null;
	return (
		<section className="song-section" aria-labelledby="vd-series">
			<h2 id="vd-series">{t.seriesTitle}</h2>
			<p className="field-hint">{t.seriesLede}</p>
			<div className="data-scroll">
				<table className="data-table">
					<thead>
						<tr>
							<th scope="col">{t.seriesVersion}</th>
							<th scope="col">{t.seriesReleased}</th>
							<th scope="col" className="num">
								RKS
							</th>
							<th scope="col" className="num">
								{t.delta}
							</th>
							<th scope="col" className="num">
								{t.seriesCharts}
							</th>
						</tr>
					</thead>
					<tbody>
						{[...shown].reverse().map((p) => (
							<tr key={p.code}>
								<th scope="row">{p.label}</th>
								<td>{releasedOn(p.date, locale)}</td>
								<td className="num">{p.rks.toFixed(4)}</td>
								<td className="num">
									{p.delta == null ? "—" : signedDelta(p.delta, 4)}
								</td>
								<td className="num">{p.charts}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}

function MoveBadge({ move, t }: { move: Movement; t: Copy }) {
	if (move === "none") return <span className="muted">—</span>;
	return (
		<span className="vd-move" data-move={move}>
			{t.move[move]}
		</span>
	);
}

function SlotList({
	rows,
	titleOf,
}: {
	rows: SlotRow[];
	titleOf: (id: string) => ReactNode;
}) {
	return (
		<ul className="vd-slots">
			{rows.map((r) => (
				<li key={`${r.id}:${r.rank}`}>
					{titleOf(r.id)}{" "}
					<span className={`chart-level chart-level-${r.rank}`}>{r.rank}</span>{" "}
					<span className="muted">{r.rks.toFixed(3)}</span>
				</li>
			))}
		</ul>
	);
}

export default async function VersionsPage({
	searchParams,
}: {
	searchParams: Search;
}) {
	const q = await searchParams;
	const [{ m, locale }, options, catalog, mine] = await Promise.all([
		getMessages(),
		versionOptions(),
		songCatalog(),
		myRecords(),
	]);
	const t = m.versions;
	const picked = pickVersions(
		options.map((o) => o.code),
		codeOf(q.from),
		codeOf(q.to),
	);
	const from = options.find((o) => o.code === picked?.from);
	const to = options.find((o) => o.code === picked?.to);
	const [ta, tb] = await Promise.all([
		from ? versionTable(from) : undefined,
		to ? versionTable(to) : undefined,
	]);
	const names = new Map(catalog.list.map((s) => [s.id, s.song] as const));
	const known = new Set(catalog.list.map((s) => s.id));
	const titleOf = (id: string, ...tables: (VersionTable | undefined)[]) =>
		names.get(id) ??
		tables.map((tb) => tb?.get(id)?.song).find(Boolean) ??
		id.replace(/\.0$/, "");
	const songCell = (id: string) =>
		known.has(id) ? (
			<Link href={songPath(id)} prefetch={false}>
				{titleOf(id, ta, tb)}
			</Link>
		) : (
			titleOf(id, ta, tb)
		);
	const label = (o: typeof from) =>
		o ? (o.current ? fill(t.currentLabel, { label: o.label }) : o.label) : "";
	const dateOf = (o: typeof from) => releasedOn(o?.date ?? null, locale);

	const diff = ta && tb ? diffTables(ta, tb) : undefined;
	const records = Array.isArray(mine) ? mine : [];
	const accOf = new Map(
		records.map((r) => [`${r.id}:${r.rank}`, r.acc] as const),
	);
	const between =
		from && to
			? options
					.filter((o) => o.code > from.code && o.code <= to.code && o.notes)
					.reverse()
			: [];
	const newCharts = diff?.changed.filter((c) => c.from == null).length ?? 0;
	const constantChanges =
		diff?.changed.filter((c) => c.from != null && c.to != null) ?? [];
	const otherChanges =
		diff?.changed.filter((c) => c.from == null || c.to == null) ?? [];
	const yours =
		ta && tb && records.length
			? { a: b30Under(records, ta), b: b30Under(records, tb) }
			: undefined;
	const moves = yours ? slotMoves(yours.a, yours.b) : undefined;
	const mineChanged =
		yours && diff ? yourChanges(records, diff.changed, yours.a, yours.b) : [];
	const first = options[0];
	const last = options.at(-1);

	return (
		<main id="content" className="page versions-page">
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<form
				className="cv-pick vd-pick"
				method="get"
				action={localePath("/versions", locale)}
			>
				{(
					[
						["from", t.from, from?.code],
						["to", t.to, to?.code],
					] as const
				).map(([name, text, value]) => (
					<div key={name} className="field field-col">
						<label className="field-label" htmlFor={`vd-${name}`}>
							{text}
						</label>
						<select
							id={`vd-${name}`}
							className="input"
							name={name}
							defaultValue={value}
						>
							{[...options].reverse().map((o) => (
								<option key={o.code} value={o.code}>
									{label(o)}
								</option>
							))}
						</select>
					</div>
				))}
				<button type="submit" className="btn btn-primary vd-submit">
					{t.submit}
				</button>
			</form>
			{first && last ? (
				<p className="field-hint">
					{fill(t.coverage, {
						n: options.length,
						first: first.label,
						last: last.label,
					})}
				</p>
			) : null}

			{!diff || !from || !to ? (
				<p className="callout">{t.unavailable}</p>
			) : (
				<>
					<section className="song-section" aria-labelledby="vd-sum">
						<h2 id="vd-sum">
							{fill(t.summaryTitle, { from: from.label, to: to.label })}
						</h2>
						<ul className="vd-counts">
							<li>
								<span className="meta-value">{diff.added.length}</span>{" "}
								{t.added}
							</li>
							<li>
								<span className="meta-value">{diff.removed.length}</span>{" "}
								{t.removed}
							</li>
							<li>
								<span className="meta-value">{constantChanges.length}</span>{" "}
								{t.changed}
							</li>
							<li>
								<span className="meta-value">{newCharts}</span> {t.newCharts}
							</li>
						</ul>
						{dateOf(from) && dateOf(to) ? (
							<p className="field-hint">
								{fill(t.dates, {
									from: dateOf(from),
									to: dateOf(to),
								})}
							</p>
						) : null}
					</section>

					<section className="song-section" aria-labelledby="vd-you">
						<h2 id="vd-you">{t.yoursTitle}</h2>
						{mine === "signed-out" ? (
							<p className="callout">
								{t.yoursSignedOut}{" "}
								<Link href={await signInLink("/versions")} prefetch={false}>
									{m.songPage.signIn}
								</Link>
							</p>
						) : mine === "unbound" ? (
							<p className="callout">{t.yoursNotBound}</p>
						) : yours ? (
							<>
								<p className="vd-rks">
									<span>
										<span className="meta-label">{from.label} </span>
										<span className="meta-value">{yours.a.rks.toFixed(4)}</span>
									</span>
									<span>
										<span className="meta-label">{to.label} </span>
										<span className="meta-value">{yours.b.rks.toFixed(4)}</span>
									</span>
									<span>
										<span className="meta-label">{t.delta} </span>
										<span className="meta-value">
											{signedDelta(yours.b.rks - yours.a.rks, 4)}
										</span>
									</span>
								</p>
								<p className="field-hint">{t.yoursHint}</p>
								{moves && (moves.entered.length || moves.left.length) ? (
									<div className="vd-moves">
										{moves.entered.length ? (
											<div>
												<h3 className="sim-list-title">
													{fill(t.enteredTitle, { to: to.label })}
												</h3>
												<SlotList rows={moves.entered} titleOf={songCell} />
											</div>
										) : null}
										{moves.left.length ? (
											<div>
												<h3 className="sim-list-title">
													{fill(t.leftTitle, { to: to.label })}
												</h3>
												<SlotList rows={moves.left} titleOf={songCell} />
											</div>
										) : null}
									</div>
								) : (
									<p className="field-hint">{t.movesNone}</p>
								)}
								{mineChanged.length ? (
									<>
										<h3 className="sim-list-title">{t.yoursCharts}</h3>
										<p className="field-hint">{t.yoursChartsHint}</p>
										<div className="data-scroll">
											<table className="data-table">
												<thead>
													<tr>
														<th scope="col">{t.song}</th>
														<th scope="col">{t.level}</th>
														<th scope="col" className="num">
															{t.acc}
														</th>
														<th scope="col" className="num">
															{t.constant}
														</th>
														<th scope="col" className="num">
															{t.chartRks}
														</th>
														<th scope="col">{t.b30}</th>
													</tr>
												</thead>
												<tbody>
													{mineChanged.map((c) => (
														<tr key={`${c.id}:${c.rank}`}>
															<th scope="row" className="data-song">
																{songCell(c.id)}
															</th>
															<td>
																<span
																	className={`chart-level chart-level-${c.rank}`}
																>
																	{c.rank}
																</span>
															</td>
															<td className="num">{c.acc.toFixed(2)}%</td>
															<td className="num">
																{c.from.toFixed(1)} → {c.to.toFixed(1)}
															</td>
															<td className="num" data-changed>
																{signedDelta(c.after - c.before, 3)}
															</td>
															<td>
																<MoveBadge move={c.move} t={t} />
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</>
								) : null}
							</>
						) : (
							<p className="callout">{t.yoursNone}</p>
						)}
					</section>

					{records.length ? (
						<Suspense
							fallback={<p className="field-hint">{t.seriesLoading}</p>}
						>
							<YourSeries records={records} options={options} />
						</Suspense>
					) : null}

					{between.length ? (
						<section className="song-section" aria-labelledby="vd-notes">
							<h2 id="vd-notes">{t.notesTitle}</h2>
							{between.map((o) => (
								<details
									key={o.code}
									className="trend-table vd-note"
									open={o.code === to.code}
								>
									<summary>
										{label(o)}
										{o.date ? (
											<span className="muted"> · {dateOf(o)}</span>
										) : null}
									</summary>
									<p className="vd-note-text">{o.notes}</p>
								</details>
							))}
						</section>
					) : null}

					{constantChanges.length ? (
						<section className="song-section" aria-labelledby="vd-changed">
							<h2 id="vd-changed">{t.changedTitle}</h2>
							<div className="data-scroll">
								<table className="data-table">
									<thead>
										<tr>
											<th scope="col">{t.song}</th>
											<th scope="col">{t.level}</th>
											<th scope="col" className="num">
												{from.label}
											</th>
											<th scope="col" className="num">
												{to.label}
											</th>
											<th scope="col" className="num">
												{t.delta}
											</th>
											{records.length ? (
												<th scope="col" className="num">
													{t.yourRks}
												</th>
											) : null}
										</tr>
									</thead>
									<tbody>
										{constantChanges.map((c) => {
											const acc = accOf.get(`${c.id}:${c.rank}`);
											return (
												<tr key={`${c.id}:${c.rank}`}>
													<th scope="row" className="data-song">
														{songCell(c.id)}
													</th>
													<td>
														<span
															className={`chart-level chart-level-${c.rank}`}
														>
															{c.rank}
														</span>
													</td>
													<td className="num">{c.from?.toFixed(1)}</td>
													<td className="num">{c.to?.toFixed(1)}</td>
													<td className="num" data-changed>
														{signedDelta((c.to ?? 0) - (c.from ?? 0), 1)}
													</td>
													{records.length ? (
														<td className="num">
															{acc != null && c.from != null && c.to != null
																? signedDelta(
																		fCompute.rks(acc, c.to) -
																			fCompute.rks(acc, c.from),
																		3,
																	)
																: "—"}
														</td>
													) : null}
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</section>
					) : null}

					{diff.added.length ? (
						<section className="song-section" aria-labelledby="vd-added">
							<h2 id="vd-added">{t.addedTitle}</h2>
							<div className="data-scroll">
								<table className="data-table">
									<thead>
										<tr>
											<th scope="col">{t.song}</th>
											{VERSION_LEVELS.map((rank) => (
												<th key={rank} scope="col" className="num">
													{rank}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{diff.added.map((s) => (
											<tr key={s.id}>
												<th scope="row" className="data-song">
													{songCell(s.id)}
												</th>
												<Levels levels={s.levels} />
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</section>
					) : null}

					{otherChanges.length ? (
						<section className="song-section" aria-labelledby="vd-charts">
							<h2 id="vd-charts">{t.chartsTitle}</h2>
							<div className="data-scroll">
								<table className="data-table">
									<thead>
										<tr>
											<th scope="col">{t.song}</th>
											<th scope="col">{t.level}</th>
											<th scope="col">{t.what}</th>
											<th scope="col" className="num">
												{t.constant}
											</th>
										</tr>
									</thead>
									<tbody>
										{otherChanges.map((c) => (
											<tr key={`${c.id}:${c.rank}`}>
												<th scope="row" className="data-song">
													{songCell(c.id)}
												</th>
												<td>
													<span className={`chart-level chart-level-${c.rank}`}>
														{c.rank}
													</span>
												</td>
												<td>
													{c.from == null ? t.chartAdded : t.chartRemoved}
												</td>
												<td className="num">{(c.to ?? c.from)?.toFixed(1)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</section>
					) : null}

					{diff.removed.length ? (
						<section className="song-section" aria-labelledby="vd-removed">
							<h2 id="vd-removed">{t.removedTitle}</h2>
							<div className="data-scroll">
								<table className="data-table">
									<thead>
										<tr>
											<th scope="col">{t.song}</th>
											{VERSION_LEVELS.map((rank) => (
												<th key={rank} scope="col" className="num">
													{rank}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{diff.removed.map((s) => (
											<tr key={s.id}>
												<th scope="row" className="data-song">
													{songCell(s.id)}
												</th>
												<Levels levels={s.levels} />
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</section>
					) : null}
				</>
			)}
		</main>
	);
}
