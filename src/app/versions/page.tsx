import type { Metadata } from "next";
import { auth } from "@/auth";
import Link from "@/components/LocaleLink";
import { localeTag } from "@/i18n/config";
import { getMessages, signInHref } from "@/i18n/server";
import { localePath } from "@/lib/locale-path";
import { songPath } from "@/lib/song-path";
import { signedDelta } from "@/lib/trend-chart";
import {
	diffTables,
	pickVersions,
	type RecordAcc,
	rksUnder,
	VERSION_LEVELS,
	type VersionLevel,
	type VersionTable,
} from "@/lib/versions";
import { fill } from "@/phi/lib/card-i18n";
import { fCompute } from "@/phi/lib/fcompute";
import { loadBound } from "@/server/bound";
import { chartCatalog } from "@/server/charts";
import { getDataHost } from "@/server/data-host";
import { pageMetadata } from "@/server/og-meta";
import { versionOptions, versionTable } from "@/server/versions";

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

export default async function VersionsPage({
	searchParams,
}: {
	searchParams: Search;
}) {
	const q = await searchParams;
	const [{ m, locale }, options, catalog, mine] = await Promise.all([
		getMessages(),
		versionOptions(),
		chartCatalog(),
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
	const dateOf = (o: typeof from) =>
		o?.date
			? new Date(o.date).toLocaleDateString(localeTag(locale), {
					timeZone: "Asia/Shanghai",
					dateStyle: "medium",
				})
			: "";

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
			? { a: rksUnder(records, ta), b: rksUnder(records, tb) }
			: undefined;
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
								<Link href={await signInHref("/versions")} prefetch={false}>
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
							</>
						) : (
							<p className="callout">{t.yoursNone}</p>
						)}
					</section>

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
