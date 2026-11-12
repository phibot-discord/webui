"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/LocaleLink";
import { SegRadio } from "@/components/SegRadio";
import { useI18n } from "@/i18n/provider";
import { readLocal, writeLocal } from "@/lib/local-store";
import {
	BPM_CHOICES,
	beatTimes,
	COUNT_IN,
	countAtMost,
	SPEED_SECONDS,
	STEADY_BEATS,
	type Steadiness,
	steadiness,
	tapErrors,
	tapSpeed,
} from "@/lib/timing-test";
import { fill } from "@/phi/lib/card-i18n";

type Mode = "steady" | "speed";
type Phase = "idle" | "running" | "done";
type Bpm = (typeof BPM_CHOICES)[number];
type Speed = ReturnType<typeof tapSpeed>;

const MODES: readonly Mode[] = ["steady", "speed"];
const BPM_KEY = "webTimingBpm";
const MIN_HITS = 8;
const LEAD = 0.3;
const CLICK = 0.03;

function isBpm(v: number): v is Bpm {
	return (BPM_CHOICES as readonly number[]).includes(v);
}

function audioConstructor(): typeof AudioContext | undefined {
	if (typeof window === "undefined") return undefined;
	return (
		window.AudioContext ??
		(window as unknown as { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext
	);
}

function outputDelay(audio: AudioContext): number {
	return audio.outputLatency || audio.baseLatency || 0;
}

function tapTime(audio: AudioContext | null, stamp: number): number {
	if (!audio) return 0;
	const mark = audio.getOutputTimestamp?.();
	if (mark?.performanceTime && mark.contextTime !== undefined)
		return mark.contextTime + (stamp - mark.performanceTime) / 1000;
	return audio.currentTime - outputDelay(audio);
}

function click(audio: AudioContext, out: AudioNode, at: number, high: boolean) {
	const osc = audio.createOscillator();
	osc.frequency.value = high ? 1500 : 1000;
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.5, at);
	gain.gain.exponentialRampToValueAtTime(0.001, at + CLICK);
	osc.connect(gain).connect(out);
	osc.start(at);
	osc.stop(at + CLICK);
}

export function TimingTest({ densities }: { densities: number[] }) {
	const { locale, m } = useI18n();
	const t = m.timing;
	const [mode, setMode] = useState<Mode>("steady");
	const [bpm, setBpm] = useState<Bpm>(120);
	const [phase, setPhase] = useState<Phase>("idle");
	const [beat, setBeat] = useState(-1);
	const [result, setResult] = useState<Steadiness | Speed | null>(null);
	const [unsupported, setUnsupported] = useState(false);
	const ctx = useRef<AudioContext | null>(null);
	const bus = useRef<GainNode | null>(null);
	const taps = useRef<number[]>([]);
	const beats = useRef<number[]>([]);
	const startedAt = useRef<number | null>(null);
	const timer = useRef<(() => void) | null>(null);
	const job = useRef(0);
	const live = useRef<Mode | null>(null);
	const pad = useRef<HTMLButtonElement>(null);
	const running = phase === "running";

	useEffect(() => {
		const saved = Number(readLocal(BPM_KEY));
		if (isBpm(saved)) setBpm(saved);
	}, []);

	const halt = useCallback(() => {
		job.current++;
		live.current = null;
		timer.current?.();
		timer.current = null;
		bus.current?.disconnect();
		bus.current = null;
		startedAt.current = null;
	}, []);

	useEffect(
		() => () => {
			halt();
			const audio = ctx.current;
			ctx.current = null;
			if (audio) void audio.close().catch(() => {});
		},
		[halt],
	);

	const finishSteady = useCallback(() => {
		const got = steadiness(tapErrors(beats.current, taps.current));
		halt();
		setBeat(-1);
		setResult(got);
		setPhase("done");
	}, [halt]);

	const finishSpeed = useCallback(() => {
		const from = startedAt.current ?? 0;
		const got = tapSpeed(
			taps.current.map((at) => at - from).filter((at) => at < SPEED_SECONDS),
			SPEED_SECONDS,
		);
		halt();
		setResult(got);
		setPhase("done");
	}, [halt]);

	const tap = useCallback(
		(stamp: number) => {
			if (live.current === "steady") {
				taps.current.push(tapTime(ctx.current, stamp));
				return;
			}
			if (live.current !== "speed") return;
			const at = stamp / 1000;
			if (startedAt.current === null) {
				startedAt.current = at;
				const id = window.setTimeout(finishSpeed, SPEED_SECONDS * 1000);
				timer.current = () => window.clearTimeout(id);
			}
			taps.current.push(at);
		},
		[finishSpeed],
	);

	useEffect(() => {
		if (!running) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.repeat || e.key === "Tab" || e.key === "Escape") return;
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			if (e.key === " ") e.preventDefault();
			tap(e.timeStamp);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [running, tap]);

	const begin = (kind: Mode) => {
		live.current = kind;
		setPhase("running");
		pad.current?.focus();
	};

	const start = async () => {
		if (running) return;
		halt();
		taps.current = [];
		setResult(null);
		setBeat(-1);
		setPhase("idle");
		if (mode === "speed") {
			begin("speed");
			return;
		}
		const Ctor = audioConstructor();
		let audio = ctx.current;
		if (!audio) {
			try {
				audio = Ctor ? new Ctor({ latencyHint: "interactive" }) : null;
			} catch {
				audio = null;
			}
			if (!audio) {
				setUnsupported(true);
				return;
			}
			ctx.current = audio;
		}
		const ticket = job.current;
		try {
			await audio.resume();
		} catch {}
		if (ticket !== job.current || ctx.current !== audio) return;
		if (audio.state !== "running") {
			setUnsupported(true);
			return;
		}
		setUnsupported(false);
		const out = audio.createGain();
		out.connect(audio.destination);
		bus.current = out;
		const clicks = beatTimes(
			audio.currentTime + LEAD,
			bpm,
			COUNT_IN + STEADY_BEATS,
		);
		clicks.forEach((at, i) => {
			click(audio, out, at, i < COUNT_IN);
		});
		beats.current = clicks.slice(COUNT_IN);
		const end = (clicks.at(-1) ?? 0) + 30 / bpm;
		begin("steady");
		const frame = () => {
			if (ticket !== job.current) return;
			const now = tapTime(audio, performance.now());
			setBeat(countAtMost(clicks, now) - 1);
			if (now >= end) {
				finishSteady();
				return;
			}
			const id = requestAnimationFrame(frame);
			timer.current = () => cancelAnimationFrame(id);
		};
		frame();
	};

	const stop = () => {
		halt();
		taps.current = [];
		setBeat(-1);
		setPhase("idle");
	};

	const chooseMode = (next: Mode) => {
		if (running) return;
		setMode(next);
		setResult(null);
		setPhase("idle");
	};

	const chooseBpm = (next: Bpm) => {
		if (running) return;
		setBpm(next);
		writeLocal(BPM_KEY, String(next));
	};

	const shown = phase === "done" ? result : null;
	const hint =
		mode === "steady"
			? `${fill(t.steadyHint, { beats: STEADY_BEATS, bpm })}${locale === "en" ? " " : ""}${t.countIn}`
			: fill(t.speedHint, { seconds: SPEED_SECONDS });

	return (
		<>
			<SegRadio
				legend={t.mode}
				value={mode}
				options={MODES.map((value) => ({
					value,
					label: t.modes[value],
					disabled: running,
				}))}
				onChange={chooseMode}
			/>
			{mode === "steady" ? (
				<SegRadio
					legend={t.bpm}
					value={bpm}
					options={BPM_CHOICES.map((value) => ({
						value,
						label: String(value),
						disabled: running,
					}))}
					onChange={chooseBpm}
				/>
			) : null}
			<p className="field-hint">{hint}</p>
			{running ? (
				<button type="button" className="btn btn-ghost" onClick={stop}>
					{t.stop}
				</button>
			) : (
				<button
					type="button"
					className="btn btn-primary"
					onClick={() => void start()}
				>
					{shown ? t.again : t.start}
				</button>
			)}
			<button
				ref={pad}
				type="button"
				className="timing-pad"
				data-beat={
					running && mode === "steady" && beat >= 0 ? beat % 2 : undefined
				}
				onPointerDown={(e) => tap(e.timeStamp)}
			>
				{t.pad}
			</button>
			<div role="status">
				{shown && "spread" in shown ? (
					shown.taps < MIN_HITS ? (
						<p className="callout">{t.tooFew}</p>
					) : (
						<>
							<p className="timing-big">
								{fill(t.spread, { ms: Math.round(shown.spread) })}
							</p>
							<p>
								{Math.abs(shown.mean) < 5
									? t.onTime
									: fill(t.lean, {
											ms: Math.round(Math.abs(shown.mean)),
											side: shown.mean < 0 ? t.early : t.late,
										})}
							</p>
							<p>
								{fill(t.hits, { n: shown.taps, total: STEADY_BEATS })}
								{shown.missed
									? ` · ${fill(t.missed, { n: shown.missed })}`
									: null}
							</p>
							<ul>
								{t.windows.map((line, i) => (
									<li key={line}>{fill(line, { n: shown.within[i] ?? 0 })}</li>
								))}
							</ul>
							<p className="field-hint">{t.windowsNote}</p>
						</>
					)
				) : shown ? (
					<>
						<p className="timing-big">
							{fill(t.speed, { n: shown.perSecond.toFixed(1) })}
						</p>
						<p>{fill(t.bestSecond, { n: shown.bestSecond })}</p>
						{densities.length ? (
							<>
								<p>
									{fill(t.density, {
										n: countAtMost(densities, shown.perSecond),
										total: densities.length,
									})}
								</p>
								<p>
									<Link href="/charts">{t.browse}</Link>
								</p>
							</>
						) : null}
					</>
				) : null}
			</div>
			<p className="field-hint">{t.caveat}</p>
			{unsupported ? <p className="callout">{t.noAudio}</p> : null}
		</>
	);
}
