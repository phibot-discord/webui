"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChartCatalog } from "@/components/ChartSearch";
import { SongGuessInput } from "@/components/GuessGame";
import { Play, X } from "@/components/icons";
import Link from "@/components/LocaleLink";
import { useI18n } from "@/i18n/provider";
import { EAR_PARAM, EAR_STEPS, earSeconds } from "@/lib/guess-ear";
import { fill } from "@/phi/lib/card-i18n";
import type { GuessAnswer } from "@/server/guess";

type Status = "playing" | "won" | "lost";
type Sound = "idle" | "loading" | "playing" | "failed" | "unsupported";

function silence(node: AudioBufferSourceNode | null) {
	if (!node) return;
	node.onended = null;
	try {
		node.stop();
	} catch {}
}

export function EarGame({ puzzle }: { puzzle: string }) {
	const { m } = useI18n();
	const t = m.guess;
	const catalog = useChartCatalog();
	const [step, setStep] = useState(0);
	const [guesses, setGuesses] = useState<string[]>([]);
	const [status, setStatus] = useState<Status>("playing");
	const [answer, setAnswer] = useState<GuessAnswer | null>(null);
	const [sound, setSound] = useState<Sound>("idle");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(false);
	const ctx = useRef<AudioContext | null>(null);
	const clips = useRef(new Map<number, AudioBuffer>());
	const source = useRef<AudioBufferSourceNode | null>(null);
	const ticket = useRef(0);

	const names = useMemo(() => {
		const out = new Map<string, string>();
		if (catalog.status === "ready") {
			for (const s of catalog.list) out.set(s.id, s.song);
		}
		return out;
	}, [catalog]);
	const taken = useMemo(() => new Set(guesses), [guesses]);
	const done = status !== "playing";

	useEffect(() => {
		if (status === "playing") return;
		ticket.current++;
		const node = source.current;
		source.current = null;
		silence(node);
		setSound((s) => (s === "playing" || s === "loading" ? "idle" : s));
	}, [status]);

	useEffect(
		() => () => {
			ticket.current++;
			const node = source.current;
			source.current = null;
			silence(node);
			const audio = ctx.current;
			ctx.current = null;
			if (audio) void audio.close().catch(() => {});
		},
		[],
	);

	async function play() {
		const at = step;
		const id = ++ticket.current;
		let audio = ctx.current;
		if (!audio) {
			if (typeof AudioContext === "undefined") {
				setSound("unsupported");
				return;
			}
			audio = new AudioContext();
			ctx.current = audio;
		}
		try {
			await audio.resume();
		} catch {}
		const playing = source.current;
		source.current = null;
		silence(playing);
		let clip = clips.current.get(at);
		if (!clip) {
			setSound("loading");
			let data: ArrayBuffer;
			try {
				const res = await fetch(
					`/api/guess/ear?${new URLSearchParams({ p: puzzle, s: String(at) })}`,
				);
				if (!res.ok) throw new Error(String(res.status));
				data = await res.arrayBuffer();
			} catch {
				if (id === ticket.current) setSound("failed");
				return;
			}
			try {
				clip = await audio.decodeAudioData(data);
			} catch {
				if (id === ticket.current) setSound("unsupported");
				return;
			}
			clips.current.set(at, clip);
		}
		if (id !== ticket.current || ctx.current !== audio) return;
		const gain = audio.createGain();
		gain.gain.value = 0.8;
		gain.connect(audio.destination);
		const node = audio.createBufferSource();
		node.buffer = clip;
		node.connect(gain);
		node.onended = () => {
			if (source.current !== node) return;
			source.current = null;
			setSound("idle");
		};
		source.current = node;
		node.start(0, 0, earSeconds(at));
		setSound("playing");
	}

	async function judge(guess?: string) {
		if (busy || done) return;
		setBusy(true);
		setError(false);
		try {
			const res = await fetch("/api/guess/ear", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ p: puzzle, guess, step }),
			});
			if (!res.ok) throw new Error(String(res.status));
			const body = (await res.json()) as {
				correct?: boolean;
				answer?: GuessAnswer;
			};
			if (body.correct) {
				setAnswer(body.answer ?? null);
				setStatus("won");
				return;
			}
			if (guess) setGuesses((list) => [...list, guess]);
			if (body.answer) {
				setAnswer(body.answer);
				setStatus("lost");
			} else {
				setStep((s) => Math.min(EAR_STEPS - 1, s + 1));
			}
		} catch {
			setError(true);
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="guess">
			<p className="guess-label">{t.earLabel}</p>
			{done ? null : (
				<>
					<p className="ear-clue" role="status">
						{fill(t.earClue, {
							n: step + 1,
							total: EAR_STEPS,
							seconds: earSeconds(step),
						})}
					</p>
					<p>
						<button
							type="button"
							className="btn btn-primary"
							disabled={sound === "loading"}
							onClick={() => void play()}
						>
							<Play size={18} weight="fill" aria-hidden />
							{sound === "playing"
								? t.earPlaying
								: sound === "loading"
									? t.earLoading
									: t.earPlay}
						</button>
					</p>
					{sound === "failed" || sound === "unsupported" ? (
						<p className="callout" role="status">
							{sound === "failed" ? t.earFailed : t.earNoAudio}
						</p>
					) : null}
					<div className="guess-play">
						<SongGuessInput
							disabled={busy || status !== "playing"}
							taken={taken}
							onPick={(id) => void judge(id)}
						/>
						<button
							type="button"
							className="btn btn-ghost"
							disabled={busy}
							onClick={() => void judge()}
						>
							{t.earSkip}
						</button>
					</div>
				</>
			)}
			{guesses.length ? (
				<ol className="guess-steps" aria-label={t.guesses}>
					{guesses.map((id) => (
						<li key={id} data-state="miss">
							<X size={16} weight="bold" aria-hidden />
							<span>{names.get(id) ?? id}</span>
						</li>
					))}
				</ol>
			) : null}
			{done && answer ? (
				<section className="guess-answer" aria-live="polite">
					<p className="guess-verdict">
						{status === "won" ? fill(t.won, { n: step + 1 }) : t.lost}
					</p>
					<div className="guess-answer-card">
						{answer.jacket ? (
							// biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain
							<img src={answer.jacket} alt="" width={320} height={169} />
						) : null}
						<div>
							<p className="guess-answer-title">{answer.title}</p>
							<p className="field-hint">{answer.composer}</p>
							<Link href={answer.path} prefetch={false}>
								{t.openSong}
							</Link>
						</div>
					</div>
					<div className="tool-pop-actions">
						<Link
							className="btn btn-primary"
							href={`/guess?${EAR_PARAM}=new`}
							prefetch={false}
						>
							{t.earNew}
						</Link>
					</div>
				</section>
			) : null}
			{error ? (
				<p className="field-error" role="alert">
					{t.failed}
				</p>
			) : null}
		</div>
	);
}
