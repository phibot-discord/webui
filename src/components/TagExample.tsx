"use client";

import Link from "@/components/LocaleLink";
import { useI18n } from "@/i18n/provider";
import { songPath } from "@/lib/song-path";
import type { TagExample as Example } from "@/lib/tag-example";
import { fill, localizeChartTagName } from "@/phi/lib/card-i18n";

const MINUS = "−";

function num(n: number, d = 2): string {
	const s = Math.abs(n).toFixed(d);
	return n < 0 && Number(s) !== 0 ? `${MINUS}${s}` : s;
}

function sg(n: number, d = 2): string {
	const s = Math.abs(n).toFixed(d);
	if (Number(s) === 0) return s;
	return `${n < 0 ? MINUS : "+"}${s}`;
}

const STEPS = [
	"pool",
	"lost",
	"gap",
	"share",
	"average",
	"net",
	"centre",
	"shown",
	"read",
	"listed",
] as const;

export function TagExample({
	example,
	voted,
}: {
	example: Example;
	voted: string;
}) {
	const { locale, m } = useI18n();
	const t = m.tags;
	const tags = example.tags.map((name) => localizeChartTagName(name, locale));
	const [a, b, c] = example.rows;
	if (!a || !b || !c) return null;
	const dropped = example.rows.flatMap((row) =>
		row.votes.flatMap((v, j) =>
			v > 0 && row.shares[j] === 0 ? [{ row, j, v }] : [],
		),
	)[0];
	const used = (j: number) => example.rows.filter((r) => r.shares[j]! > 0);
	const average = (j: number) => {
		const rows = used(j);
		const terms = rows
			.map((r) => `${num(r.shares[j]!)} × ${sg(r.d)}`)
			.join(" + ");
		return `A(${tags[j]}) = (${terms}) ÷ (${num(example.sumShare[j]!)} + ${example.prior}) = ${sg(example.average[j]!)}`;
	};
	const more = Math.round((10 ** -example.net[1] - 1) * 100);
	const less = Math.round((1 - 10 ** -example.net[0]) * 100);
	const names = {
		a: a.title,
		b: b.title,
		c: c.title,
		x: tags[0]!,
		y: tags[1]!,
	};
	const formulas: Record<(typeof STEPS)[number], string[]> = {
		pool: [
			`F = ${example.floor.toFixed(2)} → C ≥ ${example.min.toFixed(1)}`,
			"w = 1",
		],
		lost: [`y = −log10(1 − ${(a.acc / 100).toFixed(4)}) = ${num(a.y)}`],
		gap: [`d = ${num(a.y)} − ${num(a.curve)} = ${sg(a.d)}`],
		share: [
			...b.votes.map(
				(v, j) => `${tags[j]}: ${v} ÷ ${b.total} = ${num(b.shares[j]!)}`,
			),
			...(dropped
				? [
						`${tags[dropped.j]}: ${dropped.v} ÷ ${dropped.row.total} = ${num(dropped.v / dropped.row.total)} < ${num(example.minShare)}`,
					]
				: []),
		],
		average: [average(0), average(1)],
		net: example.beta.map((v, j) => `β(${tags[j]}) = ${sg(v)}`),
		centre: example.beta.map(
			(v, j) =>
				`β(${tags[j]}) = ${sg(v)} − (${sg(example.shift)}) = ${sg(example.centred[j]!)}`,
		),
		shown: example.centred.map(
			(v, j) =>
				`${tags[j]}: ${sg(v)} × ${num(example.meanShare[j]!)} = ${sg(example.net[j]!)}`,
		),
		read: [
			`10^${num(-example.net[1], 3)} ≈ ${num(10 ** -example.net[1])}`,
			`10^${num(-example.net[0], 3)} ≈ ${num(10 ** -example.net[0])}`,
		],
		listed: [],
	};
	const texts: Record<
		(typeof STEPS)[number],
		Record<string, string | number>
	> = {
		pool: { floor: example.floor.toFixed(2), min: example.min.toFixed(1) },
		lost: {},
		gap: names,
		share: dropped
			? {
					...names,
					tag: tags[dropped.j]!,
					v: dropped.v,
					n: dropped.row.total,
				}
			: names,
		average: {},
		net: names,
		centre: {},
		shown: {},
		read: {
			...names,
			ny: sg(example.net[1]),
			nx: sg(example.net[0]),
			more,
			less,
		},
		listed: {},
	};
	return (
		<section
			className="tag-cat tag-guide"
			id="example"
			aria-labelledby="example-h"
		>
			<div className="tag-cat-head">
				<h3 id="example-h">{t.exampleTitle}</h3>
			</div>
			<p className="tag-example-lede">{fill(t.exampleLede, { date: voted })}</p>
			<div className="data-scroll tag-example-scroll">
				<table className="data-table tag-example-table">
					<caption className="sr-only">{t.exampleCaption}</caption>
					<thead>
						<tr>
							<th scope="col">{t.exampleChart}</th>
							<th scope="col" className="num">
								C
							</th>
							<th scope="col" className="num">
								{t.exampleAcc}
							</th>
							<th scope="col" className="num">
								y
							</th>
							<th scope="col" className="num">
								g(C)
							</th>
							<th scope="col" className="num">
								d
							</th>
							{tags.map((name) => (
								<th key={name} scope="col" className="num">
									{name}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{example.rows.map((r) => (
							<tr key={r.id}>
								<th scope="row" className="data-song">
									<Link href={songPath(r.id)} prefetch={false}>
										{r.title}
									</Link>{" "}
									<span className={`chart-level chart-level-${r.level}`}>
										{r.level}
									</span>
								</th>
								<td className="num">{r.c.toFixed(1)}</td>
								<td className="num">{`${r.acc.toFixed(2)}%`}</td>
								<td className="num">{num(r.y)}</td>
								<td className="num">{num(r.curve)}</td>
								<td className="num">{sg(r.d)}</td>
								{r.shares.map((share, j) => (
									<td key={tags[j]} className="num">
										{share > 0 ? num(share) : "–"}
										<small className="tag-example-votes">{`${r.votes[j]}/${r.total}`}</small>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<dl className="tag-formula tag-example-steps">
				{STEPS.map((step) => {
					const copy = t.exampleSteps[step];
					return (
						<div key={step}>
							<dt>{copy.term}</dt>
							<dd>
								{formulas[step].map((f) => (
									<code key={f}>{f}</code>
								))}
								<span>{fill(copy.text, texts[step])}</span>
							</dd>
						</div>
					);
				})}
			</dl>
		</section>
	);
}
