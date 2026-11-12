"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "@/components/LocaleLink";
import { SegRadio } from "@/components/SegRadio";
import { useI18n } from "@/i18n/provider";
import { WATERMARK } from "@/lib/chart-player/base";
import { hardestWindow } from "@/lib/chart-player/density";
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
import type { ChartPlayer } from "@/lib/chart-player/player";
import {
	HIGHLIGHT_SECONDS,
	isJukeMode,
	JUKE_MODES,
	type JukeMode,
	playRange,
} from "@/lib/jukebox";
import { readLocal, writeLocal } from "@/lib/local-store";
import { fill } from "@/phi/lib/card-i18n";
import type { PreviewItem } from "@/server/preview-source";

export type JukeEntry = { key: string; id: string; rank: string };

type Phase = "loading" | "ready" | "failed" | "nogl" | "stopped";

const MODE_KEY = "webJukeMode";
const MAX_FAILS = 3;
const SKIP_MS = 1500;
const END_SLACK = 0.05;

const noop = () => undefined;

export function ChartJukebox({
	queue,
	onClose,
}: {
	queue: JukeEntry[];
	onClose: () => void;
}) {
	const { m } = useI18n();
	const t = m.charts;
	const ids = useId();
	const canvas = useRef<HTMLCanvasElement>(null);
	const player = useRef<ChartPlayer | null>(null);
	const job = useRef(0);
	const range = useRef<[number, number]>([0, 0]);
	const fails = useRef(0);
	const moving = useRef(false);
	const advance = useRef<() => void>(noop);
	const [step, setStep] = useState(0);
	const [phase, setPhase] = useState<Phase>("loading");
	const [playing, setPlaying] = useState(false);
	const [item, setItem] = useState<PreviewItem | null>(null);
	const [mode, setMode] = useState<JukeMode>(() => {
		const saved = readLocal(MODE_KEY);
		return isJukeMode(saved) ? saved : "highlight";
	});
	const index = queue.length ? step % queue.length : 0;

	advance.current = () => {
		if (moving.current) return;
		moving.current = true;
		setStep((s) => s + 1);
	};

	const onTime = useCallback((pos: number) => {
		const [, to] = range.current;
		if (to > 0 && pos >= to - END_SLACK) advance.current();
	}, []);

	useEffect(() => {
		const entry = queue[step % queue.length];
		if (!entry) return;
		const id = ++job.current;
		let timer: ReturnType<typeof setTimeout> | undefined;
		range.current = [0, 0];
		setPhase("loading");
		const fail = () => {
			if (id !== job.current) return;
			fails.current += 1;
			moving.current = false;
			if (fails.current >= MAX_FAILS) {
				setPhase("stopped");
				return;
			}
			setPhase("failed");
			timer = setTimeout(() => advance.current(), SKIP_MS);
		};
		const run = async () => {
			const mod = await playerModule().catch(() => null);
			if (id !== job.current) return;
			if (!mod) {
				fail();
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
						onAudio: noop,
					});
				} catch {
					setPhase("nogl");
					return;
				}
				p.setHitVolume(storedNumber(VOLUME_KEY, 0, VOLUME_MAX) ?? 1);
				for (const [kind, gain] of (storedMix() ?? []).entries()) {
					p.setHitMix(kind, gain);
				}
				p.setNoteScale(storedNumber(SIZE_KEY, SIZE_MIN, SIZE_MAX) ?? 1);
				p.setChordColors(readLocal(CHORD_KEY) === "1");
				p.setNoise(readLocal(NOISE_KEY) !== "0");
				player.current = p;
			}
			p.pause();
			p.unlock();
			let next: PreviewItem;
			try {
				const res = await fetch(
					`/api/preview-source?${new URLSearchParams({ id: entry.id, rank: entry.rank })}`,
				);
				if (id !== job.current) return;
				if (!res.ok) {
					fail();
					return;
				}
				next = (await res.json()) as PreviewItem;
			} catch {
				fail();
				return;
			}
			if (id !== job.current) return;
			if (next.source.cover) void p.loadBackdrop(next.source.cover);
			let got: Awaited<ReturnType<ChartPlayer["loadSource"]>>;
			try {
				got = await p.loadSource(next.source);
			} catch {
				fail();
				return;
			}
			if (!got || id !== job.current) return;
			const timing = p.timing;
			const hardest = timing
				? hardestWindow(
						timing.times,
						timing.weights,
						timing.spans,
						timing.offset,
						HIGHLIGHT_SECONDS,
					)
				: null;
			const start = hardest?.start ?? null;
			range.current = playRange(mode, start, p.duration);
			p.seek(range.current[0]);
			setItem(next);
			setPhase("ready");
			await got.music;
			if (id !== job.current) return;
			range.current = playRange(mode, start, p.duration);
			p.seek(range.current[0]);
			p.play();
			fails.current = 0;
			moving.current = false;
		};
		void run();
		return () => {
			if (timer) clearTimeout(timer);
		};
	}, [step, mode, queue, onTime]);

	useEffect(
		() => () => {
			job.current++;
			player.current?.dispose();
			player.current = null;
		},
		[],
	);

	const chooseMode = (next: JukeMode) => {
		setMode(next);
		writeLocal(MODE_KEY, next);
	};

	return (
		<section className="juke" aria-labelledby={`${ids}-juke`}>
			<div className="juke-head">
				<h2 id={`${ids}-juke`} className="sim-list-title">
					{t.jukeTitle}
				</h2>
				<span className="field-hint">
					{fill(t.jukeQueue, { n: index + 1, total: queue.length })}
				</span>
			</div>
			<div
				className="cp-stage"
				data-phase={phase === "ready" ? "ready" : "loading"}
			>
				<canvas
					ref={canvas}
					className="cp-canvas"
					role="img"
					aria-label={item ? `${item.title} ${item.level}` : t.jukeTitle}
					onClick={() => {
						if (phase === "ready") player.current?.toggle();
					}}
				/>
				{item ? (
					<div className="cp-labels" aria-hidden="true">
						<span className="cp-caption">
							<span className="cp-caption-title">{item.title}</span>
							<span className="cp-caption-level">
								{`${item.level} Lv.${item.constant.toFixed(1)}`}
							</span>
						</span>
						<span className="cp-mark">{WATERMARK}</span>
					</div>
				) : null}
				{phase !== "ready" ? (
					<div
						className="cp-status"
						data-error={phase === "nogl" || phase === "stopped" || undefined}
					>
						<p>
							{phase === "nogl"
								? m.chartPlayer.noGl
								: phase === "stopped"
									? t.jukeStopped
									: phase === "failed"
										? t.jukeFailed
										: t.jukeLoading}
						</p>
					</div>
				) : null}
			</div>
			<p className="juke-now" role="status">
				{item ? (
					<Link href={item.path} prefetch={false}>
						{fill(t.jukeNow, {
							title: item.title,
							level: item.level,
							c: item.constant.toFixed(1),
						})}
					</Link>
				) : (
					t.jukeLoading
				)}
			</p>
			<div className="juke-bar">
				<button
					type="button"
					className="btn btn-ghost"
					disabled={phase !== "ready"}
					onClick={() => player.current?.toggle()}
				>
					{playing ? m.chartPlayer.pause : m.chartPlayer.play}
				</button>
				<button
					type="button"
					className="btn btn-ghost"
					disabled={queue.length < 2 || phase === "stopped" || phase === "nogl"}
					onClick={() => advance.current()}
				>
					{t.jukeNext}
				</button>
				<SegRadio
					legend={t.jukeMode}
					value={mode}
					options={JUKE_MODES.map((value) => ({
						value,
						label: t.jukeModes[value],
					}))}
					onChange={chooseMode}
				/>
				<button type="button" className="btn btn-ghost" onClick={onClose}>
					{t.jukeClose}
				</button>
			</div>
		</section>
	);
}
