"use client";

import {
	type CSSProperties,
	type KeyboardEvent,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { useI18n } from "@/i18n/provider";
import {
	CHART_LEVELS,
	type ChartLevel,
	type ChartSummary,
	loadChartCatalog,
} from "@/lib/chart-catalog";
import { rankSongs } from "@/lib/song-search";

type CatalogState =
	| { status: "loading" }
	| { status: "ready"; list: ChartSummary[] }
	| { status: "failed" };

/** Loads `/api/charts` once for the page */
export function useChartCatalog(): CatalogState {
	const [state, setState] = useState<CatalogState>({ status: "loading" });
	useEffect(() => {
		let dead = false;
		loadChartCatalog()
			.then((list) => {
				if (!dead) setState({ status: "ready", list });
			})
			.catch(() => {
				if (!dead) setState({ status: "failed" });
			});
		return () => {
			dead = true;
		};
	}, []);
	return state;
}

export type ChartSearchText = {
	/** Accessible name when the caller passes neither `label` nor `labelledBy` */
	label: string;
	/** Precedes the nickname that matched, under the song title */
	viaAlias: string;
	/** Announced politely while typing */
	results: (count: number) => string;
	noResults: string;
};

// Until these move into messages.ts
const FALLBACK_TEXT: Record<"en" | "zh", ChartSearchText> = {
	en: {
		label: "Search songs",
		viaAlias: "Alias",
		results: (n) => (n === 1 ? "1 song found" : `${n} songs found`),
		noResults: "No matching songs",
	},
	zh: {
		label: "搜索曲目",
		viaAlias: "别名",
		results: (n) => `找到 ${n} 首曲目`,
		noResults: "没有匹配的曲目",
	},
};

// Until chart-search.css has them: levels wrap under the title at 360 px, and the arrow-key
// option is outlined (chips can't take focus, so :focus-visible never fires)
const ROW_STYLE: CSSProperties = { flexWrap: "wrap", rowGap: 6 };
const SONG_STYLE: CSSProperties = { flex: "1 1 9rem" };
const LEVELS_STYLE: CSSProperties = { flexWrap: "wrap", flexShrink: 1 };
const ACTIVE_STYLE: CSSProperties = {
	outline: "2px solid var(--focus)",
	outlineOffset: 2,
};

type Option = {
	id: string;
	song: ChartSummary;
	rank: ChartLevel;
	taken: boolean;
};

/** What a key does to the list; `keepDefault` lets the browser act on it too */
export type ComboboxAction = {
	open?: boolean;
	active?: number;
	pick?: true;
	clear?: true;
	keepDefault?: true;
};

/** Key handling for the combobox below; `undefined` leaves the key alone */
export function comboboxKey(
	key: string,
	altKey: boolean,
	s: { expanded: boolean; active: number; count: number; hasQuery: boolean },
): ComboboxAction | undefined {
	const last = s.count - 1;
	const onOption = s.expanded && s.active >= 0 && s.active <= last;
	switch (key) {
		case "ArrowDown":
			if (!s.expanded) return { open: true, active: altKey ? -1 : 0 };
			return altKey ? {} : { active: s.active >= last ? 0 : s.active + 1 };
		case "ArrowUp":
			if (!s.expanded) return { open: true, active: last };
			return { active: s.active <= 0 ? last : s.active - 1 };
		case "Home":
		case "End":
			// Only while an option is active; otherwise they move the caret
			return onOption ? { active: key === "Home" ? 0 : last } : undefined;
		case "Enter":
			return onOption ? { pick: true } : undefined;
		case "Escape":
			if (s.expanded) return { open: false, active: -1 };
			return s.hasQuery ? { clear: true } : undefined;
		case "Tab":
			// Focus moves on; the list must not stay open over the next field
			return { open: false, active: -1, keepDefault: true };
		default:
			return;
	}
}

/** WAI-ARIA combobox: focus stays in the input, arrows move over the level chips */
export function ChartSearch({
	catalog,
	placeholder,
	onPick,
	disabled,
	isTaken,
	label,
	labelledBy,
	text,
}: {
	catalog: CatalogState;
	placeholder: string;
	onPick: (song: ChartSummary, rank: ChartLevel) => void;
	disabled?: boolean;
	/** Dim levels the caller already has (manual editor) */
	isTaken?: (song: ChartSummary, rank: ChartLevel) => boolean;
	/** Accessible name; ignored when `labelledBy` is set */
	label?: string;
	/** id of the visible text that names this field */
	labelledBy?: string;
	text?: Partial<ChartSearchText>;
}) {
	const { m, locale } = useI18n();
	const t = { ...FALLBACK_TEXT[locale === "zh" ? "zh" : "en"], ...text };
	const listId = useId();
	const root = useRef<HTMLDivElement>(null);
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(-1);
	const list = catalog.status === "ready" ? catalog.list : undefined;
	const trimmed = query.trim();
	const hits = useMemo(
		() => (list && trimmed ? rankSongs(list, trimmed) : []),
		[list, trimmed],
	);

	const rows = hits.map((hit, row) => {
		const levels: Option[] = [];
		for (const rank of CHART_LEVELS) {
			if (!hit.song.charts[rank]) continue;
			levels.push({
				id: "",
				song: hit.song,
				rank,
				taken: isTaken?.(hit.song, rank) ?? false,
			});
		}
		return { hit, row, levels };
	});
	const options: Option[] = [];
	for (const { levels } of rows) {
		for (const option of levels) {
			option.id = `${listId}-o${options.length}`;
			options.push(option);
		}
	}
	const expanded = open && options.length > 0;
	const activeOption = expanded ? options[active] : undefined;
	const activeId = activeOption?.id;

	useEffect(() => {
		if (!open) return;
		const onPointer = (e: PointerEvent) => {
			if (!root.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("pointerdown", onPointer);
		return () => document.removeEventListener("pointerdown", onPointer);
	}, [open]);

	useEffect(() => {
		if (activeId) {
			document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
		}
	}, [activeId]);

	const close = () => {
		setOpen(false);
		setActive(-1);
	};

	const pick = (option: Option) => {
		if (option.taken) return;
		onPick(option.song, option.rank);
		setQuery("");
		close();
	};

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		// Arrow keys and Enter belong to the IME while it composes (pinyin, kana)
		if (e.nativeEvent.isComposing) return;
		const action = comboboxKey(e.key, e.altKey, {
			expanded,
			active,
			count: options.length,
			hasQuery: query !== "",
		});
		if (!action) return;
		if (!action.keepDefault) e.preventDefault();
		if (action.pick) {
			if (activeOption) pick(activeOption);
			return;
		}
		if (action.clear) setQuery("");
		if (action.open !== undefined) setOpen(action.open);
		if (action.active !== undefined) setActive(action.active);
	};

	const name = labelledBy ? undefined : (label ?? t.label);
	const status =
		catalog.status === "failed"
			? m.score.chartsFailed
			: open && trimmed && list
				? hits.length
					? t.results(hits.length)
					: t.noResults
				: "";

	return (
		<div className="chart-search" ref={root}>
			<input
				type="search"
				role="combobox"
				autoComplete="off"
				spellCheck={false}
				disabled={disabled || catalog.status !== "ready"}
				placeholder={
					catalog.status === "loading"
						? m.score.loadingCharts
						: catalog.status === "failed"
							? m.score.chartsFailed
							: placeholder
				}
				value={query}
				aria-label={name}
				aria-labelledby={labelledBy}
				aria-autocomplete="list"
				aria-controls={listId}
				aria-expanded={expanded}
				aria-activedescendant={activeId}
				onChange={(e) => {
					setQuery(e.target.value);
					setOpen(true);
					setActive(-1);
				}}
				onFocus={() => setOpen(true)}
				onBlur={(e) => {
					if (!root.current?.contains(e.relatedTarget as Node | null)) close();
				}}
				onKeyDown={onKeyDown}
			/>
			<ul
				className="chart-search-list"
				id={listId}
				// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: ARIA in HTML allows ul[role=listbox]; the list styles target ul > li
				role="listbox"
				aria-label={name}
				aria-labelledby={labelledBy}
				// A scrolling list is a Tab stop in Chrome; focus stays in the input
				tabIndex={-1}
				hidden={!expanded}
				// Keep focus (and the open list) in the input while a chip is clicked
				onMouseDown={(e) => e.preventDefault()}
			>
				{expanded
					? rows.map(({ hit, row, levels }) => {
							const { song, via } = hit;
							const aliasId = `${listId}-a${row}`;
							const composerId = `${listId}-c${row}`;
							const alias = via.kind === "alias" ? via.text : undefined;
							return (
								<li key={`${song.id}:${row}`} role="none" style={ROW_STYLE}>
									{/* Hidden from the tree: each option's label and description repeat it */}
									<span
										className="chart-search-song"
										aria-hidden="true"
										style={SONG_STYLE}
									>
										<span className="chart-search-title">{song.song}</span>
										{alias ? (
											<span
												className="chart-search-composer chart-search-alias"
												id={aliasId}
											>
												{t.viaAlias} · {alias}
											</span>
										) : null}
										<span className="chart-search-composer" id={composerId}>
											{song.composer}
										</span>
									</span>
									<span className="chart-search-levels" style={LEVELS_STYLE}>
										{levels.map((option) => {
											const cell = song.charts[option.rank];
											if (!cell) return null;
											const level = `${option.rank} ${cell[0].toFixed(1)}`;
											const detail =
												cell[1] != null
													? `${level} · ${cell[1]} ${m.score.notesShort}`
													: level;
											const isActive = option.id === activeId;
											return (
												// biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/useFocusableInteractive: aria-activedescendant pattern, focus and keys stay on the combobox input
												<span
													key={option.rank}
													id={option.id}
													role="option"
													aria-selected={isActive}
													aria-disabled={option.taken || undefined}
													aria-label={`${song.song} · ${detail}`}
													aria-describedby={
														alias ? `${aliasId} ${composerId}` : composerId
													}
													className={`chart-level chart-level-${option.rank}${isActive ? " is-active" : ""}`}
													style={isActive ? ACTIVE_STYLE : undefined}
													title={detail}
													onClick={() => pick(option)}
												>
													<span>{option.rank}</span>
													<span>{cell[0].toFixed(1)}</span>
												</span>
											);
										})}
									</span>
								</li>
							);
						})
					: null}
			</ul>
			<span className="sr-only" role="status">
				{status}
			</span>
		</div>
	);
}
