"use client";

import { type CSSProperties, type Ref, useId, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import type { PgtiAxis, PgtiLetter } from "@/i18n/tools-messages";
import type { Pgti } from "@/lib/pgti";
import { fill } from "@/phi/lib/card-i18n";
import { useEnter } from "./useEnter";

type Axis = {
	axis: PgtiAxis;
	letter: PgtiLetter;
	left: PgtiLetter;
	right: PgtiLetter;
	share: number;
	tick: number;
	vars: Record<string, string | number>;
};

const unit = (n: number) =>
	Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;

const part = (a: number, b: number) => (b > 0 ? unit(a / b) : 0);

const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(4)}`;

function axesOf(p: Pgti): Axis[] {
	const drive: Axis[] = p.drive
		? [
				{
					axis: "drive",
					letter: p.drive.letter,
					left: "K",
					right: "G",
					share: unit(p.drive.gain + 0.25),
					tick: 0.5,
					vars: { gain: signed(p.drive.gain) },
				},
			]
		: [];
	return [
		{
			axis: "aim",
			letter: p.aim.letter,
			left: "R",
			right: "P",
			share: unit((p.aim.acc - 95) / 5),
			tick: 0.6,
			vars: { acc: p.aim.acc.toFixed(2) },
		},
		{
			axis: "range",
			letter: p.range.letter,
			left: "F",
			right: "E",
			share: part(p.range.played, p.range.total),
			tick: 0.6,
			vars: { played: p.range.played, total: p.range.total },
		},
		{
			axis: "grip",
			letter: p.grip.letter,
			left: "W",
			right: "S",
			share: part(p.grip.fc, p.grip.total),
			tick: 0.5,
			vars: { fc: p.grip.fc, total: p.grip.total },
		},
		{
			axis: "pace",
			letter: p.pace.letter,
			left: "B",
			right: "M",
			share: part(p.pace.months, p.pace.total),
			tick: 0.6,
			vars: { months: p.pace.months, total: p.pace.total },
		},
		...drive,
	];
}

export function PgtiCard({
	pgti,
	titleRef,
	rolling,
}: {
	pgti: Pgti | null;
	titleRef?: Ref<HTMLHeadingElement>;
	rolling?: boolean;
}) {
	const { m } = useI18n();
	const t = m.wrapped.pgti;
	const id = useId();
	return (
		<section className="pgti" aria-labelledby={`${id}-title`}>
			<h3
				ref={titleRef}
				id={`${id}-title`}
				className="pgti-title"
				tabIndex={-1}
			>
				{t.title}
			</h3>
			{pgti ? (
				<>
					<p className="pgti-sub">{t.sub}</p>
					<PgtiType pgti={pgti} panel={`${id}-panel`} rolling={rolling} />
				</>
			) : (
				<p className="pgti-none">{t.none}</p>
			)}
		</section>
	);
}

function PgtiType({
	pgti,
	panel,
	rolling,
}: {
	pgti: Pgti;
	panel: string;
	rolling?: boolean;
}) {
	const { m } = useI18n();
	const t = m.wrapped.pgti;
	const [pick, setPick] = useState(0);
	const card = useRef<HTMLDivElement>(null);
	const enter = useEnter(card);
	const axes = axesOf(pgti);
	const code =
		`${pgti.aim.letter}${pgti.range.letter}${pgti.grip.letter}${pgti.pace.letter}` as const;
	const shown = axes[pick] ?? axes[0]!;
	return (
		<div ref={card} className="pgti-card" data-enter={enter ?? undefined}>
			<div className="pgti-face">
				<div
					className="pgti-letters"
					style={{ "--n": axes.length } as CSSProperties}
				>
					{axes.map((a, i) => (
						<button
							key={a.axis}
							type="button"
							className="pgti-letter"
							data-axis={a.axis}
							aria-pressed={i === pick}
							aria-controls={panel}
							style={{ "--i": i } as CSSProperties}
							onClick={() => setPick(i)}
						>
							<span className="pgti-glyph">{a.letter}</span>
							<span className="pgti-pole">{t.poles[a.letter]}</span>
						</button>
					))}
				</div>
				<p className="pgti-name">{t.names[code]}</p>
				<dl className="pgti-groups">
					<div>
						<dt>{t.family}</dt>
						<dd>
							<b>{t.families[pgti.family].name}</b>
							{t.families[pgti.family].line}
						</dd>
					</div>
					<div>
						<dt>{t.style}</dt>
						<dd>
							<b>{t.styles[pgti.style].name}</b>
							{t.styles[pgti.style].line}
						</dd>
					</div>
				</dl>
			</div>
			<div id={panel} className="pgti-panel" aria-live="polite">
				<p className="pgti-axis">{t.axes[shown.axis]}</p>
				<div className="pgti-scale">
					<span
						className="pgti-end"
						data-own={shown.letter === shown.left ? "" : undefined}
					>
						{t.poles[shown.left]}
					</span>
					<span
						className="pgti-track"
						style={
							{
								"--at": shown.share.toFixed(4),
								"--tick": shown.tick,
							} as CSSProperties
						}
					>
						<span className="pgti-tick" />
						<span className="pgti-rail">
							<span className="pgti-marker" />
						</span>
					</span>
					<span
						className="pgti-end"
						data-own={shown.letter === shown.right ? "" : undefined}
					>
						{t.poles[shown.right]}
					</span>
				</div>
				<p className="pgti-trait">
					{(rolling &&
					(shown.letter === "M" || shown.letter === "G" || shown.letter === "K")
						? t.rolling.traits[shown.letter]
						: undefined) ?? t.traits[shown.letter]}
				</p>
				<p className="pgti-fact">
					{fill(
						rolling && shown.axis === "drive"
							? t.rolling.drive
							: t.facts[shown.axis],
						shown.vars,
					)}
				</p>
			</div>
		</div>
	);
}
