"use client";

import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { localeTag } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";
import type { CollectionLang } from "@/lib/collection";
import {
	DED_FPS,
	type DedSoundEvent,
	type DedSoundId,
	type Deduction as DeductionData,
	DeductionSim,
	type DedView,
	dedText,
} from "@/lib/deduction";
import { keyed } from "@/lib/texts";
import {
	CutCount,
	CutEnd,
	CutLangSelect,
	CutRestart,
	CutStart,
	CutToggles,
	makeSound,
	replay,
	useFullscreen,
} from "./CutControls";
import { type DeductionArt, DeductionStage } from "./DeductionStage";

export type DeductionView = {
	data: DeductionData;
	art: DeductionArt;
	sounds: Partial<Record<DedSoundId, string>>;
	typing: string | null;
};

const MAX_CATCH_UP = 12;
const TYPING_VOICES = 3;

type Voices = {
	ambient?: HTMLAudioElement;
	effects: Partial<Record<DedSoundId, HTMLAudioElement>>;
	typing: HTMLAudioElement[];
};

function isField(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		Boolean(target.closest("select, input, textarea, button, a"))
	);
}

export function Deduction({
	view,
	t: copy,
}: {
	view: DeductionView;
	t: Pick<Messages, "c9s6" | "deduction">;
}) {
	const { locale } = useI18n();
	const t = copy.c9s6;
	const d = copy.deduction;
	const ids = useId();
	const player = useRef<HTMLDivElement>(null);
	const sim = useRef<DeductionSim | null>(null);
	const clock = useRef<{ start: number } | null>(null);
	const taps = useRef(0);
	const voices = useRef<Voices | null>(null);
	const [lang, setLang] = useState<CollectionLang>(localeTag(locale));
	const [shown, setShown] = useState<DedView | null>(null);
	const [soundOn, setSoundOn] = useState(true);
	const fullscreen = useFullscreen(player);
	const soundRef = useRef(soundOn);
	soundRef.current = soundOn;
	const total = view.data.pages.length;
	const started = shown !== null;
	const ended = shown?.ended ?? false;

	const ensureVoices = useCallback(() => {
		if (voices.current) return voices.current;
		const effects: Voices["effects"] = {};
		for (const [id, src] of Object.entries(view.sounds)) {
			if (id !== "ambient" && src) effects[id as DedSoundId] = makeSound(src);
		}
		voices.current = {
			ambient: view.sounds.ambient
				? makeSound(view.sounds.ambient, 1, true)
				: undefined,
			effects,
			typing: view.typing
				? Array.from({ length: TYPING_VOICES }, () =>
						makeSound(view.typing ?? ""),
					)
				: [],
		};
		return voices.current;
	}, [view.sounds, view.typing]);

	const play = useCallback((events: DedSoundEvent[]) => {
		const all = voices.current;
		if (!all || !soundRef.current) return;
		for (const event of events) {
			if (event.kind === "typing")
				replay(all.typing[event.voice % all.typing.length]);
			else replay(all.effects[event.sound]);
		}
	}, []);

	const stopAll = useCallback(() => {
		const all = voices.current;
		if (!all) return;
		for (const el of [
			all.ambient,
			...Object.values(all.effects),
			...all.typing,
		])
			el?.pause();
	}, []);

	useEffect(() => {
		if (!started || ended) return;
		let raf = 0;
		const tick = (now: number) => {
			const s = sim.current;
			const c = clock.current;
			if (!s || !c) return;
			let target = Math.floor(((now - c.start) * DED_FPS) / 1000);
			if (target - s.at > MAX_CATCH_UP) {
				c.start = now - (s.at * 1000) / DED_FPS;
				target = s.at + 1;
			}
			const events: DedSoundEvent[] = [];
			while (s.at < target) {
				const tap = taps.current > 0;
				taps.current = 0;
				events.push(...s.step(tap));
			}
			play(events);
			const next = s.view();
			const ambient = voices.current?.ambient;
			if (ambient) {
				ambient.volume = Math.min(1, Math.max(0, next.ambient));
				if (soundRef.current && ambient.paused && !next.ended) {
					ambient.play().catch(() => undefined);
				}
			}
			setShown(next);
			if (next.ended) {
				stopAll();
				return;
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [started, ended, play, stopAll]);

	useEffect(() => () => stopAll(), [stopAll]);

	useEffect(() => {
		if (sim.current) sim.current.lang = lang;
	}, [lang]);

	const begin = () => {
		stopAll();
		const s = new DeductionSim(view.data, lang);
		sim.current = s;
		taps.current = 0;
		clock.current = { start: performance.now() };
		ensureVoices();
		setShown(s.view());
		player.current?.focus();
	};

	const tap = () => {
		if (!started || ended) return;
		taps.current += 1;
	};

	const toggleSound = () => {
		const on = !soundOn;
		setSoundOn(on);
		if (!on) stopAll();
	};

	const page = shown?.page ?? 0;
	const spoken = shown
		? shown.lines
				.filter((line) => line.shown === line.full.length)
				.map((line) => line.full)
		: [];
	const langId = `${ids}-lang`;
	const hintId = `${ids}-hint`;
	const script = useMemo(
		() => (
			<details className="coll-variant cut-script">
				<summary>{t.script}</summary>
				<ol className="cut-script-list">
					{keyed(
						view.data.pages.map((p) =>
							p.lines.map((line) => dedText(line, lang)),
						),
						(lines) => lines.join("\n"),
					).map(({ key, item: lines }) => (
						<li key={key}>
							{keyed(lines, (line) => line).map(({ key: at, item: line }) => (
								<p key={at} lang={lang}>
									{line}
								</p>
							))}
						</li>
					))}
				</ol>
			</details>
		),
		[view.data.pages, lang, t.script],
	);

	return (
		<>
			{/* biome-ignore lint/a11y/useSemanticElements: a player around the stage and its controls, not a form, so a labelled group */}
			<div
				ref={player}
				className="cut-player ded-player"
				role="group"
				aria-label={d.player}
				aria-describedby={hintId}
				tabIndex={-1}
				data-full={fullscreen.full ? "true" : undefined}
				onKeyDown={(event) => {
					if (event.altKey || event.ctrlKey || event.metaKey) return;
					if (![" ", "Enter", "ArrowRight"].includes(event.key)) return;
					if (isField(event.target)) return;
					event.preventDefault();
					tap();
				}}
			>
				<div
					className="cut-stage ded-stage"
					data-phase={started ? (ended ? "end" : "play") : "start"}
				>
					{shown ? (
						<DeductionStage art={view.art} view={shown} />
					) : (
						<div className="ded-canvas" />
					)}
					<button
						type="button"
						className="cut-hit"
						tabIndex={-1}
						aria-hidden="true"
						disabled={!started || ended}
						onPointerDown={(event) => {
							if (event.button === 0) tap();
						}}
					/>
					{!started ? (
						<CutStart t={t} onPlay={begin} note={d.startNote} />
					) : null}
					{ended ? <CutEnd t={t} onReplay={begin} /> : null}
				</div>
				<p id={hintId} className="sr-only">
					{d.stageHint}
				</p>
				<p className="sr-only" aria-live="polite">
					{ended ? t.ended : spoken.join(" ")}
				</p>
				<div className="cut-controls">
					<div className="cut-nav">
						<CutCount t={t} page={page} total={total} />
						<CutRestart t={t} disabled={!started} onRestart={begin} />
					</div>
					<div className="cut-options">
						<CutLangSelect id={langId} t={t} lang={lang} onChange={setLang} />
						<CutToggles
							t={t}
							soundOn={soundOn}
							onSound={toggleSound}
							fullscreen={fullscreen}
						/>
					</div>
				</div>
			</div>
			{script}
		</>
	);
}
