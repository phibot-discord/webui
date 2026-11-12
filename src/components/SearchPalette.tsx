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
import { localePath } from "@/lib/locale-path";
import { REVIEW_YEAR } from "@/lib/review-window";
import { songPath } from "@/lib/song-path";
import { looseFold, rankSongs } from "@/lib/song-search";
import { fill } from "@/phi/lib/card-i18n";

type Hit = {
	key: string;
	href: string;
	title: string;
	meta: string;
	kind: "page" | "song";
};

const SONG_LIMIT = 8;

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
		return {
			pages: pageHits,
			songs: songHits,
			all: [...songHits, ...pageHits],
		};
	}, [q, list, pages, t.viaAlias]);

	const pick = (hit: Hit | undefined) => {
		if (!hit) return;
		dialog.current?.close();
		router.push(localePath(hit.href, locale));
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
			: list || failed
				? t.none
				: t.loading
		: "";

	const group = (label: string, rows: Hit[], offset: number, gid: string) =>
		rows.length ? (
			// biome-ignore lint/a11y/useSemanticElements: a group of options inside the listbox, not a form fieldset
			<div role="group" aria-labelledby={gid} className="sp-group">
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
							<span className="sp-title">{hit.title}</span>
							{hit.meta ? <span className="sp-meta">{hit.meta}</span> : null}
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
