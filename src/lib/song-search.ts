// Shared by the browser (ChartSearch) and `/api/songs/search`: keep it free of node imports
import { JARO_PUNCT, jaroWinkler } from "@/phi/lib/jaro";

export type SearchableSong = {
	id: string;
	song: string;
	composer: string;
	aliases?: readonly string[];
};

export type MatchKind = "title" | "alias" | "id" | "composer";

export type MatchTier = 0 | 1 | 2 | 3 | 4;
export const MATCH_TIERS = [
	"exact",
	"prefix",
	"contains",
	"composer",
	"fuzzy",
] as const;

export type SongMatch<T extends SearchableSong = SearchableSong> = {
	song: T;
	tier: MatchTier;
	score: number;
	via: { kind: MatchKind; text: string };
};

type Entry = {
	song: SearchableSong;
	kind: MatchKind;
	text: string;
	loose: string;
	fuzzy: string;
	words?: string[];
};

/** phi-plugin's default cut for `fuzzysongsnick` */
const FUZZY_MIN = 0.85;
/** Below 3 characters Jaro-Winkler passes 0.85 on a single shared letter (`70` vs `7`) */
const FUZZY_MIN_QUERY = 3;
const ALIAS_CONTAINS_MIN = 2;
const KIND_ORDER: Record<MatchKind, number> = {
	title: 0,
	alias: 1,
	id: 2,
	composer: 3,
};

/** Exact-match form: `＞w＜` and `>w<` stay distinct from `w` */
export function looseFold(s: string): string {
	return s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

export function fuzzyFold(s: string): string {
	return looseFold(s).replace(JARO_PUNCT, "");
}

/** Keeps the loose form when stripping leaves under 2 characters or under half: `＞w＜` and `+E` must not turn into `w` and `e` */
function entryFuzzy(loose: string): string {
	const stripped = loose.replace(JARO_PUNCT, "");
	return stripped.length < 2 || stripped.length * 2 < loose.length
		? loose
		: stripped;
}

function composerWords(composer: string): string[] {
	const words = composer
		.normalize("NFKC")
		.toLowerCase()
		.split(/[\s\p{P}\p{S}]+/u)
		.filter(Boolean);
	return words.map((_, i) => words.slice(i).join("").replace(JARO_PUNCT, ""));
}

const indexes = new WeakMap<readonly SearchableSong[], Entry[]>();

function indexOf(list: readonly SearchableSong[]): Entry[] {
	let index = indexes.get(list);
	if (!index) {
		index = buildIndex(list);
		indexes.set(list, index);
	}
	return index;
}

function buildIndex(list: readonly SearchableSong[]): Entry[] {
	const out: Entry[] = [];
	const add = (song: SearchableSong, kind: MatchKind, text: string) => {
		const loose = looseFold(text);
		if (!loose) return;
		out.push({
			song,
			kind,
			text,
			loose,
			fuzzy: entryFuzzy(loose),
			...(kind === "composer" ? { words: composerWords(text) } : {}),
		});
	};
	for (const song of list) {
		add(song, "title", song.song);
		add(song, "id", song.id.replace(/\.0$/, ""));
		if (song.composer) add(song, "composer", song.composer);
		for (const alias of song.aliases ?? []) add(song, "alias", alias);
	}
	return out;
}

type Query = {
	loose: string;
	id: string;
	text: string;
	folded: boolean;
};

function matchEntry(
	e: Entry,
	q: Query,
	exactOnly: boolean,
): { tier: MatchTier; score: number } | undefined {
	// Ids embed the composer (`DiamondDust.MasahiroGodspeedAoki`): exact only
	if (e.kind === "id")
		return e.loose === q.id ? { tier: 0, score: 1 } : undefined;
	if (e.kind !== "composer" && e.loose === q.loose)
		return { tier: 0, score: 1 };
	const hay = q.folded ? e.fuzzy : e.loose;
	if (exactOnly || !q.text || !hay) return;
	const score = q.text.length / hay.length;
	if (e.kind === "composer") {
		// Latin names match at a word start (`aoki`, not `asa` in Masahiro); CJK names have no spaces to split on
		const hit = /^[a-z0-9]/.test(q.text)
			? q.folded && e.words?.some((w) => w.startsWith(q.text))
			: hay.includes(q.text);
		return hit ? { tier: 3, score } : undefined;
	}
	if (hay.startsWith(q.text)) return { tier: 1, score };
	if (
		hay.includes(q.text) &&
		(e.kind !== "alias" || q.text.length >= ALIAS_CONTAINS_MIN)
	) {
		return { tier: 2, score };
	}
	if (q.folded && q.text.length >= FUZZY_MIN_QUERY) {
		const d = jaroWinkler(q.text, e.fuzzy);
		if (d >= FUZZY_MIN) return { tier: 4, score: d };
	}
	return;
}

function compare(a: SongMatch, b: SongMatch): number {
	return (
		a.tier - b.tier ||
		b.score - a.score ||
		KIND_ORDER[a.via.kind] - KIND_ORDER[b.via.kind] ||
		a.song.song.localeCompare(b.song.song) ||
		a.song.id.localeCompare(b.song.id)
	);
}

/** Best match per song: exact, prefix, contains, composer, then Jaro-Winkler ≥ 0.85 */
export function rankSongs<T extends SearchableSong>(
	list: readonly T[],
	query: string,
	opts: { limit?: number; exact?: boolean } = {},
): SongMatch<T>[] {
	const limit = opts.limit ?? 12;
	const loose = looseFold(query);
	if (!loose || limit <= 0) return [];
	const fuzzy = loose.replace(JARO_PUNCT, "");
	// `＞w＜` folds to `w`: when punctuation is most of the query, match it as typed
	const folded = fuzzy.length * 2 > loose.length;
	const q: Query = {
		loose,
		id: loose.replace(/\.0$/, ""),
		text: folded ? fuzzy : loose,
		folded,
	};
	const best = new Map<SearchableSong, SongMatch>();
	const titles = new Map<SearchableSong, SongMatch>();
	for (const e of indexOf(list)) {
		const hit = matchEntry(e, q, opts.exact === true);
		if (!hit) continue;
		const next: SongMatch = {
			song: e.song,
			tier: hit.tier,
			score: hit.score,
			via: { kind: e.kind, text: e.text },
		};
		const prev = best.get(e.song);
		if (!prev || compare(next, prev) < 0) best.set(e.song, next);
		if (e.kind === "title") titles.set(e.song, next);
	}
	const out: SongMatch[] = [];
	for (const match of best.values()) {
		// A title in the same tier says more than the nickname that scored higher
		const title = titles.get(match.song);
		out.push(
			title && title.tier === match.tier && match.via.kind !== "title"
				? { ...match, via: title.via }
				: match,
		);
	}
	return (out as SongMatch<T>[]).sort(compare).slice(0, limit);
}
