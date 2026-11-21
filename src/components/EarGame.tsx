"use client";

import { useRouter } from "next/navigation";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { useChartCatalog } from "@/components/ChartSearch";
import {
	Clock,
	fromRun,
	GuessAnswerCard,
	GuessBoard,
	GuessSteps,
	readSaved,
	resultText,
	type Saved,
	type ServerReply,
	SongGuessInput,
	writeSaved,
} from "@/components/GuessGame";
import { Play, Timer, X } from "@/components/icons";
import Link from "@/components/LocaleLink";
import { Announce, SteadyButton } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";
import { formatClock, runStep, SKIPPED } from "@/lib/guess-board";
import { EAR_PARAM, EAR_STEPS, earSeconds } from "@/lib/guess-ear";
import { EAR_DAILY } from "@/lib/guess-view";
import { fill } from "@/phi/lib/card-i18n";
import type { GuessAnswer } from "@/server/guess";

type Status = "playing" | "won" | "lost";
type Sound = "idle" | "loading" | "playing" | "failed" | "unsupported";
type Decoded = AudioBuffer | "failed" | "unsupported";

const PROBE_URL = "/api/guess/ear?probe=1";
const earKey = (puzzle: string) => `phi-guess-ear:v1:${puzzle}`;
const clipUrl = (puzzle: string, step: number) =>
	`/api/guess/ear?${new URLSearchParams({ p: puzzle, s: String(step) })}`;

function silence(node: AudioBufferSourceNode | null) {
	if (!node) return;
	node.onended = null;
	try {
		node.stop();
	} catch {}
}

function useSongNames() {
	const catalog = useChartCatalog();
	return useMemo(() => {
		const out = new Map<string, string>();
		if (catalog.status === "ready") {
			for (const s of catalog.list) out.set(s.id, s.song);
		}
		return out;
	}, [catalog]);
}

