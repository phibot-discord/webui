"use client";

import { type PointerEvent, useMemo, useState } from "react";
import { ArrowCounterClockwise } from "@/components/icons";
import { useI18n } from "@/i18n/provider";
import type { PgtiCode } from "@/i18n/tools-messages";
import { calendarMonths, type DeckCard, sparkPoints } from "@/lib/review-deck";
import type { WrappedDay } from "@/lib/wrapped";
import { fill } from "@/phi/lib/card-i18n";
import {
	Burst,
	type DeckData,
	Face,
	Photo,
	Roll,
	signed,
	vars,
	whole,
} from "./DeckParts";

type FaceProps = { data: DeckData; n: number; active: boolean };
type Texts = ReturnType<typeof useI18n>["m"];

const SPARK_W = 300;
const SPARK_H = 96;
const SPARK_PAD = 6;
const PILE_MAX = 12;
const ACC_FLOOR = 85;
const BUSIEST_FROM = 3;

export function deckTitle(kind: DeckCard, m: Texts, data: DeckData): string {
	const t = m.wrapped;
	const label = (i: number) => data.tiles[i]?.label ?? "";
	switch (kind) {
		case "cover":
			return fill(t.title, { year: data.year });
		case "days":
			return label(3);
		case "rks":
			return label(0);
		case "charts":
			return `${label(1)} · ${label(2)}`;
		case "ap":
			return label(4);
		case "fc":
			return label(5);
		case "jump":
			return label(6);
		case "step":
			return label(7);
		case "type":
			return t.pgti.title;
		case "end":
			return fill(t.deck.done, { year: data.year });
	}
}

export function DeckFace({ kind, ...props }: FaceProps & { kind: DeckCard }) {
	switch (kind) {
		case "cover":
			return <Cover {...props} />;
		case "days":
			return <Days {...props} />;
		case "rks":
			return <Rks {...props} />;
		case "charts":
			return <Charts {...props} />;
		case "ap":
			return <Hardest {...props} kind="ap" />;
		case "fc":
			return <Hardest {...props} kind="fc" />;
		case "jump":
			return <Jump {...props} />;
		case "step":
			return <Step {...props} />;
		case "type":
			return <Type {...props} />;
		case "end":
			return <End {...props} />;
	}
}

function Cover({ data, n }: FaceProps) {
	const { m } = useI18n();
	return (
		<Face n={n}>
			<p className="dk-label">{m.wrapped.deck.name}</p>
			<p className="dk-year">{data.year}</p>
			<div className="dk-notes" aria-hidden="true">
				{[0, 1, 2, 3, 4].map((k) => (
					<i key={k} style={vars({ "--k": k })} />
				))}
			</div>
			<p className="dk-line">{m.wrapped.deck.cover}</p>
			<p className="dk-hint">{m.wrapped.deck.hint}</p>
		</Face>
	);
}

type CalendarDay = WrappedDay & { dom: number };

function Days({ data, n, active }: FaceProps) {
	const { m } = useI18n();
	const months = useMemo(() => calendarMonths(data.replay), [data.replay]);
	const total = data.replay.days.length;
	const [pick, setPick] = useState<string | null>(null);
	const picked = pick
		? data.replay.days.find((x) => x.day === pick)
		: undefined;
	const choose = (e: PointerEvent<HTMLDivElement>, days: CalendarDay[]) => {
		const first = days[0];
		if (!first) return;
		const box = e.currentTarget.getBoundingClientRect();
		const dom = ((e.clientX - box.left) / box.width) * 31 + 0.5;
		let best = first;
		for (const x of days)
			if (Math.abs(x.dom - dom) < Math.abs(best.dom - dom)) best = x;
		setPick(best.day);
	};
	const step = Math.min(40, 1200 / Math.max(1, total));
	const busiest = months.reduce(
		(best, month) => (month.days.length > best.days.length ? month : best),
		months[0] ?? { year: 0, month: 1, days: [] },
	);
	let before = 0;
	return (
		<Face n={n}>
			{total >= BUSIEST_FROM && busiest.days.length ? (
				<p className="dk-sticker dk-sticker-corner">
					{fill(m.wrapped.deck.busiest, {
						month: data.monthName(busiest.month),
					})}
				</p>
			) : null}
			<p className="dk-label">{data.tiles[3]?.label}</p>
			<p className="dk-big">
				<Roll value={total} active={active} />
			</p>
			<div
				className="dk-cal"
				aria-hidden="true"
				data-hold=""
				style={vars({ "--step": `${step.toFixed(1)}ms` })}
			>
				{months.map((month) => {
					const from = before;
					before += month.days.length;
					return (
						<div key={`${month.year}-${month.month}`} className="dk-cal-row">
							<span className="dk-cal-month">
								{data.monthName(month.month)}
							</span>
							<div
								className="dk-cal-days"
								onPointerDown={(e) => choose(e, month.days)}
								onPointerMove={(e) => {
									if (e.pointerType === "mouse" || e.buttons)
										choose(e, month.days);
								}}
							>
								{month.days.map((x, i) => (
									<i
										key={x.day}
										data-gold={x.ap > 0 ? "" : undefined}
										data-on={x.day === pick ? "" : undefined}
										style={vars({ "--d": x.dom, "--k": from + i })}
									/>
								))}
							</div>
						</div>
					);
				})}
			</div>
			<p className="dk-note">
				{picked ? data.line(picked) : m.wrapped.deck.daysNote}
			</p>
		</Face>
	);
}

