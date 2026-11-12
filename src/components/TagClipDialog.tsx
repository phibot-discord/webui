"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
	ArrowCounterClockwise,
	Pause,
	Play,
	SpeakerHigh,
	SpeakerSlash,
	X,
} from "@/components/icons";
import Link from "@/components/LocaleLink";
import { useI18n } from "@/i18n/provider";
import { WATERMARK } from "@/lib/chart-player/base";
import {
	CHORD_KEY,
	NOISE_KEY,
	playerModule,
	SIZE_KEY,
	SIZE_MAX,
	SIZE_MIN,
	storedMix,
	storedNumber,
	VOLUME_KEY,
	VOLUME_MAX,
} from "@/lib/chart-player/host";
import type { AudioState, ChartPlayer } from "@/lib/chart-player/player";
import { readLocal } from "@/lib/local-store";
import { fill } from "@/phi/lib/card-i18n";
import type { TagClipView } from "@/server/tag-clips";

type Phase = "loading" | "ready" | "failed" | "nogl";

export type ActiveClip = {
	name: string;
	description?: string;
	clip: TagClipView;
};

const LEAD = 1;
const TAIL = 0.5;
const SPEEDS = [0.5, 0.75, 1];

export function TagClipDialog({
	active,
	onClose,
}: {
	active: ActiveClip | null;
	onClose: () => void;
}) {
	const { locale, m } = useI18n();
	const t = m.tags;
	const cp = m.chartPlayer;
	const ids = useId();
	const dialog = useRef<HTMLDialogElement>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const player = useRef<ChartPlayer | null>(null);
	const range = useRef({ from: 0, to: 0 });
	const job = useRef(0);
	const volume = useRef(1);
	const [phase, setPhase] = useState<Phase>("loading");
	const [audio, setAudio] = useState<AudioState | null>(null);
	const [playing, setPlaying] = useState(false);
	const [speed, setSpeed] = useState(1);
	const [sounds, setSounds] = useState(true);
	const speedRef = useRef(speed);
	speedRef.current = speed;
	const soundsRef = useRef(sounds);
	soundsRef.current = sounds;

	const onTime = useCallback((pos: number) => {
		const r = range.current;
		if (r.to > 0 && pos >= r.to) player.current?.seek(r.from);
	}, []);

	const load = useCallback(
		async (clip: TagClipView) => {
			const id = ++job.current;
			setPhase("loading");
			setAudio(null);
			range.current = {
				from: Math.max(0, clip.start - LEAD),
				to: clip.start + clip.length + TAIL,
			};
			const mod = await playerModule().catch(() => null);
			if (id !== job.current) return;
			if (!mod) {
				setPhase("failed");
				return;
			}
			let p = player.current;
			if (!p) {
				const el = canvas.current;
				if (!el) return;
				try {
					p = new mod.ChartPlayer(el, {
						onTime,
						onPlaying: setPlaying,
						onAudio: setAudio,
					});
				} catch {
					setPhase("nogl");
					return;
				}
				volume.current = storedNumber(VOLUME_KEY, 0, VOLUME_MAX) ?? 1;
				p.setHitVolume(soundsRef.current ? volume.current : 0);
				for (const [kind, gain] of (storedMix() ?? []).entries()) {
					p.setHitMix(kind, gain);
				}
				p.setNoteScale(storedNumber(SIZE_KEY, SIZE_MIN, SIZE_MAX) ?? 1);
				p.setChordColors(readLocal(CHORD_KEY) === "1");
				p.setNoise(readLocal(NOISE_KEY) !== "0");
				p.setSpeed(speedRef.current);
				player.current = p;
			}
			p.pause();
			p.unlock();
			if (clip.source.cover) void p.loadBackdrop(clip.source.cover);
			let got: Awaited<ReturnType<ChartPlayer["loadSource"]>>;
			try {
				got = await p.loadSource(clip.source);
			} catch {
				if (id === job.current) setPhase("failed");
				return;
			}
			if (!got || id !== job.current) return;
			p.seek(range.current.from);
			setPhase("ready");
			await got.music;
			if (id !== job.current || !dialog.current?.open) return;
			p.seek(range.current.from);
			p.play();
		},
		[onTime],
	);

	useEffect(() => {
		const el = dialog.current;
		if (!el) return;
		if (!active) {
			if (el.open) el.close();
			return;
		}
		if (!el.open) el.showModal();
		void load(active.clip);
	}, [active, load]);

	useEffect(() => {
		player.current?.setSpeed(speed);
	}, [speed]);

	useEffect(() => {
		player.current?.setHitVolume(sounds ? volume.current : 0);
	}, [sounds]);

	useEffect(
		() => () => {
			job.current++;
			player.current?.dispose();
			player.current = null;
		},
		[],
	);

	const close = () => {
		job.current++;
		player.current?.pause();
		onClose();
	};

	const replay = () => {
		const p = player.current;
		if (!p) return;
		p.seek(range.current.from);
		p.play();
	};

	const clip = active?.clip;
	const level = clip ? `${clip.level} Lv.${clip.constant.toFixed(1)}` : "";
	const ready = phase === "ready";
	const status =
		phase === "loading"
			? cp.loadingChart
			: ready && audio?.kind === "loading" && !playing
				? fill(cp.loadingAudio, { p: Math.round(audio.progress * 100) })
				: "";

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: a click on the backdrop closes it; the keyboard already has Escape
		<dialog
			ref={dialog}
			className="tag-clip-dialog"
			aria-labelledby={`${ids}-h`}
			onClose={close}
			onClick={(event) => {
				if (event.target === dialog.current) dialog.current.close();
			}}
		>
			<div className="cp-dialog-head">
				<h3 id={`${ids}-h`}>{active?.name}</h3>
				<button
					type="button"
					className="btn btn-quiet btn-icon btn-sm"
					aria-label={cp.close}
					title={cp.close}
					onClick={() => dialog.current?.close()}
				>
					<X size={16} aria-hidden />
				</button>
			</div>
			<div className="tag-clip-body">
				{active?.description ? (
					<p className="tag-clip-desc">{active.description}</p>
				) : null}
				<div className="cp-stage" data-phase={phase}>
					<canvas
						ref={canvas}
						className="cp-canvas"
						tabIndex={ready ? 0 : -1}
						role="img"
						aria-label={clip ? `${clip.title} ${level}` : ""}
						onClick={() => {
							if (ready) player.current?.toggle();
						}}
					/>
					{clip ? (
						<div className="cp-labels" aria-hidden="true">
							<span className="cp-caption">
								<span className="cp-caption-title">{clip.title}</span>
								<span className="cp-caption-level">{level}</span>
							</span>
							<span className="cp-mark">{WATERMARK}</span>
						</div>
					) : null}
					{phase === "failed" || phase === "nogl" ? (
						<div className="cp-status" data-error="true">
							<p>{phase === "nogl" ? cp.noGl : cp.failed}</p>
							{phase === "failed" && clip ? (
								<button
									type="button"
									className="btn btn-primary"
									onClick={() => void load(clip)}
								>
									{cp.retry}
								</button>
							) : null}
						</div>
					) : status ? (
						<div className="cp-status">
							<p>{status}</p>
						</div>
					) : null}
				</div>
				<p className="sr-only" aria-live="polite">
					{phase === "failed" ? cp.failed : status}
				</p>
				<div className="cp-bar">
					<button
						type="button"
						className="btn btn-ghost btn-icon"
						disabled={!ready}
						aria-label={playing ? cp.pause : cp.play}
						title={playing ? cp.pause : cp.play}
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
						aria-label={t.clipReplay}
						title={t.clipReplay}
						onClick={replay}
					>
						<ArrowCounterClockwise size={18} aria-hidden />
					</button>
					<select
						className="cp-speed"
						value={speed}
						aria-label={cp.speed}
						title={cp.speed}
						onChange={(event) => setSpeed(Number(event.currentTarget.value))}
					>
						{SPEEDS.map((v) => (
							<option key={v} value={v}>
								{`${v}×`}
							</option>
						))}
					</select>
					<button
						type="button"
						className="btn btn-ghost btn-icon"
						aria-pressed={sounds}
						aria-label={cp.hitSounds}
						title={cp.hitSounds}
						onClick={() => setSounds(!sounds)}
					>
						{sounds ? (
							<SpeakerHigh size={18} aria-hidden />
						) : (
							<SpeakerSlash size={18} aria-hidden />
						)}
					</button>
					{clip ? (
						<Link
							className="btn btn-ghost tag-clip-song"
							href={clip.path}
							prefetch={false}
						>
							{t.clipSong}
						</Link>
					) : null}
				</div>
				{clip ? (
					<p className="field-hint tag-clip-note">
						{fill(t.clipNote, {
							n: clip.length,
						})}
						{clip.votes > 0
							? `${locale === "en" ? " " : ""}${fill(t.clipVotes, { votes: clip.votes, total: clip.total })}`
							: null}
					</p>
				) : null}
				{audio?.kind === "failed" ? (
					<p className="callout">{cp.noAudio}</p>
				) : null}
			</div>
		</dialog>
	);
}
