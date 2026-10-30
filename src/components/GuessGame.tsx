"use client";

import { Check, Play, Timer, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { comboboxKey, useChartCatalog } from "@/components/ChartSearch";
import Link from "@/components/LocaleLink";
import { Announce, SteadyButton } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";
import { GUESS_STEPS, practiceId, shareText } from "@/lib/guess";
import { type BoardRow, formatClock } from "@/lib/guess-board";
import { readLocal, writeLocal } from "@/lib/local-store";
import { localePath } from "@/lib/locale-path";
import { rankSongs } from "@/lib/song-search";
import { fill } from "@/phi/lib/card-i18n";
import type { GuessAnswer } from "@/server/guess";

type Saved = {
	guesses: string[];
	status: "playing" | "won" | "lost";
	answer?: GuessAnswer;
	t0?: number;
	ms?: number;
};

type ServerRun = {
	t0: number;
	guesses: string[];
	status: Saved["status"];
	ms?: number;
};

const keyOf = (puzzle: string) => `phi-guess:v1:${puzzle}`;

function load(puzzle: string): Saved {
	try {
		const raw = readLocal(keyOf(puzzle));
		if (raw) {
			const parsed = JSON.parse(raw) as Saved;
			if (Array.isArray(parsed.guesses)) return parsed;
		}
	} catch {}
	return { guesses: [], status: "playing" };
}

function save(puzzle: string, state: Saved) {
	try {
		writeLocal(keyOf(puzzle), JSON.stringify(state));
	} catch {}
}

function SongGuessInput({
	disabled,
	taken,
	onPick,
}: {
	disabled: boolean;
	taken: ReadonlySet<string>;
	onPick: (id: string) => void;
}) {
	const { m } = useI18n();
	const t = m.guess;
	const catalog = useChartCatalog();
	const ids = useId();
	const root = useRef<HTMLDivElement>(null);
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(-1);
	const list = catalog.status === "ready" ? catalog.list : undefined;
	const trimmed = query.trim();
	const hits = useMemo(
		() => (list && trimmed ? rankSongs(list, trimmed, { limit: 8 }) : []),
		[list, trimmed],
	);
	const expanded = open && hits.length > 0;
	const activeId = expanded && active >= 0 ? `${ids}-o${active}` : undefined;

	const pick = (i: number) => {
		const hit = hits[i];
		if (!hit || taken.has(hit.song.id)) return;
		onPick(hit.song.id);
		setQuery("");
		setOpen(false);
		setActive(-1);
	};

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.nativeEvent.isComposing) return;
		const action = comboboxKey(e.key, e.altKey, {
			expanded,
			active,
			count: hits.length,
			hasQuery: query !== "",
		});
		if (!action) return;
		if (!action.keepDefault) e.preventDefault();
		if (action.pick) return pick(active);
		if (action.clear) setQuery("");
		if (action.open !== undefined) setOpen(action.open);
		if (action.active !== undefined) setActive(action.active);
	};

	return (
		<div className="chart-search guess-input" ref={root}>
			<label className="field-label" htmlFor={`${ids}-q`}>
				{t.inputLabel}
			</label>
			<input
				id={`${ids}-q`}
				className="input"
				type="search"
				role="combobox"
				autoComplete="off"
				spellCheck={false}
				disabled={disabled || !list}
				placeholder={list ? t.placeholder : m.score.loadingCharts}
				value={query}
				aria-autocomplete="list"
				aria-controls={`${ids}-list`}
				aria-expanded={expanded}
				aria-activedescendant={activeId}
				onChange={(e) => {
					setQuery(e.target.value);
					setOpen(true);
					setActive(e.target.value.trim() ? 0 : -1);
				}}
				onFocus={() => setOpen(true)}
				onBlur={(e) => {
					if (!root.current?.contains(e.relatedTarget as Node | null)) {
						setOpen(false);
					}
				}}
				onKeyDown={onKeyDown}
			/>
			<ul
				className="chart-search-list guess-list"
				id={`${ids}-list`}
				// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: ARIA in HTML allows ul[role=listbox]
				role="listbox"
				aria-label={t.inputLabel}
				tabIndex={-1}
				hidden={!expanded}
				onMouseDown={(e) => e.preventDefault()}
			>
				{expanded
					? hits.map((hit, i) => {
							const used = taken.has(hit.song.id);
							return (
								// biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/useFocusableInteractive: aria-activedescendant pattern, keys stay on the input
								<li
									key={hit.song.id}
									id={`${ids}-o${i}`}
									// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: ARIA in HTML allows li[role=option] in a listbox
									role="option"
									aria-selected={i === active}
									aria-disabled={used || undefined}
									className={`guess-option${i === active ? " is-active" : ""}`}
									onClick={() => pick(i)}
								>
									<span className="chart-search-title">{hit.song.song}</span>
									<span className="chart-search-composer">
										{used ? t.already : hit.song.composer}
									</span>
								</li>
							);
						})
					: null}
			</ul>
			<Announce>
				{open && trimmed && list
					? hits.length
						? fill(t.results, { n: hits.length })
						: t.noMatch
					: ""}
			</Announce>
		</div>
	);
}