function Rks({ data, n }: FaceProps) {
	const { m } = useI18n();
	const spark = useMemo(
		() => sparkPoints(data.replay, SPARK_W, SPARK_H),
		[data.replay],
	);
	if (!spark) return null;
	const at = spark.points.map(
		([x, y]) => [x, y + SPARK_PAD] as [number, number],
	);
	const line = at
		.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
		.join(" ");
	const head = at[0]!;
	const tail = at.at(-1)!;
	const floor = SPARK_H + SPARK_PAD * 2;
	const delta = spark.start !== null ? spark.end - spark.start : null;
	return (
		<Face n={n}>
			<p className="dk-label">{data.tiles[0]?.label}</p>
			<p className="dk-big dk-big-fit">{spark.end.toFixed(4)}</p>
			{spark.start !== null ? (
				<p className="dk-line dk-figures">
					{spark.start.toFixed(4)} → {spark.end.toFixed(4)}
				</p>
			) : null}
			<svg
				className="dk-spark"
				viewBox={`-8 0 ${SPARK_W + 16} ${floor}`}
				aria-hidden="true"
			>
				{at.length > 1 ? (
					<>
						<path
							className="dk-spark-area"
							d={`${line} L${tail[0].toFixed(1)} ${floor} L${head[0].toFixed(1)} ${floor} Z`}
						/>
						<path className="dk-spark-line" d={line} pathLength={1} />
					</>
				) : null}
				<circle className="dk-spark-dot" cx={tail[0]} cy={tail[1]} r={5.5} />
			</svg>
			{delta !== null ? (
				<p className="dk-sticker">
					{fill(m.wrapped.deck.rksNote, { delta: signed(delta) })}
				</p>
			) : null}
		</Face>
	);
}

function Charts({ data, n, active }: FaceProps) {
	const { m } = useI18n();
	const columns = [1, 2].map((i) => ({
		label: data.tiles[i]?.label ?? "",
		count: whole(data.tiles[i]?.value),
	}));
	return (
		<Face n={n}>
			<div className="dk-pair">
				{columns.map((column, c) => (
					<div
						key={column.label}
						className="dk-stack"
						data-alt={c ? "" : undefined}
					>
						<div className="dk-tiles" aria-hidden="true">
							{Array.from(
								{ length: Math.min(PILE_MAX, column.count) },
								(_, k) => k,
							).map((k) => (
								<i key={k} style={vars({ "--k": k })} />
							))}
						</div>
						<p className="dk-mid">
							<Roll value={column.count} active={active} />
						</p>
						<p className="dk-label">{column.label}</p>
					</div>
				))}
			</div>
			<p className="dk-note">{m.wrapped.deck.chartsNote}</p>
		</Face>
	);
}

function Hardest({ data, n, active, kind }: FaceProps & { kind: "ap" | "fc" }) {
	const { m } = useI18n();
	const mark = data.marks[kind];
	if (!mark) return null;
	return (
		<Face n={n}>
			<p className="dk-label">{mark.label}</p>
			<p className="dk-big">
				<Roll value={whole(mark.big)} active={active} />
			</p>
			{kind === "ap" ? (
				<Burst />
			) : (
				<span className="dk-chain" aria-hidden="true">
					{[0, 1, 2, 3, 4, 5].map((k) => (
						<i key={k} style={vars({ "--k": k })} />
					))}
				</span>
			)}
			<div className="dk-pick">
				<Photo src={mark.jacket} stand={mark.sub.split(" ")[0] ?? ""} />
				<div className="dk-pick-text">
					<p className="dk-kicker">{m.wrapped.deck.hardest}</p>
					<p className="dk-song">{mark.value}</p>
					<p className="dk-level">{mark.sub}</p>
				</div>
			</div>
		</Face>
	);
}

