"use client";

import {
	ArrowRight,
	ArrowSquareOut,
	Info,
	MagnifyingGlass,
	X,
} from "@phosphor-icons/react";
import Form from "next/form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
	type FormEvent,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
	type RefObject,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { useChartCatalog } from "@/components/ChartSearch";
import { Announce } from "@/components/Tool";
import type { Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";
import { CHART_LEVELS, type ChartSummary } from "@/lib/chart-catalog";
import { looseFold, rankSongs, type SongMatch } from "@/lib/song-search";

export type SongLookupInitial = {
	q: string;
	total: number;
	hits: SongMatch<ChartSummary>[];
	/** The server could not load the song list */
	failed?: true;
};

/** A suggested query and the titles it finds exactly */
export type SongLookupExample = { q: string; songs: string[] };

type Ranked = Omit<SongLookupInitial, "failed">;
type Text = Messages["songs"];

const PHIB19 = "https://www.phib19.top";
/** Typing has paused this long before the URL and the screen reader catch up */
const SETTLE_MS = 400;

const noSubscribe = () => () => {};

/** False in the server HTML and until hydration, then true */
function useHydrated(): boolean {
	return useSyncExternalStore(
		noSubscribe,
		() => true,
		() => false,
	);
}

function songsHref(q: string): string {
	return q ? `/songs?${new URLSearchParams({ q })}` : "/songs";
}

function clip(raw: string | null, max: number): string {
	return (raw ?? "").trim().slice(0, max);
}

function fill(text: string, values: Record<string, string | number>): string {
	let out = text;
	for (const [key, value] of Object.entries(values)) {
		out = out.replaceAll(`{${key}}`, String(value));
	}
	return out;
}

/** Updates `?q=` in place: no history entry and no server round trip */
function replaceQuery(written: RefObject<string>, q: string) {
	if (q === written.current) return;
	written.current = q;
	window.history.replaceState(null, "", songsHref(q));
}

/** Kana reads as Japanese, other Han text as Chinese, so screen readers pick a voice */
function langOf(text: string): string | undefined {
	if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)) return "ja";
	if (/\p{Script=Han}/u.test(text)) return "zh-CN";
	return;
}

function heading(t: Text, r: Ranked): string {
	if (!r.total) return fill(t.none, { q: r.q });
	if (r.total > r.hits.length) {
		return fill(t.countTop, { q: r.q, n: r.total, shown: r.hits.length });
	}
	return fill(r.total === 1 ? t.countOne : t.count, { q: r.q, n: r.total });
}

/** Exact hits that carry the query as a nickname: "Ad" names three songs */
function sharedBy(r: Ranked): number {
	const key = looseFold(r.q);
	return r.hits.filter(
		(hit) =>
			hit.tier === 0 && hit.song.aliases?.some((a) => looseFold(a) === key),
	).length;
}

/** Why a song is listed, unless the title itself matched */
function viaLabel(t: Text, hit: SongMatch<ChartSummary>): string | undefined {
	const { tier, via } = hit;
	if (tier === 4) return fill(t.viaFuzzy, { text: via.text });
	if (via.kind === "alias") return fill(t.viaAlias, { text: via.text });
	if (via.kind === "composer") return t.viaComposer;
	if (via.kind === "id") return t.viaId;
	return;
}

function hardest(song: ChartSummary) {
	return [...CHART_LEVELS].reverse().find((rank) => song.charts[rank]);
}