function Clock({
	t0,
	offset,
	ms,
}: {
	t0?: number;
	offset: number;
	ms?: number;
}) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (ms != null || t0 == null) return;
		const id = window.setInterval(() => setNow(Date.now()), 100);
		return () => window.clearInterval(id);
	}, [t0, ms]);
	const shown = ms ?? (t0 == null ? 0 : now + offset - t0);
	return <span className="guess-clock">{formatClock(shown)}</span>;
}

type Board = { rows: BoardRow[]; total: number; mine?: BoardRow };

function GuessBoard({
	day,
	title,
	version,
}: {
	day: string;
	title: string;
	version: number;
}) {
	const { m } = useI18n();
	const t = m.guess;
	const ids = useId();
	const [board, setBoard] = useState<Board | "failed">();
	useEffect(() => {
		const ac = new AbortController();
		fetch(`/api/guess/board?day=${day}${version ? "&fresh=1" : ""}`, {
			signal: ac.signal,
		})
			.then(async (res) => {
				if (!res.ok) throw new Error(String(res.status));
				setBoard((await res.json()) as Board);
			})
			.catch(() => {
				if (!ac.signal.aborted) setBoard("failed");
			});
		return () => ac.abort();
	}, [day, version]);
	return (
		<section className="song-section guess-board" aria-labelledby={`${ids}-t`}>
			<h2 id={`${ids}-t`}>{title}</h2>
			<p className="field-hint">{t.boardLede}</p>
			{board === "failed" ? (
				<p className="callout">{t.boardFailed}</p>
			) : !board ? (
				<p className="field-hint" role="status">
					{m.me.loading}
				</p>
			) : board.rows.length ? (
				<>
					{board.mine ? (
						<p>
							{fill(t.boardMine, { rank: board.mine.rank, total: board.total })}
						</p>
					) : (
						<p className="field-hint">
							{fill(t.boardMore, { n: board.total })}
						</p>
					)}
					<div className="data-scroll">
						<table className="data-table">
							<thead>
								<tr>
									<th scope="col" className="num">
										#
									</th>
									<th scope="col">{t.boardPlayer}</th>
									<th scope="col" className="num">
										{t.boardTries}
									</th>
									<th scope="col" className="num">
										{t.boardTime}
									</th>
								</tr>
							</thead>
							<tbody>
								{[
									...board.rows,
									...(board.mine && !board.rows.some((r) => r.me)
										? [board.mine]
										: []),
								].map((row, i) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: rows carry no id and names can repeat; the order is the ranking
									<tr key={`${row.rank}:${i}`} data-me={row.me || undefined}>
										<td className="num">{row.rank}</td>
										<th scope="row" className="data-song">
											{row.name}
											{row.me ? (
												<span className="pg-badge">{t.boardYou}</span>
											) : null}
										</th>
										<td className="num">{row.tries}</td>
										<td className="num">{formatClock(row.ms)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			) : (
				<p className="callout">{t.boardEmpty}</p>
			)}
		</section>
	);
}

export function GuessGame({
	puzzle,
	daily,
	label,
	boardTitle,
	signedIn,
	signInHref,
}: {
	puzzle: string;
	daily: boolean;
	label: string;
	boardTitle: string;
	signedIn: boolean;
	signInHref: string;
}) {
	const { m, locale } = useI18n();
	const t = m.guess;
	const router = useRouter();
	const catalog = useChartCatalog();
	const rankId = useId();
	const remote = daily && signedIn;
	const day = daily ? puzzle.slice(2) : "";
	const [state, setState] = useState<Saved>({ guesses: [], status: "playing" });
	const [offset, setOffset] = useState(0);
	const [loaded, setLoaded] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState(false);
	const [said, setSaid] = useState("");
	const [copied, setCopied] = useState(false);
	const [rank, setRank] = useState(true);
	const [boardVersion, setBoardVersion] = useState(0);

	const fromServer = useCallback(
		(body: {
			run?: ServerRun | null;
			now?: number;
			answer?: GuessAnswer;
			ranked?: boolean;
		}) => {
			if (typeof body.now === "number") setOffset(body.now - Date.now());
			if (body.run) {
				setState({
					guesses: body.run.guesses,
					status: body.run.status,
					t0: body.run.t0,
					ms: body.run.ms,
					answer: body.answer,
				});
			}
			if (typeof body.ranked === "boolean") setRank(body.ranked);
		},
		[],
	);

	useEffect(() => {
		if (!remote) {
			setState(load(puzzle));
			setLoaded(true);
			return;
		}
		const ac = new AbortController();
		fetch(`/api/guess/run?p=${encodeURIComponent(puzzle)}`, {
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
	}, [puzzle, remote, fromServer]);

	const names = useMemo(() => {
		const out = new Map<string, string>();
		if (catalog.status === "ready") {
			for (const s of catalog.list) out.set(s.id, s.song);
		}
		return out;
	}, [catalog]);

	const started = state.t0 != null || state.status !== "playing";
	const misses = state.guesses.length - (state.status === "won" ? 1 : 0);
	const step = Math.min(
		GUESS_STEPS - 1,
		state.status === "playing" ? misses : GUESS_STEPS - 1,
	);
	const done = state.status !== "playing";
	const taken = useMemo(() => new Set(state.guesses), [state.guesses]);

	async function start() {
		if (pending) return;
		setError(false);
		if (!remote) {
			const next = { ...state, t0: Date.now() };
			setState(next);
			save(puzzle, next);
			return;
		}
		setPending(true);
		try {
			const res = await fetch("/api/guess/run", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ p: puzzle }),
			});
			if (!res.ok) throw new Error(String(res.status));
			fromServer(await res.json());
		} catch {
			setError(true);
		} finally {
			setPending(false);
		}
	}

	async function submit(guess: string | undefined, giveUp = false) {
		if (pending || done || !started) return;
		setPending(true);
		setError(false);
		try {
			const res = await fetch("/api/guess", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ p: puzzle, guess, step: misses, giveUp, rank }),
			});
			if (!res.ok) throw new Error(String(res.status));
			const body = (await res.json()) as {
				correct?: boolean;
				answer?: GuessAnswer;
				run?: ServerRun;
			};
			let next: Saved;
			if (body.run) {
				next = {
					guesses: body.run.guesses,
					status: body.run.status,
					t0: body.run.t0,
					ms: body.run.ms,
					answer: body.answer,
				};
			} else {
				const guesses = guess ? [...state.guesses, guess] : state.guesses;
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
				save(puzzle, next);
			}
			setState(next);
			if (next.status === "won") setBoardVersion((v) => v + 1);
			setSaid(
				next.status === "won"
					? fill(t.won, { n: next.guesses.length })
					: next.status === "lost"
						? `${t.lost} ${next.answer?.title ?? ""}`
						: fill(t.wrong, { song: names.get(guess ?? "") ?? guess ?? "" }),
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
				body: JSON.stringify({ day, on }),
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
		const text = shareText({
			label: `${t.shareLabel} ${daily ? day : ""}`.trim(),
			tries: state.guesses.length,
			won: state.status === "won",
			url: `${window.location.origin}/guess${daily ? "" : `?p=${puzzle}`}`,
		});
		const timed =
			state.status === "won" && state.ms != null
				? text.replace("\n", ` · ${formatClock(state.ms)}\n`)
				: text;
		try {
			await navigator.clipboard.writeText(timed);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {}
	}

	const practice = () => {
		const id = practiceId((n) => crypto.getRandomValues(new Uint8Array(n)));
		router.push(localePath(`/guess?p=${id}`, locale));
	};

	return (
		<>
			<div className="guess">
				<div className="guess-head">
					<p className="guess-label">{label}</p>
					<p className="guess-clue">
						{fill(t.clue, { n: step + 1, total: GUESS_STEPS })}
					</p>
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
				<div className="guess-frame">
					{loaded && started ? (
						// biome-ignore lint/performance/noImgElement: generated per puzzle and clue by our own API
						<img
							key={`${puzzle}:${step}`}
							src={`/api/guess/image?p=${encodeURIComponent(puzzle)}&s=${step}`}
							alt={fill(t.imageAlt, { n: step + 1, total: GUESS_STEPS })}
							width={640}
							height={360}
						/>
					) : loaded ? (
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
					) : null}
				</div>
				<ol className="guess-steps" aria-label={t.guesses}>
					{Array.from({ length: GUESS_STEPS }, (_, i) => {
						const id = state.guesses[i];
						const hit =
							state.status === "won" && i === state.guesses.length - 1;
						return (
							// biome-ignore lint/suspicious/noArrayIndexKey: six fixed slots, one per try
							<li key={i} data-state={id ? (hit ? "hit" : "miss") : "empty"}>
								{id ? (
									<>
										{hit ? (
											<Check size={16} weight="bold" aria-hidden />
										) : (
											<X size={16} weight="bold" aria-hidden />
										)}
										<span>{names.get(id) ?? id}</span>
									</>
								) : (
									<span className="sr-only">—</span>
								)}
							</li>
						);
					})}
				</ol>

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
				) : daily ? (
					<p className="field-hint">
						{t.signInToRank}{" "}
						<Link href={signInHref} prefetch={false}>
							{t.signIn}
						</Link>
					</p>
				) : null}

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
						<div className="guess-answer-card">
							{state.answer.jacket ? (
								// biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain
								<img
									src={state.answer.jacket}
									alt=""
									width={320}
									height={169}
								/>
							) : null}
							<div>
								<p className="guess-answer-title">{state.answer.title}</p>
								<p className="field-hint">{state.answer.composer}</p>
								<Link href={state.answer.path} prefetch={false}>
									{t.openSong}
								</Link>
							</div>
						</div>
						<div className="tool-pop-actions">
							<SteadyButton
								className="btn-primary"
								type="button"
								labels={[t.share, t.copied]}
								onClick={() => void copyResult()}
							>
								{copied ? t.copied : t.share}
							</SteadyButton>
							<button
								type="button"
								className="btn btn-ghost"
								onClick={practice}
							>
								{t.newPractice}
							</button>
						</div>
						{daily ? <p className="field-hint">{t.tomorrow}</p> : null}
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
							onClick={() => void submit(undefined, true)}
						>
							{t.giveUp}
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
			{daily ? (
				<GuessBoard day={day} title={boardTitle} version={boardVersion} />
			) : null}
		</>
	);
}
