"use client";

import {
	type KeyboardEvent,
	type MouseEvent,
	type PointerEvent,
	type Ref,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { CaretLeft, CaretRight, DeviceMobile } from "@/components/icons";
import { localeTag } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { MOTION_START, motionStep } from "@/lib/deck-motion";
import { readLocal, writeLocal } from "@/lib/local-store";
import type { Pgti } from "@/lib/pgti";
import {
	type DeckCard,
	deckCards,
	type ReplayInput,
	type ReplayMark,
} from "@/lib/review-deck";
import type { WrappedDay, WrappedTile } from "@/lib/wrapped";
import { fill } from "@/phi/lib/card-i18n";
import { DeckFace, deckTitle } from "./DeckCards";
import { type DeckData, REDUCE, vars } from "./DeckParts";

export type DeckHandle = {
	showCard: (card: DeckCard) => void;
	deal: () => void;
};

const THROW_PX = 96;
const THROW_SPEED = 0.55;
const FLICK_PX = 32;
const SLOP = 6;
const HOLD = "button, a, [data-hold]";
const TURNS = [-2.2, 1.6, -1.2, 2.4, -1.8, 1.3];
const FRESH_MS = 900;
const RAIN = 26;
const MOTION_KEY = "phi-deck-motion";

type Motion = "none" | "off" | "ask" | "on";
type Asking = { requestPermission?: () => Promise<string> };

type Judgement = "PERFECT" | "GOOD";

type Drag = {
	id: number;
	x: number;
	y: number;
	t: number;
	dx: number;
	moved: boolean;
	el: HTMLElement;
};

function watchMotion(notify: () => void) {
	const query = window.matchMedia(REDUCE);
	query.addEventListener("change", notify);
	return () => query.removeEventListener("change", notify);
}

const prefersStill = () => window.matchMedia(REDUCE).matches;
const stillOnServer = () => false;

type Turned = { orientation?: { angle?: number } | number };

function watchTurn(notify: () => void) {
	const turning = (screen as { orientation?: EventTarget }).orientation;
	window.addEventListener("orientationchange", notify);
	turning?.addEventListener?.("change", notify);
	return () => {
		window.removeEventListener("orientationchange", notify);
		turning?.removeEventListener?.("change", notify);
	};
}

function heldNatural(): boolean {
	const now = (screen as Turned).orientation;
	const old = (window as Turned).orientation;
	if (now && typeof now === "object") return (now.angle ?? 0) === 0;
	return (typeof old === "number" ? old : 0) === 0;
}

const naturalOnServer = () => true;

function asksFirst(): boolean {
	return (
		typeof DeviceOrientationEvent !== "undefined" &&
		typeof (DeviceOrientationEvent as unknown as Asking).requestPermission ===
			"function"
	);
}

export function ReviewDeck({
	year,
	replay,
	tiles,
	pgti,
	ref,
	onWhy,
	onSkip,
}: {
	year: number;
	replay: ReplayInput;
	tiles: readonly WrappedTile[];
	pgti: Pgti | null;
	ref?: Ref<DeckHandle>;
	onWhy: () => void;
	onSkip: () => void;
}) {
	const { m, locale } = useI18n();
	const d = m.wrapped.deck;
	const still = useSyncExternalStore(watchMotion, prefersStill, stillOnServer);
	const natural = useSyncExternalStore(watchTurn, heldNatural, naturalOnServer);
	const cards = useMemo(
		() => deckCards({ replay, tiles, hasType: pgti !== null }),
		[replay, tiles, pgti],
	);
	const last = cards.length - 1;
	const [at, setAt] = useState(0);
	const [sides, setSides] = useState<Record<number, number>>({});
	const [hit, setHit] = useState<{ id: number; word: Judgement } | null>(null);
	const [combo, setCombo] = useState(0);
	const [perfects, setPerfects] = useState(0);
	const [deal, setDeal] = useState(0);
	const [fresh, setFresh] = useState(true);
	const hits = useRef(0);
	const [motion, setMotion] = useState<Motion>("none");
	const [sensed, setSensed] = useState(false);
	const [asks, setAsks] = useState(false);
	const pile = useRef<HTMLDivElement>(null);
	const live = useRef({
		at: 0,
		last: 0,
		go: (_to: number, _side: number) => {},
	});
	const settling = useRef<number | undefined>(undefined);
	const root = useRef<HTMLElement>(null);
	const drag = useRef<Drag | null>(null);
	const dragged = useRef(false);

	const go = useCallback(
		(to: number, side = -1, word: Judgement = "GOOD") => {
			const next = Math.min(last, Math.max(0, to));
			if (next > at) {
				setSides((old) => {
					const out = { ...old };
					for (let i = at; i < next; i++) out[i] = side;
					return out;
				});
			}
			if (next === at + 1) {
				hits.current += 1;
				setHit({ id: hits.current, word });
				setCombo((n) => n + 1);
				if (word === "PERFECT") setPerfects((n) => n + 1);
			} else if (next !== at) {
				setHit(null);
				setCombo(0);
				setPerfects(0);
			}
			setAt(next);
		},
		[at, last],
	);

	useEffect(() => {
		live.current = {
			at,
			last,
			go: (to: number, side: number) => go(to, side, "PERFECT"),
		};
	}, [at, last, go]);

	useEffect(() => {
		if (typeof DeviceOrientationEvent === "undefined") return;
		if (!window.matchMedia("(pointer: coarse)").matches || prefersStill())
			return;
		const first = asksFirst();
		setAsks(first);
		setMotion(readLocal(MOTION_KEY) === "off" ? "off" : first ? "ask" : "on");
	}, []);

	const tilting = motion === "on" && sensed && natural;

	useEffect(() => {
		if (motion === "none" || !natural) return;
		if (motion === "off" && sensed) return;
		const follow = motion === "on";
		const el = pile.current;
		let state = MOTION_START;
		let frame = 0;
		let known = sensed;
		const paint = () => {
			frame = 0;
			el?.style.setProperty("--mx", state.x.toFixed(3));
			el?.style.setProperty("--my", state.y.toFixed(3));
		};
		const onTilt = (e: DeviceOrientationEvent) => {
			if (e.alpha === null || e.beta === null || e.gamma === null) return;
			if (!known) {
				known = true;
				setSensed(true);
			}
			if (motion === "ask") setMotion("on");
			if (!follow) return;
			const out = motionStep(state, {
				t: e.timeStamp,
				alpha: e.alpha,
				beta: e.beta,
				gamma: e.gamma,
			});
			state = out.state;
			if (!frame) frame = requestAnimationFrame(paint);
			if (!out.flick || drag.current || document.hidden) return;
			const box = root.current?.getBoundingClientRect();
			if (!box || box.bottom < 0 || box.top > window.innerHeight) return;
			const { at: now, last: end, go: move } = live.current;
			if (now < end) move(now + 1, out.flick);
		};
		window.addEventListener("deviceorientation", onTilt);
		return () => {
			window.removeEventListener("deviceorientation", onTilt);
			cancelAnimationFrame(frame);
			el?.style.removeProperty("--mx");
			el?.style.removeProperty("--my");
		};
	}, [motion, natural, sensed]);

	const toggleMotion = async () => {
		const next = tilting ? "off" : "on";
		if (next === "on" && asksFirst()) {
			const asking = DeviceOrientationEvent as unknown as Asking;
			const answer = await asking.requestPermission?.().catch(() => "denied");
			if (answer !== "granted") {
				setMotion("none");
				return;
			}
		}
		writeLocal(MOTION_KEY, next);
		setMotion(next);
	};

	const settle = useCallback(() => {
		window.clearTimeout(settling.current);
		settling.current = window.setTimeout(() => setFresh(false), FRESH_MS);
	}, []);

	const again = useCallback(() => {
		setAt(0);
		setHit(null);
		setCombo(0);
		setPerfects(0);
		setDeal((n) => n + 1);
		setFresh(true);
		settle();
	}, [settle]);

	useEffect(() => {
		settle();
		return () => window.clearTimeout(settling.current);
	}, [settle]);

	const finish =
		last > 0 && at === last && combo >= last
			? perfects >= last
				? "ALL PERFECT"
				: "FULL COMBO"
			: null;

	const data = useMemo<DeckData>(() => {
		const tag = localeTag(locale);
		const dayFormat = new Intl.DateTimeFormat(tag, {
			month: "short",
			day: "numeric",
			timeZone: "UTC",
		});
		const monthFormat = new Intl.DateTimeFormat(tag, {
			month: "short",
			timeZone: "UTC",
		});
		const short = (day: string) =>
			dayFormat.format(new Date(`${day}T00:00:00Z`));
		const marks: Partial<Record<ReplayMark["kind"], ReplayMark>> = {};
		for (const mark of replay.marks) marks[mark.kind] = mark;
		return {
			year,
			replay,
			tiles,
			pgti,
			marks,
			finish,
			monthName: (month) =>
				monthFormat.format(new Date(Date.UTC(2024, month - 1, 1))),
			line: (day: WrappedDay) => {
				const parts = [
					fill(day.charts === 1 ? d.dayOne : d.day, {
						day: short(day.day),
						n: day.charts,
					}),
				];
				if (day.ap > 0) parts.push(fill(d.ap, { n: day.ap }));
				if (day.fc > 0) parts.push(fill(d.fc, { n: day.fc }));
				return parts.join(" · ");
			},
			why: onWhy,
			skip: onSkip,
			again,
		};
	}, [year, replay, tiles, pgti, locale, d, onWhy, onSkip, again, finish]);

	useImperativeHandle(
		ref,
		() => ({
			showCard(card) {
				const index = cards.indexOf(card);
				if (index < 0) return;
				go(index);
				root.current?.scrollIntoView({
					block: "center",
					behavior: prefersStill() ? "auto" : "smooth",
				});
				root.current?.focus({ preventScroll: true });
			},
			deal() {
				again();
				root.current?.scrollIntoView({
					block: "center",
					behavior: prefersStill() ? "auto" : "smooth",
				});
			},
		}),
		[cards, go, again],
	);

	const onDown = (e: PointerEvent<HTMLDivElement>) => {
		dragged.current = false;
		if (still || e.button !== 0) return;
		if ((e.target as HTMLElement).closest(HOLD)) return;
		drag.current = {
			id: e.pointerId,
			x: e.clientX,
			y: e.clientY,
			t: e.timeStamp,
			dx: 0,
			moved: false,
			el: e.currentTarget,
		};
	};

	const onMove = (e: PointerEvent<HTMLDivElement>) => {
		const g = drag.current;
		if (!g || g.id !== e.pointerId) return;
		const dx = e.clientX - g.x;
		const dy = e.clientY - g.y;
		if (!g.moved) {
			if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
			if (Math.abs(dy) > Math.abs(dx)) {
				drag.current = null;
				return;
			}
			g.moved = true;
			g.el.setPointerCapture(e.pointerId);
			g.el.style.transition = "none";
		}
		g.dx = dx;
		g.el.style.transform = `translate(${dx.toFixed(1)}px, ${(dy * 0.2).toFixed(1)}px) rotate(${(dx * 0.05).toFixed(2)}deg)`;
	};

	const onUp = (e: PointerEvent<HTMLDivElement>) => {
		const g = drag.current;
		if (!g || g.id !== e.pointerId) return;
		drag.current = null;
		if (!g.moved) return;
		dragged.current = true;
		const speed = Math.abs(g.dx) / Math.max(1, e.timeStamp - g.t);
		const thrown =
			e.type === "pointerup" &&
			at < last &&
			(Math.abs(g.dx) > THROW_PX ||
				(Math.abs(g.dx) > FLICK_PX && speed > THROW_SPEED));
		g.el.style.transition = "";
		g.el.style.transform = "";
		if (thrown) go(at + 1, g.dx < 0 ? -1 : 1, "PERFECT");
	};

	const onCard = (e: MouseEvent<HTMLDivElement>) => {
		if (dragged.current) {
			dragged.current = false;
			return;
		}
		if ((e.target as HTMLElement).closest(HOLD)) return;
		if (at < last) go(at + 1);
	};

	const onKey = (e: KeyboardEvent<HTMLElement>) => {
		if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
		if (e.key === "ArrowRight") {
			e.preventDefault();
			go(at + 1);
		} else if (e.key === "ArrowLeft") {
			e.preventDefault();
			go(at - 1);
		}
	};

	const top = cards[at] ?? "cover";
	const count = fill(d.count, { n: at + 1, total: cards.length });

	return (
		<section
			ref={root}
			className="dk"
			aria-roledescription="carousel"
			aria-label={fill(d.label, { year })}
			tabIndex={-1}
			onKeyDown={onKey}
		>
			<ol className="dk-steps" aria-hidden="true">
				{cards.map((kind, i) => (
					<li
						key={kind}
						data-kind={kind}
						data-done={i <= at ? "" : undefined}
					/>
				))}
			</ol>
			<div
				key={deal}
				ref={pile}
				className="dk-pile"
				data-fresh={fresh ? "" : undefined}
			>
				{cards.map((kind, i) => {
					const pos = i - at;
					if (pos < -1 || pos > 2) return null;
					const here = pos === 0;
					return (
						// biome-ignore lint/a11y/useSemanticElements lint/a11y/useKeyWithClickEvents: a slide of a carousel, not a form group; a tap on it is a shortcut for the Next button and the arrow keys
						<div
							key={kind}
							className="dk-card"
							data-kind={kind}
							data-pos={pos}
							role="group"
							aria-roledescription="slide"
							aria-label={fill(d.count, { n: i + 1, total: cards.length })}
							inert={!here}
							style={vars({
								"--side": sides[i] ?? -1,
								"--turn": `${TURNS[i % TURNS.length]}deg`,
							})}
							onPointerDown={here ? onDown : undefined}
							onPointerMove={here ? onMove : undefined}
							onPointerUp={here ? onUp : undefined}
							onPointerCancel={here ? onUp : undefined}
							onClick={here ? onCard : undefined}
						>
							<DeckFace kind={kind} data={data} n={i + 1} active={here} />
						</div>
					);
				})}
				{hit ? (
					<p
						key={`hit-${hit.id}`}
						className="dk-judge"
						data-word={hit.word}
						aria-hidden="true"
					>
						{hit.word}
					</p>
				) : null}
				{combo > 1 ? (
					<p key={`combo-${combo}`} className="dk-combo" aria-hidden="true">
						{combo}
						<span>COMBO</span>
					</p>
				) : null}
			</div>
			<div className="dk-ctl">
				<button
					type="button"
					className="btn btn-ghost dk-nav"
					onClick={() => go(at - 1)}
					disabled={at === 0}
					aria-label={d.prev}
					title={d.prev}
				>
					<CaretLeft size={18} weight="bold" aria-hidden />
				</button>
				<p className="dk-count" aria-hidden="true">
					{at + 1} / {cards.length}
				</p>
				<button
					type="button"
					className="btn dk-nav"
					onClick={() => go(at + 1)}
					disabled={at === last}
					aria-label={d.next}
					title={d.next}
				>
					<CaretRight size={18} weight="bold" aria-hidden />
				</button>
			</div>
			{motion !== "none" && natural && (sensed || asks) ? (
				<button
					type="button"
					className="btn btn-ghost btn-sm dk-motion"
					aria-pressed={tilting}
					onClick={toggleMotion}
				>
					<DeviceMobile size={18} aria-hidden />
					{d.motion}
				</button>
			) : null}
			{finish ? (
				<span key={deal} className="dk-rain" aria-hidden="true">
					{Array.from({ length: RAIN }, (_, k) => k).map((k) => (
						<i
							key={k}
							style={vars({
								"--x": `${((k * 37) % 100) - 0}%`,
								"--wait": `${(k % 9) * 90}ms`,
								"--spin": `${(k % 2 ? -1 : 1) * (200 + (k % 5) * 70)}deg`,
							})}
						/>
					))}
				</span>
			) : null}
			<p className="sr-only" role="status" aria-live="polite">
				{count}: {deckTitle(top, m, data)}
			</p>
		</section>
	);
}
