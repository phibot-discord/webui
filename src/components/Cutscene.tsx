"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import {
	type CSSProperties,
	Fragment,
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
import type { CutPage, FadeToWhite } from "@/lib/c9s6";
import type { CollectionLang } from "@/lib/collection";
import {
	CUT_START,
	type CutEvent,
	type CutState,
	cutCtx,
	cutStep,
	imageShown,
	pageText,
	plainLines,
	typeOut,
	typing,
} from "@/lib/cutscene";
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
import { marked, RichText } from "./RichText";

export type CutsceneView = {
	pages: CutPage[];
	image: { page: number; entrance: number; src: string } | null;
	video: { src: string; width: number; height: number; fadeIn: number } | null;
	fade: FadeToWhite | null;
	sound: { bgm: string | null; image: string | null; typing: string[] };
};

const CHAR_MS = 32;
const TICK_MS = 80;
const TICK_POOL = 3;
const VOLUME = { bgm: 0.55, image: 0.8, typing: 0.3 };

type Sounds = {
	bgm?: HTMLAudioElement;
	image?: HTMLAudioElement;
	typing: HTMLAudioElement[];
	next: number;
	last: number;
};

function useReducedMotion(): boolean {
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		const sync = () => setReduced(query.matches);
		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, []);
	return reduced;
}

function unlock(el: HTMLAudioElement) {
	el.muted = true;
	el.play().then(
		() => {
			el.pause();
			el.currentTime = 0;
			el.muted = false;
		},
		() => {
			el.muted = false;
		},
	);
}

function isField(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		Boolean(target.closest("select, input, textarea"))
	);
}

