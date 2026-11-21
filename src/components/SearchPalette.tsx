"use client";

import { useRouter } from "next/navigation";
import {
	type KeyboardEvent,
	type Ref,
	useCallback,
	useEffect,
	useId,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { MagnifyingGlass } from "@/components/icons";
import { useNavGroups } from "@/components/useNavGroups";
import { useI18n } from "@/i18n/provider";
import { type ChartSummary, loadChartCatalog } from "@/lib/chart-catalog";
import type { SearchSnippet } from "@/lib/collection";
import { localePath } from "@/lib/locale-path";
import { REVIEW_YEAR } from "@/lib/review-window";
import { songPath } from "@/lib/song-path";
import { looseFold, rankSongs } from "@/lib/song-search";
import {
	paletteText,
	parseTextAnswer,
	TEXT_DEBOUNCE_MS,
	type TextAnswer,
	type TextKind,
	textQuery,
} from "@/lib/text-search";
import { fill } from "@/phi/lib/card-i18n";

type Hit = {
	key: string;
	href: string;
	title: string;
	meta: string;
	kind: "page" | "song" | "text" | "more";
	titleMatch?: SearchSnippet | null;
	snippet?: SearchSnippet | null;
	reveal?: boolean;
};

type TextRows = { kind: TextKind; rows: Hit[]; offset: number };

const SONG_LIMIT = 8;
const REVEAL_MS = 8000;
const REVEAL_STEP_MS = 100;

function Marked({ snippet }: { snippet: SearchSnippet }) {
	return (
		<>
			{snippet.before}
			<mark>{snippet.match}</mark>
			{snippet.after}
		</>
	);
}

function sameDocument(to: URL): boolean {
	return (
		to.origin === location.origin &&
		to.pathname === location.pathname &&
		to.search === location.search
	);
}

function anchorOf(to: URL): HTMLElement | null {
	try {
		return document.getElementById(decodeURIComponent(to.hash.slice(1)));
	} catch {
		return null;
	}
}

function revealWhenShown(to: URL) {
	const until = Date.now() + REVEAL_MS;
	const look = () => {
		const target =
			sameDocument(to) && location.hash === to.hash ? anchorOf(to) : null;
		if (target) target.scrollIntoView({ block: "start" });
		else if (Date.now() < until) window.setTimeout(look, REVEAL_STEP_MS);
	};
	window.setTimeout(look, REVEAL_STEP_MS);
}

export type SearchHandle = { show: () => void };

export function SearchPalette({
	signedIn,
	ref,
}: {
	signedIn: boolean;
	ref?: Ref<SearchHandle>;
}) {
	const { m, locale } = useI18n();
	const t = m.search;
	const router = useRouter();
	const groups = useNavGroups();
	const ids = useId();
	const dialog = useRef<HTMLDialogElement>(null);
	const input = useRef<HTMLInputElement>(null);
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState("");
	const [active, setActive] = useState(0);
	const [list, setList] = useState<ChartSummary[] | null>(null);
	const [failed, setFailed] = useState(false);
	const [answer, setAnswer] = useState<TextAnswer | null>(null);
	const asked = useMemo(() => {
		const query = textQuery(q);
		return query.kind === "ok" ? query.q : "";
	}, [q]);

	const show = useCallback(() => {
		setOpen(true);
		setQ("");
		setActive(0);
		dialog.current?.showModal();
		requestAnimationFrame(() => input.current?.focus());
	}, []);

	useImperativeHandle(ref, () => ({ show }), [show]);

	useEffect(() => {
		const onKey = (e: globalThis.KeyboardEvent) => {
			if (
				(e.metaKey || e.ctrlKey) &&
				!e.altKey &&
				e.key.toLowerCase() === "k"
			) {
				e.preventDefault();
				if (dialog.current?.open) dialog.current.close();
				else show();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [show]);

	useEffect(() => {
		if (!open || list || failed) return;
		let dead = false;
		loadChartCatalog("songs")
			.then((l) => {
				if (!dead) setList(l);
			})
			.catch(() => {
				if (!dead) setFailed(true);
			});
		return () => {
			dead = true;
		};
	}, [open, list, failed]);

	useEffect(() => {
		if (!open || !asked) return;
		const ctrl = new AbortController();
		const timer = window.setTimeout(() => {
			const params = new URLSearchParams({ q: asked, locale });
			fetch(`/api/search?${params.toString()}`, { signal: ctrl.signal })
				.then((res) => (res.ok ? res.json() : undefined))
				.catch(() => undefined)
				.then((body) => {
					if (ctrl.signal.aborted) return;
					setAnswer({ q: asked, groups: parseTextAnswer(body) ?? [] });
				});
		}, TEXT_DEBOUNCE_MS);
		return () => {
			window.clearTimeout(timer);
			ctrl.abort();
		};
	}, [open, asked, locale]);

	const pages = useMemo(() => {
		const out: Hit[] = [];
		for (const g of groups) {
			for (const item of g.items) {
				out.push({
					key: `p:${item.id}`,
					href: item.href,
					title: fill(m.nav[item.id], { year: REVIEW_YEAR }),
					meta: m.nav.groups[g.id],
					kind: "page",
				});
			}
		}
		if (signedIn) {
			out.push({
				key: "p:account",
				href: "/account",
				title: m.nav.account,
				meta: "",
				kind: "page",
			});
		}
		return out;
	}, [groups, m, signedIn]);

	const hits = useMemo(() => {
		const text = q.trim();
		const fold = looseFold(text);
		const pageHits = fold
			? pages.filter((p) => looseFold(`${p.title} ${p.meta}`).includes(fold))
			: pages;
		const songHits: Hit[] =
			text && list
				? rankSongs(list, text, { limit: SONG_LIMIT }).map((hit) => ({
						key: `s:${hit.song.id}`,
						href: songPath(hit.song.id),
						title: hit.song.song,
						meta:
							hit.via.kind === "alias"
								? fill(t.viaAlias, { alias: hit.via.text })
								: hit.song.composer,
						kind: "song",
					}))
				: [];
		const shown = paletteText(answer, q);
		let offset = songHits.length + pageHits.length;
		const texts: TextRows[] = shown.groups.map((g) => {
			const rows: Hit[] = g.hits.map((hit) => ({
				key: `t:${g.kind}:${hit.id}`,
				href: hit.href,
				title: hit.title,
				meta: hit.where,
				kind: "text",
				titleMatch: hit.titleMatch,
				snippet: hit.snippet,
				reveal: g.kind !== "timeline",
			}));
			if (g.more) {
				rows.push({
					key: `t:${g.kind}:more`,
					href: g.more,
					title: fill(t.textMore, { n: g.total }),
					meta: "",
					kind: "more",
				});
			}
			const at = offset;
			offset += rows.length;
			return { kind: g.kind, rows, offset: at };
		});
		return {
			pages: pageHits,
			songs: songHits,
			texts,
			waiting: shown.waiting,
			all: [...songHits, ...pageHits, ...texts.flatMap((g) => g.rows)],
		};
	}, [q, list, pages, answer, t.viaAlias, t.textMore]);

	const pick = (hit: Hit | undefined) => {
		if (!hit) return;
		dialog.current?.close();
		const path = localePath(hit.href, locale);
		const to = new URL(path, location.href);
		if (to.hash && sameDocument(to)) {
			if (location.hash === to.hash) {
				anchorOf(to)?.scrollIntoView({ block: "start" });
			} else {
				location.hash = to.hash;
			}
			return;
		}
		router.push(path);
		if (to.hash && hit.reveal) revealWhenShown(to);
	};

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.nativeEvent.isComposing || e.keyCode === 229) return;
		const n = hits.all.length;
		if (e.key === "ArrowDown" && n) {
			e.preventDefault();
			setActive((a) => (a + 1) % n);
		} else if (e.key === "ArrowUp" && n) {
			e.preventDefault();
			setActive((a) => (a - 1 + n) % n);
		} else if (e.key === "Enter") {
			e.preventDefault();
			pick(hits.all[active]);
		}
	};

	const at = Math.min(active, Math.max(0, hits.all.length - 1));
	const optionId = (i: number) => `${ids}-o${i}`;

	useEffect(() => {
		if (!open) return;
		document
			.getElementById(`${ids}-o${at}`)
			?.scrollIntoView({ block: "nearest" });
	}, [at, open, ids]);
	const listId = `${ids}-list`;
	const count = hits.all.length;
	const status = q.trim()
		? count
			? count === 1
				? t.resultsOne
				: fill(t.results, { n: count })
			: !list && !failed
				? t.loading
				: hits.waiting
					? t.searching
					: t.none
		: "";

	const group = (label: string, rows: Hit[], offset: number, gid: string) =>
		rows.length ? (
			// biome-ignore lint/a11y/useSemanticElements: a group of options inside the listbox, not a form fieldset
			<div key={gid} role="group" aria-labelledby={gid} className="sp-group">
				<p className="sp-group-label" id={gid}>
					{label}
				</p>
				{rows.map((hit, i) => {
					const idx = offset + i;
					return (
						// biome-ignore lint/a11y/useFocusableInteractive lint/a11y/useKeyWithClickEvents: the combobox input keeps focus and moves through the options with aria-activedescendant
						<div
							key={hit.key}
							id={optionId(idx)}
							role="option"
							aria-selected={idx === at}
							className="sp-option"
							onPointerMove={() => setActive(idx)}
							onPointerDown={(e) => e.preventDefault()}
							onClick={() => pick(hit)}
						>
							{hit.kind === "text" ? (
								<span className="sp-text">
									<span className="sp-text-head">
										{hit.title ? (
											<span className="sp-title sp-cut">
												{hit.titleMatch ? (
													<Marked snippet={hit.titleMatch} />
												) : (
													hit.title
												)}
											</span>
										) : hit.snippet ? (
											<span className="sp-cut">
												<Marked snippet={hit.snippet} />
											</span>
										) : null}
										{hit.meta ? (
											<span className="sp-meta">{hit.meta}</span>
										) : null}
									</span>
									{hit.title && hit.snippet ? (
										<span className="sp-excerpt sp-cut">
											<Marked snippet={hit.snippet} />
										</span>
									) : null}
								</span>
							) : (
								<>
									<span className="sp-title">{hit.title}</span>
									{hit.meta ? (
										<span className="sp-meta">{hit.meta}</span>
									) : null}
								</>
							)}
						</div>
					);
				})}
			</div>
		) : null;

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: a click on the backdrop closes it; Esc closes the dialog natively
		<dialog
			ref={dialog}
			className="sp-dialog"
			aria-label={t.label}
			onClose={() => setOpen(false)}
			onClick={(e) => {
				if (e.target === e.currentTarget) dialog.current?.close();
			}}
		>
			{open ? (
				<div className="sp-panel">
					<div className="sp-field">
						<MagnifyingGlass size={18} weight="bold" aria-hidden />
						<input
							ref={input}
							className="sp-input"
							type="text"
							role="combobox"
							aria-expanded={count > 0}
							aria-controls={listId}
							aria-autocomplete="list"
							aria-activedescendant={count ? optionId(at) : undefined}
							aria-label={t.label}
							placeholder={t.placeholder}
							autoComplete="off"
							spellCheck={false}
							value={q}
							onChange={(e) => {
								setQ(e.target.value);
								setActive(0);
							}}
							onKeyDown={onKeyDown}
						/>
						<button
							type="button"
							className="btn btn-ghost btn-sm"
							onClick={() => dialog.current?.close()}
						>
							{t.close}
						</button>
					</div>
					<div
						id={listId}
						role="listbox"
						aria-label={t.label}
						className="sp-list"
					>
						{group(t.songs, hits.songs, 0, `${ids}-gs`)}
						{group(t.pages, hits.pages, hits.songs.length, `${ids}-gp`)}
						{hits.texts.map((g) =>
							group(t.texts[g.kind], g.rows, g.offset, `${ids}-g${g.kind}`),
						)}
					</div>
					<p className="sr-only" role="status" aria-live="polite">
						{status}
					</p>
					{q.trim() && !count ? <p className="sp-empty">{status}</p> : null}
					<p className="sp-foot" aria-hidden="true">
						{t.keys}
					</p>
				</div>
			) : null}
		</dialog>
	);
}

export function SearchTrigger({
	onOpen,
	className,
}: {
	onOpen: () => void;
	className?: string;
}) {
	const t = useI18n().m.search;
	const [mac, setMac] = useState(false);

	useEffect(() => {
		setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
	}, []);

	return (
		<span className={className ? `sp-slot ${className}` : "sp-slot"}>
			<button
				type="button"
				className="btn btn-quiet sp-trigger"
				onClick={onOpen}
				aria-haspopup="dialog"
				aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
			>
				<span className="sp-icon">
					<MagnifyingGlass size={18} weight="bold" aria-hidden />
				</span>
				<span className="sp-reveal">
					<span className="sp-reveal-in">
						<span className="sp-trigger-text">{t.open}</span>
						<span className="sp-kbd" aria-hidden="true">
							{mac ? "⌘ K" : "Ctrl K"}
						</span>
					</span>
				</span>
			</button>
		</span>
	);
}
