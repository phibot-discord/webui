"use client";

import { useId, useMemo, useState } from "react";
import Link from "@/components/LocaleLink";
import { SegRadio } from "@/components/SegRadio";
import { useI18n } from "@/i18n/provider";
import type { CompareResult, CompareSide } from "@/lib/compare";
import { localePath } from "@/lib/locale-path";
import { songPath } from "@/lib/song-path";
import { fill } from "@/phi/lib/card-i18n";

const STEP = 40;
type Filter = "all" | "a" | "b";

export function CompareForm({
	a,
	b,
	signedIn,
	errors,
}: {
	a: string;
	b: string;
	signedIn: boolean;
	errors: string[];
}) {
	const { m, locale } = useI18n();
	const t = m.compare;
	const ids = useId();
	const [va, setA] = useState(a);
	const [vb, setB] = useState(b);
	return (
		<form
			className="cmp-form"
			method="get"
			action={localePath("/compare", locale)}
		>
			{(
				[
					["a", t.a, va, setA],
					["b", t.b, vb, setB],
				] as const
			).map(([name, label, value, set]) => (
				<div key={name} className="field field-col">
					<label className="field-label" htmlFor={`${ids}-${name}`}>
						{label}
					</label>
					<div className="cmp-row">
						<input
							id={`${ids}-${name}`}
							className="input"
							name={name}
							value={value}
							placeholder={t.placeholder}
							autoComplete="off"
							spellCheck={false}
							onChange={(e) => set(e.target.value)}
						/>
						{signedIn ? (
							<button
								type="button"
								className="btn btn-ghost"
								onClick={() => set("me")}
							>
								{t.useMine}
							</button>
						) : null}
					</div>
				</div>
			))}
			<button type="submit" className="btn btn-primary cmp-submit">
				{t.submit}
			</button>
			<p className="field-hint cmp-hint">{t.hint}</p>
			{errors.length ? (
				<div className="callout cmp-errors" role="alert">
					{errors.map((e) => (
						<p key={e}>{e}</p>
					))}
				</div>
			) : null}
		</form>
	);
}

function Player({ side, label }: { side: CompareSide; label: string }) {
	const { m } = useI18n();
	const t = m.compare;
	const tier = Math.floor(side.challenge / 100);
	return (
		<div className="cmp-player">
			<p className="cmp-who">{label}</p>
			<p className="cmp-name">{side.name}</p>
			<p className="cmp-stats">
				<span>
					<span className="meta-label">{t.rks} </span>
					<span className="meta-value">{side.rks?.toFixed(4) ?? "—"}</span>
				</span>
				{tier > 0 ? (
					<span>
						<span className="meta-label">{t.challenge} </span>
						<span className="meta-value" data-tier={tier}>
							{side.challenge % 100}
						</span>
					</span>
				) : null}
			</p>
		</div>
	);
}