export function Cutscene({
	view,
	t,
}: {
	view: CutsceneView;
	t: Messages["c9s6"];
}) {
	const { locale } = useI18n();
	const ids = useId();
	const reduced = useReducedMotion();
	const [lang, setLang] = useState<CollectionLang>(localeTag(locale));
	const [state, setState] = useState<CutState>(CUT_START);
	const [soundOn, setSoundOn] = useState(false);
	const [videoOn, setVideoOn] = useState(false);
	const player = useRef<HTMLDivElement>(null);
	const fullscreen = useFullscreen(player);
	const nextButton = useRef<HTMLButtonElement>(null);
	const replayButton = useRef<HTMLButtonElement>(null);
	const video = useRef<HTMLVideoElement>(null);
	const sounds = useRef<Sounds | null>(null);
	const imageWas = useRef(false);
	const focusNext = useRef(false);

	const texts = useMemo(
		() => view.pages.map((page) => pageText(page, lang)),
		[view.pages, lang],
	);
	const ctx = useMemo(
		() => cutCtx(texts, view.fade, reduced),
		[texts, view.fade, reduced],
	);
	const send = useCallback(
		(event: CutEvent) => setState((s) => cutStep(s, event, ctx)),
		[ctx],
	);

	const started = state.phase !== "start";
	const shown = imageShown(state, view.image?.page);
	const busy = typing(state, ctx);
	const current = texts[state.page];
	const total = view.pages.length;
	const hasSound = Boolean(
		view.sound.bgm || view.sound.image || view.sound.typing.length,
	);

	const tick = useCallback(() => {
		const all = sounds.current;
		if (!soundOn || !all?.typing.length) return;
		const now = performance.now();
		if (now - all.last < TICK_MS) return;
		all.last = now;
		replay(all.typing[all.next % all.typing.length]);
		all.next += 1;
	}, [soundOn]);

	useEffect(() => send({ type: "sync" }), [send]);

	useEffect(() => {
		if (!busy) return;
		const timer = window.setInterval(() => {
			send({ type: "type", chars: 1 });
			tick();
		}, CHAR_MS);
		return () => window.clearInterval(timer);
	}, [busy, send, tick]);

	useEffect(() => {
		const fade = view.fade;
		if (!fade || (state.white !== "in" && state.white !== "out")) return;
		const entering = state.white === "in";
		const timer = window.setTimeout(
			() => send({ type: entering ? "whiteIn" : "whiteOut" }),
			(entering ? fade.in : fade.out) * 1000,
		);
		return () => window.clearTimeout(timer);
	}, [state.white, view.fade, send]);

	useEffect(() => {
		const el = video.current;
		if (!el || !started) return;
		if (el.readyState === 0) el.load();
		if (reduced) {
			el.pause();
			return;
		}
		el.play().catch(() => undefined);
	}, [started, reduced]);

	useEffect(() => {
		const el = sounds.current?.bgm;
		if (!el) return;
		if (soundOn && started) el.play().catch(() => undefined);
		else el.pause();
	}, [soundOn, started]);

	useEffect(() => {
		if (shown && !imageWas.current && soundOn) {
			replay(sounds.current?.image);
		}
		imageWas.current = shown;
	}, [shown, soundOn]);

	useEffect(() => {
		const el = player.current;
		if (!el) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.altKey || event.ctrlKey || event.metaKey) return;
			if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
				if (isField(event.target)) return;
				event.preventDefault();
				send({ type: event.key === "ArrowRight" ? "next" : "back" });
			} else if (event.key === "Escape" && document.fullscreenElement) {
				document.exitFullscreen().catch(() => undefined);
			}
		};
		el.addEventListener("keydown", onKey);
		return () => el.removeEventListener("keydown", onKey);
	}, [send]);

	useEffect(() => {
		const lost = document.activeElement === document.body;
		if (state.phase === "play" && (focusNext.current || lost)) {
			focusNext.current = false;
			nextButton.current?.focus({ preventScroll: true });
		}
		if (state.phase !== "end") return;
		if (lost || player.current?.contains(document.activeElement)) {
			replayButton.current?.focus({ preventScroll: true });
		}
	}, [state.phase]);

	useEffect(
		() => () => {
			const all = sounds.current;
			if (!all) return;
			for (const el of [all.bgm, all.image, ...all.typing]) el?.pause();
		},
		[],
	);

	const start = (event: CutEvent) => {
		focusNext.current = state.phase !== "play";
		if (soundOn) sounds.current?.bgm?.play().catch(() => undefined);
		send(event);
	};

	const toggleSound = () => {
		const on = !soundOn;
		setSoundOn(on);
		if (!on) {
			const all = sounds.current;
			for (const el of [all?.bgm, all?.image, ...(all?.typing ?? [])]) {
				el?.pause();
			}
			return;
		}
		let all = sounds.current;
		if (!all) {
			const { bgm, image, typing: clips } = view.sound;
			all = {
				bgm: bgm ? makeSound(bgm, VOLUME.bgm, true) : undefined,
				image: image ? makeSound(image, VOLUME.image) : undefined,
				typing: clips.length
					? Array.from({ length: Math.max(TICK_POOL, clips.length) }, (_, i) =>
							makeSound(clips[i % clips.length] ?? "", VOLUME.typing),
						)
					: [],
				next: 0,
				last: 0,
			};
			sounds.current = all;
			for (const el of [all.image, ...all.typing]) if (el) unlock(el);
		}
		if (started) all.bgm?.play().catch(() => undefined);
	};

	const spoken = state.phase === "play" && current ? plainLines(current) : [];
	const typed =
		state.phase === "play" && current ? typeOut(current, state.typed) : [];
	const style = {
		"--cut-entrance": `${view.image?.entrance ?? 0}s`,
		"--cut-video-in": `${view.video?.fadeIn ?? 0}s`,
		"--cut-white-in": `${view.fade?.in ?? 0}s`,
		"--cut-white-out": `${view.fade?.out ?? 0}s`,
	} as CSSProperties;
	const script = useMemo(
		() => texts.map((text, page) => ({ n: page + 1, text })),
		[texts],
	);
	const scriptList = useMemo(
		() => (
			<details className="coll-variant cut-script">
				<summary>{t.script}</summary>
				<ol className="cut-script-list">
					{script.map(({ n, text }) => (
						<li key={n}>
							{text.lines.map((line) => (
								<p key={line.at} lang={line.lang}>
									<RichText text={line.text} />
								</p>
							))}
						</li>
					))}
				</ol>
			</details>
		),
		[script, t.script],
	);
	const hintId = `${ids}-hint`;
	const langId = `${ids}-lang`;

	return (
		<>
			{/* biome-ignore lint/a11y/useSemanticElements: a player around the stage and its controls, not a form, so a labelled group */}
			<div
				ref={player}
				className="cut-player"
				role="group"
				aria-label={t.player}
				data-full={fullscreen.full ? "true" : undefined}
			>
				<div className="cut-stage" data-phase={state.phase} style={style}>
					<div className="cut-picture" aria-hidden="true">
						{view.video ? (
							<video
								ref={video}
								className="cut-video"
								src={view.video.src}
								width={view.video.width}
								height={view.video.height}
								data-on={videoOn ? "true" : undefined}
								muted
								loop
								playsInline
								preload={started ? "auto" : "none"}
								onPlaying={() => setVideoOn(true)}
								onLoadedData={(event) => {
									if (!reduced) return;
									event.currentTarget.currentTime = 0.001;
									setVideoOn(true);
								}}
							/>
						) : null}
						{view.image && started ? (
							// biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain
							<img
								className="cut-image"
								src={view.image.src}
								alt=""
								data-shown={shown ? "true" : undefined}
								decoding="async"
								draggable={false}
							/>
						) : null}
						<div className="cut-shade" />
					</div>
					<div className="cut-box" aria-hidden="true">
						<div className="cut-text">
							{typed.map((line) => (
								<p key={`${state.page}-${line.at}`} lang={line.lang}>
									{line.segments.map((segment) => (
										<Fragment key={segment.at}>
											{marked(segment, segment.text)}
											{segment.rest ? (
												<span className="cut-rest">
													{marked(segment, segment.rest)}
												</span>
											) : null}
										</Fragment>
									))}
								</p>
							))}
						</div>
						{script.map(({ n, text }) => (
							<div key={n} className="cut-text cut-sizer">
								{text.lines.map((line) => (
									<p key={line.at} lang={line.lang}>
										{line.segments.map((segment) => (
											<Fragment key={segment.at}>
												{marked(segment, segment.text)}
											</Fragment>
										))}
									</p>
								))}
							</div>
						))}
					</div>
					<div
						className="cut-white"
						data-white={state.white}
						aria-hidden="true"
					/>
					<button
						type="button"
						className="cut-hit"
						tabIndex={-1}
						aria-hidden="true"
						disabled={state.phase !== "play"}
						onClick={() => send({ type: "next" })}
					/>
					{state.phase === "start" ? (
						<CutStart
							t={t}
							onPlay={() => start({ type: "play" })}
							note={hasSound && !soundOn ? t.startNote : undefined}
						/>
					) : null}
					{state.phase === "end" ? (
						<CutEnd
							t={t}
							onReplay={() => start({ type: "restart" })}
							buttonRef={replayButton}
						/>
					) : null}
				</div>
				<p id={hintId} className="sr-only">
					{t.stageHint}
				</p>
				<p className="sr-only" aria-live="polite">
					{state.phase === "end"
						? t.ended
						: spoken.map((line, i) => (
								<span key={`${state.page}-${line.at}`} lang={line.lang}>
									{i ? ` ${line.text}` : line.text}
								</span>
							))}
				</p>
				<div className="cut-controls">
					<div className="cut-nav">
						<button
							type="button"
							className="btn btn-ghost"
							disabled={!started}
							aria-disabled={
								(state.phase === "play" && !state.page) || undefined
							}
							onClick={() => send({ type: "back" })}
						>
							<CaretLeft size={16} weight="bold" aria-hidden />
							{t.back}
						</button>
						<CutCount t={t} page={state.page} total={total} />
						<button
							ref={nextButton}
							type="button"
							className="btn btn-ghost"
							aria-describedby={hintId}
							disabled={state.phase !== "play"}
							onClick={() => send({ type: "next" })}
						>
							{t.next}
							<CaretRight size={16} weight="bold" aria-hidden />
						</button>
						<CutRestart
							t={t}
							disabled={!started}
							onRestart={() => start({ type: "restart" })}
						/>
					</div>
					<div className="cut-options">
						<CutLangSelect id={langId} t={t} lang={lang} onChange={setLang} />
						<CutToggles
							t={t}
							soundOn={soundOn}
							onSound={hasSound ? toggleSound : undefined}
							fullscreen={fullscreen}
						/>
					</div>
				</div>
			</div>
			{scriptList}
		</>
	);
}
