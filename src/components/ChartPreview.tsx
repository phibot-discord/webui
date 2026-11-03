"use client";

import {
	CornersIn,
	CornersOut,
	FastForward,
	FilmStrip,
	Pause,
	Play,
	Rewind,
	SlidersHorizontal,
	SpeakerHigh,
	SpeakerSlash,
	X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useFullscreen } from "@/components/CutControls";
import { SegRadio } from "@/components/SegRadio";
import { useI18n } from "@/i18n/provider";
import { saveBlob, shownVersion, versionSpan } from "@/lib/apk-version";
import type { AudioState, ChartPlayer } from "@/lib/chart-player/player";
import { readLocal, writeLocal } from "@/lib/local-store";
import { fill } from "@/phi/lib/card-i18n";
import type { PreviewVersion } from "@/server/song-assets";

type PreviewLevel = PreviewVersion["levels"][number];

type Phase = "idle" | "loading" | "ready" | "failed" | "nogl";
type VideoState =
	| { state: "idle" }
	| { state: "rendering"; progress: number }
	| { state: "done" }
	| { state: "failed" };
type PlayerModule = typeof import("@/lib/chart-player/player");

const SKIP = 5;
const VOLUME_KEY = "webChartHitVolume";
const MIX_KEY = "webChartHitMix";
const CHORD_KEY = "webChartChordColors";
const NOISE_KEY = "webChartNoise";
const SIZE_KEY = "webChartNoteSize";
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];
const HIT_KINDS = ["tap", "drag", "flick"] as const;
const VOLUME_MAX = 1.5;
const SIZE_MIN = 0.6;
const SIZE_MAX = 1.5;
const DEFAULT_MIX = [1, 1, 1];

let moduleJob: Promise<PlayerModule> | null = null;
let loadedModule: PlayerModule | null = null;

function playerModule(): Promise<PlayerModule> {
	if (!moduleJob) {
		moduleJob = import("@/lib/chart-player/player").then((mod) => {
			loadedModule = mod;
			return mod;
		});
		moduleJob.catch(() => {
			moduleJob = null;
		});
	}
	return moduleJob;
}

function clock(s: number): string {
	const v = Math.max(0, Math.floor(s));
	return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
}

function levelLabel(rank: string): string {
	return rank.replaceAll("_", " ");
}

function pickRank(levels: PreviewLevel[], want: string): string {
	return levels.some((l) => l.rank === want)
		? want
		: (levels.at(-1)?.rank ?? "");
}

function isField(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		Boolean(target.closest("select, input, textarea, button, a, dialog"))
	);
}

function bounded(
	raw: string | null | undefined,
	min: number,
	max: number,
): number | null {
	if (raw === null || raw === "") return null;
	const n = Number(raw);
	return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : null;
}

function readMix(): number[] {
	const raw = readLocal(MIX_KEY);
	if (!raw) return DEFAULT_MIX;
	const parts = raw.split(",").map((p) => bounded(p, 0, 1));
	return parts.length === 3 && parts.every((p) => p !== null)
		? (parts as number[])
		: DEFAULT_MIX;
}

function pct(v: number): string {
	return `${Math.round(v * 100)}%`;
}