export function CompareView({
	a,
	b,
	result,
	songs,
}: {
	a: CompareSide;
	b: CompareSide;
	result: CompareResult;
	songs: Record<string, string>;
}) {
	const { m } = useI18n();
	const t = m.compare;
	const ids = useId();
	const [filter, setFilter] = useState<Filter>("all");
	const [shown, setShown] = useState(STEP);
	const rows = useMemo(
		() =>
			result.both.filter((h) =>
				filter === "all" ? true : filter === "a" ? h.diff > 0 : h.diff < 0,
			),
		[result.both, filter],
	);
	const nameOf = (id: string) => songs[id] ?? id.replace(/\.0$/, "");
	const delta = a.rks != null && b.rks != null ? a.rks - b.rks : null;

	return (
		<>
			<div className="cmp-players">
				<Player side={a} label={t.a} />
				<p className="cmp-vs" aria-hidden="true">
					{delta != null
						? `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta).toFixed(4)}`
						: "vs"}
				</p>
				<Player side={b} label={t.b} />
			</div>

			<section className="song-section" aria-labelledby={`${ids}-lv`}>
				<h2 id={`${ids}-lv`}>{t.levelsTitle}</h2>
				<div className="data-scroll">
					<table className="data-table cmp-tally">
						<thead>
							<tr>
								<th scope="col">{t.level}</th>
								{(["played", "clear", "fc", "ap"] as const).map((k) => (
									<th key={k} scope="col" className="num">
										{t[k]}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{result.tallies.map((row) => (
								<tr key={row.rank}>
									<th scope="row">
										<span className={`chart-level chart-level-${row.rank}`}>
											{row.rank}
										</span>
									</th>
									{(["played", "clear", "fc", "ap"] as const).map((k) => {
										const x = row.a[k];
										const y = row.b[k];
										return (
											<td key={k} className="num">
												<span data-lead={x > y || undefined}>{x}</span>
												<span className="muted"> : </span>
												<span data-lead={y > x || undefined}>{y}</span>
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>

			<section className="song-section" aria-labelledby={`${ids}-h2h`}>
				<h2 id={`${ids}-h2h`}>{t.h2hTitle}</h2>
				<p>
					{fill(t.h2hSummary, {
						n: result.both.length,
						a: a.name,
						b: b.name,
						wa: result.wins.a,
						wb: result.wins.b,
					})}{" "}
					{result.wins.ties ? fill(t.ties, { n: result.wins.ties }) : null}
				</p>
				{result.onlyA || result.onlyB ? (
					<p className="field-hint">
						{result.onlyA
							? fill(t.only, { name: a.name, n: result.onlyA })
							: null}{" "}
						{result.onlyB
							? fill(t.only, { name: b.name, n: result.onlyB })
							: null}
					</p>
				) : null}
				<SegRadio
					legend={t.filter}
					value={filter}
					options={(["all", "a", "b"] as const).map((value) => ({
						value,
						label: fill(t.filters[value], {
							name: value === "a" ? a.name : b.name,
						}),
					}))}
					onChange={(next) => {
						setFilter(next);
						setShown(STEP);
					}}
				/>
				{rows.length ? (
					<div className="data-scroll cmp-h2h">
						<table className="data-table">
							<thead>
								<tr>
									<th scope="col">{t.song}</th>
									<th scope="col">{t.level}</th>
									<th scope="col" className="num">
										{t.constant}
									</th>
									<th scope="col" className="num">
										{a.name}
									</th>
									<th scope="col" className="num">
										{b.name}
									</th>
									<th scope="col" className="num">
										{t.gap}
									</th>
								</tr>
							</thead>
							<tbody>
								{rows.slice(0, shown).map((h) => (
									<tr key={`${h.id}:${h.rank}`}>
										<th scope="row" className="data-song">
											<Link href={songPath(h.id)} prefetch={false}>
												{nameOf(h.id)}
											</Link>
										</th>
										<td>
											<span className={`chart-level chart-level-${h.rank}`}>
												{h.rank}
											</span>
										</td>
										<td className="num">{h.constant.toFixed(1)}</td>
										<td className="num" data-lead={h.diff > 0 || undefined}>
											{h.a.acc.toFixed(2)}%
										</td>
										<td className="num" data-lead={h.diff < 0 || undefined}>
											{h.b.acc.toFixed(2)}%
										</td>
										<td className="num">
											{h.diff
												? `${h.diff > 0 ? "A +" : "B +"}${Math.abs(h.diff).toFixed(2)}`
												: "="}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="callout">{t.none}</p>
				)}
				{rows.length > shown ? (
					<button
						type="button"
						className="btn btn-ghost data-more"
						onClick={() => setShown((n) => n + STEP)}
					>
						{fill(t.more, { n: Math.min(STEP, rows.length - shown) })}
					</button>
				) : null}
			</section>

			<section className="song-section" aria-labelledby={`${ids}-best`}>
				<h2 id={`${ids}-best`}>{t.bestTitle}</h2>
				<div className="cmp-best">
					{(
						[
							[a, result.best.a],
							[b, result.best.b],
						] as const
					).map(([side, list]) => (
						<div key={side === a ? "a" : "b"}>
							<h3>{side.name}</h3>
							<ol>
								{list.map((r) => (
									<li key={`${r[0]}:${r[1]}`}>
										<span className="cmp-best-song">{nameOf(r[0])}</span>
										<span className={`chart-level chart-level-${r[1]}`}>
											{r[1]}
										</span>
										<span className="cmp-best-acc">{r[2].toFixed(2)}%</span>
										<span className="cmp-best-rks">{r[6].toFixed(2)}</span>
									</li>
								))}
							</ol>
						</div>
					))}
				</div>
			</section>
		</>
	);
}