/** Song lookup: ranks in the browser as you type; the server renders the same for ?q= */
export function SongLookup({
	initial,
	examples,
	shown,
	maxLength,
	signedIn,
}: {
	initial: SongLookupInitial;
	examples: SongLookupExample[];
	shown: number;
	maxLength: number;
	signedIn: boolean;
}) {
	const { m, locale } = useI18n();
	const t = m.songs;
	const catalog = useChartCatalog();
	const urlQ = clip(useSearchParams().get("q"), maxLength);
	// From the address bar, not `initial`: Back can replay a server payload
	// rendered for another `?q=`
	const [query, setQuery] = useState(urlQ);
	// Nothing is announced for the query the page loaded with
	const [typed, setTyped] = useState(false);
	const [spoken, setSpoken] = useState("");
	// What the results heading read out when it took focus
	const heard = useRef("");
	// The `?q=` this component last wrote or saw
	const written = useRef(urlQ);
	const wantFocus = useRef(false);
	const input = useRef<HTMLInputElement>(null);
	const resultsHeading = useRef<HTMLHeadingElement>(null);
	const ids = useId();
	// The clear button needs JavaScript; without it, the server HTML leaves it out
	const hydrated = useHydrated();
	const list = catalog.status === "ready" ? catalog.list : undefined;
	const trimmed = query.trim();

	const ranked = useMemo((): Ranked | undefined => {
		if (!trimmed) return;
		if (list) {
			const all = rankSongs(list, trimmed, { limit: list.length });
			return { q: trimmed, total: all.length, hits: all.slice(0, shown) };
		}
		if (trimmed === initial.q && !initial.failed) return initial;
		return;
	}, [list, trimmed, shown, initial]);

	const shared = ranked ? sharedBy(ranked) : 0;
	const pending =
		initial.failed && trimmed === initial.q
			? t.unavailable
			: catalog.status === "failed"
				? t.failed
				: t.loading;
	const summary = !trimmed
		? t.cleared
		: ranked
			? [
					heading(t, ranked),
					shared > 1 ? fill(t.shared, { q: ranked.q, n: shared }) : "",
				]
					.filter(Boolean)
					.join(locale === "zh" ? "。" : ". ")
			: pending;

	// Back, forward or a nav link changed `?q=` under us
	useEffect(() => {
		if (urlQ === written.current) return;
		written.current = urlQ;
		setQuery(urlQ);
	}, [urlQ]);

	useEffect(() => {
		if (trimmed === written.current) return;
		const timer = setTimeout(() => replaceQuery(written, trimmed), SETTLE_MS);
		return () => clearTimeout(timer);
	}, [trimmed]);

	useEffect(() => {
		if (!typed) return;
		const timer = setTimeout(() => {
			// Skip what the focused results heading has just said
			const repeat = summary === heard.current;
			heard.current = "";
			setSpoken(repeat ? "" : summary);
		}, SETTLE_MS);
		return () => clearTimeout(timer);
	}, [summary, typed]);

	/** Takes the reader (and on phones, the closed keyboard) to the results */
	const focusResults = () => {
		const target = resultsHeading.current;
		if (!target) return;
		heard.current = summary;
		target.focus();
	};

	// After picking an example, the results heading takes focus once it renders
	useEffect(() => {
		if (!wantFocus.current) return;
		wantFocus.current = false;
		focusResults();
	});

	const show = (q: string) => {
		setQuery(q);
		setTyped(true);
		replaceQuery(written, q.trim());
	};

	const onSubmit = (e: FormEvent<HTMLFormElement>) => {
		// Without the song list, <Form> asks the server instead
		if (!list) return;
		e.preventDefault();
		// An empty box keeps the examples on screen
		if (!trimmed) return;
		show(query);
		focusResults();
	};

	const onExample = (e: MouseEvent<HTMLAnchorElement>, q: string) => {
		if (!list) return;
		e.preventDefault();
		show(q);
		wantFocus.current = true;
	};

	const clear = () => {
		show("");
		input.current?.focus();
	};

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key !== "Escape" || e.nativeEvent.isComposing || !query) return;
		e.preventDefault();
		clear();
	};

	const exampleList = (
		<ul className="songs-examples">
			{examples.map(({ q, songs }) => (
				<li key={q}>
					<Link
						className="songs-example"
						href={songsHref(q)}
						prefetch={false}
						onClick={(e) => onExample(e, q)}
					>
						<span className="songs-example-q" lang={langOf(q)}>
							{q}
						</span>
						{songs.length ? (
							<span className="songs-example-to">
								<ArrowRight size={16} weight="bold" aria-hidden />
								<span className="sr-only">{t.exampleFinds}</span>
								<span>{songs.join(" · ")}</span>
							</span>
						) : null}
					</Link>
				</li>
			))}
		</ul>
	);

	let body: ReactNode;
	if (!trimmed) {
		body = (
			<section className="songs-empty" aria-labelledby={`${ids}-ex`}>
				<h2 id={`${ids}-ex`}>{t.examplesTitle}</h2>
				<p>{t.examplesBody}</p>
				{exampleList}
			</section>
		);
	} else if (!ranked) {
		body = (
			<p
				className={`songs-pending${catalog.status === "loading" ? "" : " is-error"}`}
			>
				{pending}
			</p>
		);
	} else {
		body = (
			<section className="songs-results" aria-labelledby={`${ids}-res`}>
				<h2 id={`${ids}-res`} ref={resultsHeading} tabIndex={-1}>
					{heading(t, ranked)}
				</h2>
				{ranked.total ? (
					<>
						{shared > 1 ? (
							<p className="songs-note">
								<Info size={18} weight="bold" aria-hidden />
								<span>{fill(t.shared, { q: ranked.q, n: shared })}</span>
							</p>
						) : null}
						<ol className="songs-list">
							{ranked.hits.map((hit, i) => (
								<li key={hit.song.id}>
									<SongHit
										hit={hit}
										id={`${ids}-${i}`}
										t={t}
										signedIn={signedIn}
									/>
								</li>
							))}
						</ol>
						{ranked.total > ranked.hits.length ? (
							<p className="songs-more">{t.refine}</p>
						) : null}
					</>
				) : (
					<>
						<p className="songs-hint">{t.noneHint}</p>
						<ProposeLink t={t} />
					</>
				)}
			</section>
		);
	}

	return (
		<>
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<div className="songs-layout">
				<div className="songs-main">
					<Form
						action="/songs"
						replace
						scroll={false}
						prefetch={false}
						role="search"
						className="songs-form"
						onSubmit={onSubmit}
					>
						<label className="songs-label" htmlFor={`${ids}-q`}>
							{t.label}
						</label>
						<div className="songs-row">
							<div className="songs-field">
								<input
									ref={input}
									id={`${ids}-q`}
									className="input songs-input"
									type="search"
									name="q"
									value={query}
									maxLength={maxLength}
									placeholder={t.placeholder}
									autoComplete="off"
									autoCapitalize="none"
									spellCheck={false}
									enterKeyHint="search"
									onChange={(e) => {
										setQuery(e.target.value);
										setTyped(true);
									}}
									onKeyDown={onKeyDown}
								/>
								{hydrated && query ? (
									<button
										type="button"
										className="btn btn-quiet songs-clear"
										onClick={clear}
									>
										<X size={18} weight="bold" aria-hidden />
										<span className="sr-only">{t.clear}</span>
									</button>
								) : null}
							</div>
							<button type="submit" className="btn btn-primary songs-submit">
								<MagnifyingGlass size={18} weight="bold" aria-hidden />
								{t.search}
							</button>
						</div>
					</Form>
					<Announce>{spoken}</Announce>
					{body}
				</div>
				<aside className="songs-about" aria-labelledby={`${ids}-about`}>
					<h2 id={`${ids}-about`}>{t.aboutTitle}</h2>
					<p>{t.aboutBody}</p>
					<p>{t.proposeBody}</p>
					<ProposeLink t={t} />
				</aside>
			</div>
		</>
	);
}