export function ChartPreview({
	title,
	versions,
	cover,
	top,
	constants,
}: {
	title: string;
	versions: PreviewVersion[];
	cover?: string;
	top: string;
	constants?: Record<string, number>;
}) {
	const { m } = useI18n();
	const t = m.chartPlayer;
	const ids = useId();
	const [versionId, setVersionId] = useState(() => versions[0]?.id ?? "");
	const version = versions.find((v) => v.id === versionId) ?? versions[0];
	const levels = version?.levels ?? [];
	const [rank, setRank] = useState(() => pickRank(levels, top));
	const level = levels.find((l) => l.rank === rank) ?? levels[0];
	const versionLabel = (v: PreviewVersion) => {
		if (v.tree === "current") return t.current;
		if (v.tree === "fools") return t.fools;
		if (v.tree === "removed") {
			const from = v.levels.find((l) => l.from)?.from;
			return from
				? fill(t.removedFrom, { version: shownVersion(from) })
				: t.removed;
		}
		return versionSpan(v.versions?.length ? v.versions : v.rev ? [v.rev] : []);
	};
	const [phase, setPhase] = useState<Phase>("idle");
	const [audio, setAudio] = useState<AudioState | null>(null);
	const [playing, setPlaying] = useState(false);
	const [volume, setVolume] = useState(1);
	const [muted, setMuted] = useState(false);
	const [mix, setMix] = useState<number[]>(DEFAULT_MIX);
	const [chords, setChords] = useState(false);
	const [speed, setSpeed] = useState(1);
	const [noise, setNoise] = useState(true);
	const [noteSize, setNoteSize] = useState(1);
	const [hasNoise, setHasNoise] = useState(false);
	const [canVideo, setCanVideo] = useState(false);
	const [video, setVideo] = useState<VideoState>({ state: "idle" });
	const videoAbort = useRef<AbortController | null>(null);
	const settings = useRef({
		hit: 1,
		mix: DEFAULT_MIX,
		chords: false,
		noise: true,
		size: 1,
		speed: 1,
	});
	const [duration, setDuration] = useState(0);
	const box = useRef<HTMLDivElement>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const seekBar = useRef<HTMLInputElement>(null);
	const time = useRef<HTMLSpanElement>(null);
	const dialog = useRef<HTMLDialogElement>(null);
	const player = useRef<ChartPlayer | null>(null);
	const dragging = useRef(false);
	const autoplay = useRef(false);
	const shown = useRef({ sec: -1, dur: -1, bar: -1 });
	const fullscreen = useFullscreen(box);
	const poster = level?.source.cover ?? cover;

	useEffect(() => {
		const el = box.current;
		if (!el) return;
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					io.disconnect();
					void playerModule().catch(() => undefined);
				}
			},
			{ rootMargin: "600px" },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	useEffect(
		() => () => {
			player.current?.dispose();
			player.current = null;
		},
		[],
	);

	useEffect(() => {
		setCanVideo("VideoEncoder" in window && "OfflineAudioContext" in window);
	}, []);

	useEffect(() => () => videoAbort.current?.abort(), []);

	useEffect(() => {
		if (readLocal(CHORD_KEY) === "1") setChords(true);
		if (readLocal(NOISE_KEY) === "0") setNoise(false);
		const saved = bounded(readLocal(VOLUME_KEY), 0, VOLUME_MAX);
		if (saved !== null) setVolume(saved);
		const size = bounded(readLocal(SIZE_KEY), SIZE_MIN, SIZE_MAX);
		if (size !== null) setNoteSize(size);
		setMix(readMix());
	}, []);

	useEffect(() => {
		settings.current.chords = chords;
		player.current?.setChordColors(chords);
	}, [chords]);

	useEffect(() => {
		settings.current.noise = noise;
		player.current?.setNoise(noise);
	}, [noise]);

	useEffect(() => {
		settings.current.hit = muted ? 0 : volume;
		player.current?.setHitVolume(settings.current.hit);
	}, [volume, muted]);

	useEffect(() => {
		settings.current.mix = mix;
		mix.forEach((v, k) => {
			player.current?.setHitMix(k, v);
		});
	}, [mix]);

	useEffect(() => {
		settings.current.size = noteSize;
		player.current?.setNoteScale(noteSize);
	}, [noteSize]);

	useEffect(() => {
		settings.current.speed = speed;
		player.current?.setSpeed(speed);
	}, [speed]);

	const onTime = useCallback((pos: number, dur: number) => {
		const s = shown.current;
		const bar = seekBar.current;
		if (bar && !dragging.current && Math.abs(pos - s.bar) >= dur / 1200) {
			s.bar = pos;
			bar.value = String(pos);
		}
		const sec = Math.floor(pos);
		const whole = Math.round(dur);
		if (whole !== s.dur) setDuration(dur);
		if (sec !== s.sec || whole !== s.dur) {
			s.sec = sec;
			s.dur = whole;
			if (time.current)
				time.current.textContent = `${clock(pos)} / ${clock(dur)}`;
			bar?.setAttribute("aria-valuetext", `${clock(pos)} / ${clock(dur)}`);
		}
	}, []);

	const onAudio = useCallback((state: AudioState) => {
		setAudio(state);
		if (state.kind === "loading") return;
		const p = player.current;
		if (p && autoplay.current && p.ready) {
			autoplay.current = false;
			p.play();
		}
	}, []);

	const create = (mod: PlayerModule): ChartPlayer | null => {
		const el = canvas.current;
		if (!el) return null;
		try {
			const p = new mod.ChartPlayer(el, {
				onTime,
				onPlaying: setPlaying,
				onAudio,
			});
			const s = settings.current;
			p.setHitVolume(s.hit);
			s.mix.forEach((v, k) => {
				p.setHitMix(k, v);
			});
			p.setChordColors(s.chords);
			p.setSpeed(s.speed);
			p.setNoise(s.noise);
			p.setNoteScale(s.size);
			return p;
		} catch {
			setPhase("nogl");
			return null;
		}
	};

	const captionFor = (want: PreviewLevel, tree: PreviewVersion["tree"]) => {
		const c = tree === "fools" ? undefined : constants?.[want.rank];
		const name = levelLabel(want.rank);
		return {
			title,
			level: c !== undefined ? `${name} Lv.${c.toFixed(1)}` : name,
		};
	};

	const open = async (want: PreviewLevel, tree: PreviewVersion["tree"]) => {
		setPhase("loading");
		let p = player.current;
		if (!p) {
			const mod = loadedModule ?? (await playerModule().catch(() => null));
			if (!mod) {
				setPhase("failed");
				return;
			}
			p = create(mod);
			if (!p) return;
			player.current = p;
			autoplay.current = true;
		}
		p.unlock();
		p.setCaption(captionFor(want, tree));
		const backdrop = want.source.cover ?? cover;
		if (backdrop) void p.loadBackdrop(backdrop);
		let music: Promise<boolean>;
		try {
			const got = await p.loadSource(want.source);
			if (!got) return;
			music = got.music;
		} catch {
			setPhase("failed");
			return;
		}
		setHasNoise(p.hasNoise);
		setPhase("ready");
		await music;
		if (autoplay.current && player.current === p) {
			autoplay.current = false;
			p.play();
		}
	};

	const pick = (next: string) => {
		setRank(next);
		const want = levels.find((l) => l.rank === next);
		if (want && player.current && version) void open(want, version.tree);
	};

	const pickVersion = (id: string) => {
		const next = versions.find((v) => v.id === id);
		if (!next) return;
		setVersionId(id);
		const r = pickRank(next.levels, rank);
		setRank(r);
		const want = next.levels.find((l) => l.rank === r);
		if (want && player.current) void open(want, next.tree);
	};

	const makeVideo = async () => {
		const p = player.current;
		if (!p || videoAbort.current) return;
		const ac = new AbortController();
		videoAbort.current = ac;
		setVideo({ state: "rendering", progress: 0 });
		try {
			const blob = await p.exportVideo({
				width: 1920,
				height: 1080,
				fps: 60,
				signal: ac.signal,
				onProgress: (done) => setVideo({ state: "rendering", progress: done }),
			});
			saveBlob(blob, `${title} ${rank}.mp4`.replace(/[\\/:*?"<>|]/g, "_"));
			setVideo({ state: "done" });
		} catch {
			setVideo(ac.signal.aborted ? { state: "idle" } : { state: "failed" });
		} finally {
			videoAbort.current = null;
		}
	};

	const setKind = (k: number, v: number) => {
		const next = mix.map((x, i) => (i === k ? v : x));
		setMix(next);
		writeLocal(MIX_KEY, next.join(","));
	};

	const reset = () => {
		setVolume(1);
		setMuted(false);
		setMix(DEFAULT_MIX);
		setChords(false);
		setNoise(true);
		setNoteSize(1);
		writeLocal(VOLUME_KEY, "1");
		writeLocal(MIX_KEY, DEFAULT_MIX.join(","));
		writeLocal(CHORD_KEY, "0");
		writeLocal(NOISE_KEY, "1");
		writeLocal(SIZE_KEY, "1");
	};

	const ready = phase === "ready";
	const label = fill(t.canvas, { title, level: rank });
	const loud = !muted && volume > 0;
	const loadingText =
		phase === "loading"
			? t.loadingChart
			: ready && audio?.kind === "loading" && !playing
				? fill(t.loadingAudio, { p: Math.round(audio.progress * 100) })
				: "";

	return (
		<section className="song-section" aria-labelledby={`${ids}-h`}>
			<h2 id={`${ids}-h`}>{t.title}</h2>
			<p className="field-hint">{t.lede}</p>
			{versions.length > 1 ? (
				<div className="field cp-version">
					<label htmlFor={`${ids}-ver`}>{t.version}</label>
					<select
						id={`${ids}-ver`}
						value={version?.id}
						onChange={(event) => pickVersion(event.currentTarget.value)}
					>
						{versions.map((v) => (
							<option key={v.id} value={v.id}>
								{versionLabel(v)}
							</option>
						))}
					</select>
				</div>
			) : null}
			{levels.length > 1 ? (
				<SegRadio
					className="song-level-pick"
					legend={t.level}
					value={rank}
					options={levels.map((l) => ({
						value: l.rank,
						label: levelLabel(l.rank),
					}))}
					onChange={pick}
				/>
			) : null}
			{/* biome-ignore lint/a11y/useSemanticElements: a player around the stage and its controls, not a form, so a labelled group */}
			<div
				ref={box}
				className="cp"
				role="group"
				aria-label={label}
				aria-describedby={`${ids}-keys`}
				onKeyDown={(event) => {
					const p = player.current;
					if (event.altKey || event.ctrlKey || event.metaKey) return;
					if (!p || !ready || dialog.current?.open || isField(event.target))
						return;
					if (event.key === " " || event.key === "k") {
						event.preventDefault();
						p.toggle();
					} else if (event.key === "ArrowLeft") {
						event.preventDefault();
						p.skip(-SKIP);
					} else if (event.key === "ArrowRight") {
						event.preventDefault();
						p.skip(SKIP);
					} else if (event.key === "f" && fullscreen.canFull) {
						event.preventDefault();
						fullscreen.toggleFull();
					}
				}}
			>
				<div className="cp-stage" data-phase={phase}>
					<canvas
						ref={canvas}
						className="cp-canvas"
						tabIndex={ready ? 0 : -1}
						role="img"
						aria-label={label}
						onClick={() => {
							if (ready) player.current?.toggle();
						}}
					/>
					{phase === "idle" ? (
						<div className="cp-cover">
							{poster ? (
								// biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain
								<img
									className="cp-poster"
									src={`${poster}${poster.includes("?") ? "&" : "?"}cors=1`}
									crossOrigin="anonymous"
									alt=""
								/>
							) : null}
							<button
								type="button"
								className="btn btn-primary cp-start"
								aria-label={fill(t.startLabel, { level: rank })}
								onClick={() => {
									if (level && version) void open(level, version.tree);
								}}
							>
								<Play size={18} weight="fill" aria-hidden />
								{t.start}
							</button>
						</div>
					) : null}
					{phase === "failed" || phase === "nogl" ? (
						<div className="cp-status" data-error="true">
							<p>{phase === "nogl" ? t.noGl : t.failed}</p>
							{phase === "failed" ? (
								<button
									type="button"
									className="btn btn-primary"
									onClick={() => {
										if (level && version) void open(level, version.tree);
									}}
								>
									{t.retry}
								</button>
							) : null}
						</div>
					) : loadingText ? (
						<div className="cp-status">
							<p>{loadingText}</p>
						</div>
					) : null}
				</div>
				<p className="sr-only" aria-live="polite">
					{phase === "failed" ? t.failed : loadingText}
				</p>
				<div className="cp-bar">
					<button
						type="button"
						className="btn btn-ghost btn-icon"
						disabled={!ready}
						aria-label={playing ? t.pause : t.play}
						title={playing ? t.pause : t.play}
						onClick={() => player.current?.toggle()}
					>
						{playing ? (
							<Pause size={18} weight="fill" aria-hidden />
						) : (
							<Play size={18} weight="fill" aria-hidden />
						)}
					</button>
					<button
						type="button"
						className="btn btn-ghost btn-icon"
						disabled={!ready}
						aria-label={t.back}
						title={t.back}
						onClick={() => player.current?.skip(-SKIP)}
					>
						<Rewind size={18} aria-hidden />
					</button>
					<button
						type="button"
						className="btn btn-ghost btn-icon"
						disabled={!ready}
						aria-label={t.forward}
						title={t.forward}
						onClick={() => player.current?.skip(SKIP)}
					>
						<FastForward size={18} aria-hidden />
					</button>
					<input
						ref={seekBar}
						className="cp-seek"
						type="range"
						min={0}
						max={duration || 1}
						step={0.05}
						defaultValue={0}
						disabled={!ready}
						aria-label={t.seek}
						onPointerDown={() => {
							dragging.current = true;
						}}
						onPointerUp={() => {
							dragging.current = false;
						}}
						onPointerCancel={() => {
							dragging.current = false;
						}}
						onInput={(event) =>
							player.current?.seek(Number(event.currentTarget.value))
						}
					/>
					<span ref={time} className="cp-clock">
						0:00 / 0:00
					</span>
					<select
						className="cp-speed"
						value={speed}
						aria-label={t.speed}
						title={t.speed}
						onChange={(event) => setSpeed(Number(event.currentTarget.value))}
					>
						{SPEEDS.map((v) => (
							<option key={v} value={v}>
								{`${v}×`}
							</option>
						))}
					</select>
					<div className="cp-tools">
						<button
							type="button"
							className="btn btn-ghost btn-icon"
							aria-pressed={loud}
							aria-label={t.hitSounds}
							title={t.hitSounds}
							onClick={() => {
								if (volume === 0) {
									setVolume(1);
									setMuted(false);
									writeLocal(VOLUME_KEY, "1");
								} else {
									setMuted(!muted);
								}
							}}
						>
							{loud ? (
								<SpeakerHigh size={18} aria-hidden />
							) : (
								<SpeakerSlash size={18} aria-hidden />
							)}
						</button>
						<button
							type="button"
							className="btn btn-ghost"
							title={t.settingsTitle}
							onClick={() => dialog.current?.showModal()}
						>
							<SlidersHorizontal size={18} aria-hidden />
							{t.settings}
						</button>
						{canVideo ? (
							<button
								type="button"
								className="btn btn-ghost"
								disabled={
									!ready ||
									video.state === "rendering" ||
									audio?.kind === "loading"
								}
								title={t.videoHint}
								onClick={() => void makeVideo()}
							>
								<FilmStrip size={18} aria-hidden />
								{t.video}
							</button>
						) : null}
						{fullscreen.canFull ? (
							<button
								type="button"
								className="btn btn-ghost btn-icon"
								aria-label={fullscreen.full ? t.exitFullscreen : t.fullscreen}
								title={fullscreen.full ? t.exitFullscreen : t.fullscreen}
								onClick={fullscreen.toggleFull}
							>
								{fullscreen.full ? (
									<CornersIn size={18} aria-hidden />
								) : (
									<CornersOut size={18} aria-hidden />
								)}
							</button>
						) : null}
					</div>
				</div>
				{video.state === "rendering" ? (
					<div className="cp-video" role="status">
						<progress max={1} value={video.progress} aria-label={t.video} />
						<span>
							{fill(t.videoProgress, { p: Math.round(video.progress * 100) })}
						</span>
						<button
							type="button"
							className="btn btn-ghost btn-sm"
							onClick={() => videoAbort.current?.abort()}
						>
							{t.videoCancel}
						</button>
					</div>
				) : video.state === "failed" ? (
					<p className="callout" role="status">
						{t.videoFailed}
					</p>
				) : video.state === "done" ? (
					<p className="field-hint" role="status">
						{t.videoDone}
					</p>
				) : null}
				<p id={`${ids}-keys`} className="field-hint cp-keys">
					{t.keys}
				</p>
				{audio?.kind === "failed" ? (
					<p className="callout">{t.noAudio}</p>
				) : null}
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: a click on the backdrop closes it; the keyboard already has Escape */}
				<dialog
					ref={dialog}
					className="cp-dialog"
					aria-labelledby={`${ids}-set`}
					onClick={(event) => {
						if (event.target === dialog.current) dialog.current.close();
					}}
				>
					<div className="cp-dialog-head">
						<h3 id={`${ids}-set`}>{t.settingsTitle}</h3>
						<button
							type="button"
							className="btn btn-quiet btn-icon btn-sm"
							aria-label={t.close}
							title={t.close}
							onClick={() => dialog.current?.close()}
						>
							<X size={16} aria-hidden />
						</button>
					</div>
					<div className="cp-dialog-body">
						<h4>{t.soundSection}</h4>
						<label className="cp-set">
							<span>{t.hitVolume}</span>
							<input
								type="range"
								min={0}
								max={VOLUME_MAX * 100}
								step={5}
								value={Math.round((muted ? 0 : volume) * 100)}
								aria-valuetext={pct(muted ? 0 : volume)}
								onChange={(event) => {
									const next = Number(event.currentTarget.value) / 100;
									setVolume(next);
									setMuted(false);
									writeLocal(VOLUME_KEY, String(next));
								}}
							/>
							<output>{pct(muted ? 0 : volume)}</output>
						</label>
						{HIT_KINDS.map((kind, k) => (
							<label key={kind} className="cp-set cp-set-kind">
								<span>{t.hitKinds[kind]}</span>
								<input
									type="range"
									min={0}
									max={100}
									step={5}
									value={Math.round((mix[k] ?? 1) * 100)}
									aria-valuetext={pct(mix[k] ?? 1)}
									onChange={(event) =>
										setKind(k, Number(event.currentTarget.value) / 100)
									}
									onPointerUp={() => player.current?.previewHit(k)}
									onKeyUp={(event) => {
										if (/^(Arrow|Home|End|Page)/.test(event.key))
											player.current?.previewHit(k);
									}}
								/>
								<output>{pct(mix[k] ?? 1)}</output>
								<button
									type="button"
									className="btn btn-ghost btn-icon btn-sm"
									disabled={!player.current}
									aria-label={fill(t.hitTest, { kind: t.hitKinds[kind] })}
									title={fill(t.hitTest, { kind: t.hitKinds[kind] })}
									onClick={() => player.current?.previewHit(k)}
								>
									<Play size={14} weight="fill" aria-hidden />
								</button>
							</label>
						))}
						<h4>{t.lookSection}</h4>
						<label className="cp-set">
							<span>{t.noteSize}</span>
							<input
								type="range"
								min={SIZE_MIN * 100}
								max={SIZE_MAX * 100}
								step={5}
								value={Math.round(noteSize * 100)}
								aria-valuetext={pct(noteSize)}
								onChange={(event) => {
									const next = Number(event.currentTarget.value) / 100;
									setNoteSize(next);
									writeLocal(SIZE_KEY, String(next));
								}}
							/>
							<output>{pct(noteSize)}</output>
						</label>
						<label className="cp-check">
							<input
								type="checkbox"
								checked={chords}
								onChange={(event) => {
									const next = event.currentTarget.checked;
									setChords(next);
									writeLocal(CHORD_KEY, next ? "1" : "0");
								}}
							/>
							<span>
								{t.chordColors}
								<small>{t.chordColorsHint}</small>
							</span>
						</label>
						{hasNoise ? (
							<label className="cp-check">
								<input
									type="checkbox"
									checked={noise}
									onChange={(event) => {
										const next = event.currentTarget.checked;
										setNoise(next);
										writeLocal(NOISE_KEY, next ? "1" : "0");
									}}
								/>
								<span>
									{t.noise}
									<small>{t.noiseHint}</small>
								</span>
							</label>
						) : null}
					</div>
					<div className="cp-dialog-foot">
						<button type="button" className="btn btn-ghost" onClick={reset}>
							{t.reset}
						</button>
						<button
							type="button"
							className="btn btn-primary"
							onClick={() => dialog.current?.close()}
						>
							{t.close}
						</button>
					</div>
				</dialog>
			</div>
		</section>
	);
}