function Jump({ data, n }: FaceProps) {
	const { m } = useI18n();
	const mark = data.marks.jump;
	if (!mark) return null;
	return (
		<Face n={n}>
			<p className="dk-label">{mark.label}</p>
			<p className="dk-big dk-big-fit dk-rise">
				{mark.big}
				<span className="dk-unit">{data.tiles[0]?.label}</span>
			</p>
			<svg className="dk-stairs" viewBox="0 0 200 96" aria-hidden="true">
				<path d="M6 88 H54 V66 H102 V44 H150 V22 H190" pathLength={1} />
				<path
					className="dk-stairs-tip"
					d="M174 8 L192 22 L174 36"
					pathLength={1}
				/>
			</svg>
			<p className="dk-line">{mark.value}</p>
			<p className="dk-note">{m.wrapped.deck.jumpNote}</p>
		</Face>
	);
}

function Step({ data, n }: FaceProps) {
	const { m } = useI18n();
	const mark = data.marks.step;
	if (!mark) return null;
	const acc = mark.acc;
	const width = (value: number) =>
		`${Math.min(100, Math.max(8, ((value - ACC_FLOOR) / (100 - ACC_FLOOR)) * 100)).toFixed(1)}%`;
	return (
		<Face n={n}>
			<p className="dk-label">{mark.label}</p>
			<div className="dk-pick">
				<Photo src={mark.jacket} stand={mark.sub.split(" ")[0] ?? ""} />
				<div className="dk-pick-text">
					<p className="dk-song">{mark.value}</p>
					<p className="dk-level">{mark.sub}</p>
				</div>
			</div>
			{acc ? (
				<div className="dk-acc" aria-hidden="true">
					{acc.before !== null ? (
						<div
							className="dk-acc-row"
							data-was=""
							style={vars({ "--w": width(acc.before) })}
						>
							<span>{acc.before.toFixed(2)}%</span>
						</div>
					) : null}
					<div className="dk-acc-row" style={vars({ "--w": width(acc.after) })}>
						<span>{acc.after.toFixed(2)}%</span>
					</div>
				</div>
			) : null}
			<p className="dk-note">{m.wrapped.deck.stepNote}</p>
		</Face>
	);
}

function Type({ data, n }: FaceProps) {
	const { m } = useI18n();
	const pgti = data.pgti;
	if (!pgti) return null;
	const letters = [
		{ axis: "aim", letter: pgti.aim.letter },
		{ axis: "range", letter: pgti.range.letter },
		{ axis: "grip", letter: pgti.grip.letter },
		{ axis: "pace", letter: pgti.pace.letter },
	];
	const code = letters.map((x) => x.letter).join("") as PgtiCode;
	return (
		<Face n={n}>
			<p className="dk-label">{m.wrapped.pgti.title}</p>
			<p className="dk-line">{m.wrapped.deck.typeLead}</p>
			<p className="dk-code">
				{letters.map((x, k) => (
					<span key={x.axis} style={vars({ "--k": k })}>
						{x.letter}
					</span>
				))}
				{pgti.drive ? (
					<span data-suffix="" style={vars({ "--k": letters.length })}>
						{pgti.drive.letter}
					</span>
				) : null}
			</p>
			<p className="dk-stamp">{m.wrapped.pgti.names[code]}</p>
			<Burst mix delay={1250} />
			<p className="dk-tags">
				<span>{m.wrapped.pgti.families[pgti.family].name}</span>
				<span>{m.wrapped.pgti.styles[pgti.style].name}</span>
			</p>
			<button type="button" className="btn btn-sm dk-btn" onClick={data.why}>
				{m.wrapped.deck.why}
			</button>
		</Face>
	);
}

function End({ data, n }: FaceProps) {
	const { m } = useI18n();
	const d = m.wrapped.deck;
	const start = data.replay.startRks;
	const end = data.replay.rks.at(-1)?.value ?? null;
	return (
		<Face n={n}>
			<Burst mix delay={200} />
			{data.finish ? (
				<p className="dk-stamp dk-finish" aria-hidden="true">
					{data.finish}
				</p>
			) : null}
			<p className="dk-done">{fill(d.done, { year: data.year })}</p>
			{start !== null && end !== null ? (
				<p className="dk-line dk-figures">
					{start.toFixed(4)} → {end.toFixed(4)}
					<b>{signed(end - start)}</b>
				</p>
			) : null}
			<p className="dk-note">{d.bye}</p>
			<div className="dk-actions">
				<button type="button" className="btn btn-sm dk-btn" onClick={data.skip}>
					{d.skip}
				</button>
				<button
					type="button"
					className="btn btn-ghost btn-sm dk-btn"
					onClick={data.again}
				>
					<ArrowCounterClockwise size={14} weight="bold" aria-hidden />
					{d.again}
				</button>
			</div>
		</Face>
	);
}