/** Proposals need a phib19 account, so they happen on phib19.top itself */
function ProposeLink({ t }: { t: Text }) {
	return (
		<a className="songs-out" href={PHIB19}>
			{t.proposeLink}
			<ArrowSquareOut size={16} weight="bold" aria-hidden />
		</a>
	);
}

function SongHit({
	hit,
	id,
	t,
	signedIn,
}: {
	hit: SongMatch<ChartSummary>;
	id: string;
	t: Text;
	signedIn: boolean;
}) {
	const { song, via } = hit;
	const label = viaLabel(t, hit);
	const top = hardest(song);
	const nicks = song.aliases ?? [];
	const matched = via.kind === "alias" ? via.text : undefined;
	return (
		<article className="song-hit" aria-labelledby={`${id}-t`}>
			<div className="song-hit-head">
				<h3 id={`${id}-t`} className="song-hit-title" lang={langOf(song.song)}>
					{song.song}
				</h3>
				{song.composer || label ? (
					<p className="song-hit-meta">
						{song.composer ? (
							<span>
								<span className="sr-only">{t.composer}</span>
								<span lang={langOf(song.composer)}>{song.composer}</span>
							</span>
						) : null}
						{label ? <span className="song-hit-via">{label}</span> : null}
					</p>
				) : null}
			</div>
			<ul className="song-hit-levels" aria-label={t.levels}>
				{CHART_LEVELS.map((rank) => {
					const cell = song.charts[rank];
					return cell ? (
						<li key={rank} className={`chart-level chart-level-${rank}`}>
							<span>{rank}</span>
							<span>{cell[0].toFixed(1)}</span>
						</li>
					) : null;
				})}
			</ul>
			<div className="song-hit-nicks">
				{/* Hidden here: it names the list, which would say it twice */}
				<span className="song-hit-label" id={`${id}-n`} aria-hidden>
					{t.nicknames}
				</span>
				{nicks.length ? (
					<ul className="song-nicks" aria-labelledby={`${id}-n`}>
						{nicks.map((nick) => (
							<li
								key={nick}
								className={`song-nick${nick === matched ? " is-match" : ""}`}
							>
								{nick === matched ? (
									<>
										<mark lang={langOf(nick)}>{nick}</mark>
										<span className="sr-only"> {t.matched}</span>
									</>
								) : (
									<span lang={langOf(nick)}>{nick}</span>
								)}
							</li>
						))}
					</ul>
				) : (
					<p className="song-hit-none">{t.noNicknames}</p>
				)}
			</div>
			{signedIn && top ? (
				<Link
					className="btn btn-ghost btn-sm song-hit-card"
					href={`/me/song?chart=${encodeURIComponent(song.id)}&level=${top}`}
					prefetch={false}
					aria-label={fill(t.cardFor, { song: song.song })}
				>
					{t.card}
					<ArrowRight size={16} weight="bold" aria-hidden />
				</Link>
			) : null}
		</article>
	);
}