function useEarAudio() {
	const ctx = useRef<AudioContext | null>(null);
	const clips = useRef(new Map<string, Promise<Decoded>>());
	const ready = useRef(new Set<string>());
	const source = useRef<AudioBufferSourceNode | null>(null);
	const ticket = useRef(0);
	const [sound, setSound] = useState<Sound>("idle");

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

	const stop = useCallback(() => {
		ticket.current++;
		const node = source.current;
		source.current = null;
		silence(node);
		setSound((s) => (s === "playing" || s === "loading" ? "idle" : s));
	}, []);

	const open = useCallback(async () => {
		let audio = ctx.current;
		if (!audio) {
			if (typeof AudioContext === "undefined") return undefined;
			audio = new AudioContext();
			ctx.current = audio;
		}
		try {
			await audio.resume();
		} catch {}
		return audio;
	}, []);

	const decode = useCallback(
		(audio: AudioContext, url: string): Promise<Decoded> => {
			const hit = clips.current.get(url);
			if (hit) return hit;
			const job = (async (): Promise<Decoded> => {
				let data: ArrayBuffer;
				try {
					const res = await fetch(url);
					if (!res.ok) throw new Error(String(res.status));
					data = await res.arrayBuffer();
				} catch {
					return "failed";
				}
				try {
					return await audio.decodeAudioData(data);
				} catch {
					return "unsupported";
				}
			})();
			clips.current.set(url, job);
			void job.then((clip) => {
				if (typeof clip !== "string") ready.current.add(url);
				else if (clips.current.get(url) === job) clips.current.delete(url);
			});
			return job;
		},
		[],
	);

	const play = useCallback(
		async (url: string, seconds: number) => {
			const id = ++ticket.current;
			const audio = await open();
			if (!audio) {
				setSound("unsupported");
				return;
			}
			const playing = source.current;
			source.current = null;
			silence(playing);
			if (!ready.current.has(url)) setSound("loading");
			const clip = await decode(audio, url);
			if (typeof clip === "string") {
				if (id === ticket.current) setSound(clip);
				return;
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
			node.start(0, 0, seconds);
			setSound("playing");
		},
		[open, decode],
	);

	const check = useCallback(
		async (url: string): Promise<boolean> => {
			const audio = await open();
			if (!audio) {
				setSound("unsupported");
				return false;
			}
			setSound("loading");
			const clip = await decode(audio, url);
			setSound(typeof clip === "string" ? clip : "idle");
			return typeof clip !== "string";
		},
		[open, decode],
	);

	const preload = useCallback(
		(url: string) => {
			const audio = ctx.current;
			if (audio) void decode(audio, url);
		},
		[decode],
	);

	return { sound, play, stop, check, preload };
}

function PlayButton({
	sound,
	disabled,
	onPlay,
}: {
	sound: Sound;
	disabled?: boolean;
	onPlay: () => void;
}) {
	const { m } = useI18n();
	const t = m.guess;
	return (
		<button
			type="button"
			className="btn btn-primary"
			disabled={disabled || sound === "loading"}
			onClick={onPlay}
		>
			<Play size={18} weight="fill" aria-hidden />
			{sound === "playing"
				? t.earPlaying
				: sound === "loading"
					? t.earLoading
					: t.earPlay}
		</button>
	);
}

function SoundTrouble({ sound }: { sound: Sound }) {
	const { m } = useI18n();
	if (sound !== "failed" && sound !== "unsupported") return null;
	return (
		<p className="callout" role="status">
			{sound === "failed" ? m.guess.earFailed : m.guess.earNoAudio}
		</p>
	);
}

function EarPractice({ puzzle, label }: { puzzle: string; label: string }) {
	const { m } = useI18n();
	const t = m.guess;
	const names = useSongNames();
	const [step, setStep] = useState(0);
	const [guesses, setGuesses] = useState<string[]>([]);
	const [status, setStatus] = useState<Status>("playing");
	const [answer, setAnswer] = useState<GuessAnswer | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(false);
	const { sound, play, stop } = useEarAudio();
	const taken = useMemo(() => new Set(guesses), [guesses]);
	const done = status !== "playing";

	useEffect(() => {
		if (status !== "playing") stop();
	}, [status, stop]);

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
			<p className="guess-label">{label}</p>
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
						<PlayButton
							sound={sound}
							onPlay={() => void play(clipUrl(puzzle, step), earSeconds(step))}
						/>
					</p>
					<SoundTrouble sound={sound} />
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
					<GuessAnswerCard answer={answer} />
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

type Move = "guess" | "skip" | "giveUp";

function EarDaily({
	puzzle,
	live,
	label,
	boardTitle,
	signedIn,
	signInHref,
}: {
	puzzle: string;
	live: boolean;
	label: string;
	boardTitle: string;
	signedIn: boolean;
	signInHref: string;
}) {
	const { m } = useI18n();
	const t = m.guess;
	const router = useRouter();
	const names = useSongNames();
	const rankId = useId();
	const remote = live && signedIn;
	const locked = live && !signedIn;
	const day = puzzle.slice(2);
	const [state, setState] = useState<Saved>({ guesses: [], status: "playing" });
	const [offset, setOffset] = useState(0);
	const [loaded, setLoaded] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState(false);
	const [said, setSaid] = useState("");
	const [copied, setCopied] = useState(false);
	const [rank, setRank] = useState(true);
	const [boardVersion, setBoardVersion] = useState(0);
	const { sound, play, stop, check, preload } = useEarAudio();

	const fromServer = useCallback((body: ServerReply) => {
		if (typeof body.now === "number") setOffset(body.now - Date.now());
		if (body.run) setState(fromRun({ ...body, run: body.run }));
		if (typeof body.ranked === "boolean") setRank(body.ranked);
	}, []);

	useEffect(() => {
		if (locked) {
			setLoaded(true);
			return;
		}
		if (!remote) {
			setState(readSaved(earKey(puzzle)));
			setLoaded(true);
			return;
		}
		const ac = new AbortController();
		fetch(`/api/guess/run?${new URLSearchParams({ p: puzzle, game: "ear" })}`, {
			signal: ac.signal,
		})
			.then((res) => res.json())
			.then((body) => {
				fromServer(body);
				setLoaded(true);
			})
			.catch(() => {
				if (!ac.signal.aborted) {
					setError(true);
					setLoaded(true);
				}
			});
		return () => ac.abort();
	}, [puzzle, remote, locked, fromServer]);

	const started = state.t0 != null || state.status !== "playing";
	const misses = state.guesses.length - (state.status === "won" ? 1 : 0);
	const step = Math.min(
		EAR_STEPS - 1,
		state.status === "playing" ? misses : EAR_STEPS - 1,
	);
	const done = state.status !== "playing";
	const last = step >= EAR_STEPS - 1;
	const taken = useMemo(() => new Set(state.guesses), [state.guesses]);
	const clue = remote ? state.clue : clipUrl(puzzle, step);

	useEffect(() => {
		if (done) stop();
	}, [done, stop]);

	useEffect(() => {
		if (started && !done && clue) preload(clue);
	}, [started, done, clue, preload]);

	async function start() {
		if (pending) return;
		setError(false);
		setPending(true);
		try {
			if (!(await check(remote ? PROBE_URL : clipUrl(puzzle, 0)))) return;
			if (!remote) {
				const next = { ...state, t0: Date.now() };
				setState(next);
				writeSaved(earKey(puzzle), next);
				void play(clipUrl(puzzle, 0), earSeconds(0));
				return;
			}
			const res = await fetch("/api/guess/run", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ p: puzzle, game: "ear" }),
			});
			if (!res.ok) throw new Error(String(res.status));
			const body = (await res.json()) as ServerReply;
			fromServer(body);
			if (!body.run) router.refresh();
			else if (body.run.status === "playing" && body.clue) {
				void play(body.clue, earSeconds(runStep(body.run)));
			}
		} catch {
			setError(true);
		} finally {
			setPending(false);
		}
	}

	async function submit(guess: string | undefined, move: Move = "guess") {
		if (pending || done || !started) return;
		setPending(true);
		setError(false);
		const skip = move === "skip";
		try {
			const res = await fetch("/api/guess/ear", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					p: puzzle,
					guess,
					step: misses,
					skip,
					giveUp: move === "giveUp",
					rank,
				}),
			});
			if (!res.ok) throw new Error(String(res.status));
			const body = (await res.json()) as ServerReply & { correct?: boolean };
			let next: Saved;
			if (body.run) {
				next = fromRun({ ...body, run: body.run });
			} else {
				const guesses = skip
					? [...state.guesses, SKIPPED]
					: guess
						? [...state.guesses, guess]
						: state.guesses;
				const status = body.correct ? "won" : body.answer ? "lost" : "playing";
				next = {
					...state,
					guesses,
					status,
					answer: body.answer,
					...(status === "won" && state.t0 != null
						? { ms: Date.now() - state.t0 }
						: {}),
				};
				writeSaved(earKey(puzzle), next);
			}
			setState(next);
			if (next.status === "won" && typeof body.ranked === "boolean") {
				setRank(body.ranked);
			}
			if (next.status === "won") setBoardVersion((v) => v + 1);
			setSaid(
				next.status === "won"
					? fill(t.won, { n: next.guesses.length })
					: next.status === "lost"
						? `${t.lost} ${next.answer?.title ?? ""}`
						: guess
							? fill(t.wrong, { song: names.get(guess) ?? guess })
							: "",
			);
		} catch {
			setError(true);
		} finally {
			setPending(false);
		}
	}

	async function changeRank(on: boolean) {
		setRank(on);
		if (!remote || state.status !== "won") return;
		try {
			const res = await fetch("/api/guess/board", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ day, on, game: "ear" }),
			});
			if (!res.ok) throw new Error(String(res.status));
			const body = (await res.json()) as { ranked?: boolean };
			setRank(Boolean(body.ranked));
			setBoardVersion((v) => v + 1);
		} catch {
			setRank(!on);
			setError(true);
		}
	}

	async function copyResult() {
		const text = resultText(
			`${t.earShareLabel} ${day}`,
			state,
			`${window.location.origin}/guess?${EAR_PARAM}=${EAR_DAILY}`,
		);
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {}
	}

	return (
		<>
			<div className="guess">
				<div className="guess-head">
					<p className="guess-label">{label}</p>
					<p className="guess-time">
						<Timer size={16} weight="bold" aria-hidden />
						<span className="sr-only">{t.time} </span>
						<Clock
							t0={state.t0}
							offset={offset}
							ms={done ? (state.ms ?? 0) : undefined}
						/>
					</p>
				</div>
				{done ? null : (
					<div className="guess-frame ear-frame">
						{locked ? (
							<div className="guess-start">
								<Link
									className="btn btn-primary"
									href={signInHref}
									prefetch={false}
								>
									{t.signIn}
								</Link>
								<p>{t.signInToPlay}</p>
							</div>
						) : !loaded ? null : started ? (
							<div className="guess-start">
								<PlayButton
									sound={sound}
									disabled={!clue}
									onPlay={() => {
										if (clue) void play(clue, earSeconds(step));
									}}
								/>
								<p role="status">
									{fill(t.earClue, {
										n: step + 1,
										total: EAR_STEPS,
										seconds: earSeconds(step),
									})}
								</p>
							</div>
						) : (
							<div className="guess-start">
								<button
									type="button"
									className="btn btn-primary"
									disabled={pending}
									onClick={() => void start()}
								>
									<Play size={18} weight="fill" aria-hidden />
									{t.start}
								</button>
								<p>{t.startHint}</p>
							</div>
						)}
					</div>
				)}
				{done ? null : <SoundTrouble sound={sound} />}
				<GuessSteps
					guesses={state.guesses}
					won={state.status === "won"}
					label={(id) =>
						id === SKIPPED ? t.earSkipped : (names.get(id) ?? id)
					}
				/>

				{remote ? (
					<div className="guess-rank">
						<label className="opt-check" htmlFor={rankId}>
							<input
								id={rankId}
								type="checkbox"
								checked={rank}
								disabled={state.status === "lost"}
								aria-describedby={`${rankId}-hint`}
								onChange={(e) => void changeRank(e.target.checked)}
							/>
							{t.rankMe}
						</label>
						<p className="field-hint" id={`${rankId}-hint`}>
							{t.rankHint}
						</p>
					</div>
				) : live ? null : (
					<p className="field-hint">{t.pastUnranked}</p>
				)}

				{done && state.answer ? (
					<section className="guess-answer" aria-live="polite">
						<p className="guess-verdict">
							{state.status === "won"
								? state.ms != null
									? fill(t.wonIn, {
											n: state.guesses.length,
											time: formatClock(state.ms),
										})
									: fill(t.won, { n: state.guesses.length })
								: t.lost}
						</p>
						<GuessAnswerCard answer={state.answer} />
						<div className="tool-pop-actions">
							<SteadyButton
								className="btn-primary"
								type="button"
								labels={[t.share, t.copied]}
								onClick={() => void copyResult()}
							>
								{copied ? t.copied : t.share}
							</SteadyButton>
							<Link
								className="btn btn-ghost"
								href={`/guess?${EAR_PARAM}=new`}
								prefetch={false}
							>
								{t.earNew}
							</Link>
						</div>
						<p className="field-hint">{t.tomorrow}</p>
					</section>
				) : started ? (
					<div className="guess-play">
						<SongGuessInput
							disabled={pending || !loaded}
							taken={taken}
							onPick={(id) => void submit(id)}
						/>
						<button
							type="button"
							className="btn btn-ghost"
							disabled={pending || !loaded}
							onClick={() => void submit(undefined, last ? "giveUp" : "skip")}
						>
							{last ? t.giveUp : t.earSkip}
						</button>
					</div>
				) : null}
				{error ? (
					<p className="field-error" role="alert">
						{t.failed}
					</p>
				) : null}
				<Announce>{said}</Announce>
			</div>
			<GuessBoard
				day={day}
				title={boardTitle}
				version={boardVersion}
				game="ear"
			/>
		</>
	);
}

export function EarGame({
	puzzle,
	daily,
	live,
	label,
	boardTitle,
	signedIn,
	signInHref,
}: {
	puzzle: string;
	daily: boolean;
	live: boolean;
	label: string;
	boardTitle: string;
	signedIn: boolean;
	signInHref: string;
}) {
	return daily ? (
		<EarDaily
			puzzle={puzzle}
			live={live}
			label={label}
			boardTitle={boardTitle}
			signedIn={signedIn}
			signInHref={signInHref}
		/>
	) : (
		<EarPractice puzzle={puzzle} label={label} />
	);
}
