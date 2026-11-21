import type { SearchSnippet } from "./collection";

export const TEXT_KINDS = ["collection", "story", "tips", "timeline"] as const;
export type TextKind = (typeof TEXT_KINDS)[number];

export type TextHit = {
	id: string;
	title: string;
	titleMatch: SearchSnippet | null;
	snippet: SearchSnippet | null;
	where: string;
	href: string;
};

export type TextHitGroup = {
	kind: TextKind;
	hits: TextHit[];
	total: number;
	more?: string;
};

export type TextAnswer = { q: string; groups: TextHitGroup[] };

export const TEXT_QUERY_MAX = 64;
export const TEXT_DEBOUNCE_MS = 250;

const SOLO =
	/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]$/u;

export type TextQuery =
	| { kind: "ok"; q: string }
	| { kind: "short" }
	| { kind: "long" };

export function textQuery(raw: string | null | undefined): TextQuery {
	const q = (raw ?? "").replace(/\s+/g, " ").trim();
	const n = Array.from(q).length;
	if (n > TEXT_QUERY_MAX) return { kind: "long" };
	if (n >= 2 || SOLO.test(q)) return { kind: "ok", q };
	return { kind: "short" };
}

function localHref(v: unknown): v is string {
	return typeof v === "string" && v.startsWith("/") && !v.startsWith("//");
}

function snippetOf(v: unknown): SearchSnippet | null | undefined {
	if (v === null) return null;
	const o = v as Record<string, unknown> | undefined;
	return o &&
		typeof o === "object" &&
		typeof o.before === "string" &&
		typeof o.match === "string" &&
		typeof o.after === "string"
		? { before: o.before, match: o.match, after: o.after }
		: undefined;
}

function hitOf(v: unknown): TextHit | undefined {
	const o = v as Record<string, unknown> | null;
	if (!o || typeof o !== "object") return undefined;
	const { id, title, where, href } = o;
	const titleMatch = snippetOf(o.titleMatch);
	const snippet = snippetOf(o.snippet);
	if (
		typeof id !== "string" ||
		typeof title !== "string" ||
		typeof where !== "string" ||
		!localHref(href) ||
		titleMatch === undefined ||
		snippet === undefined ||
		(!title && !snippet)
	) {
		return undefined;
	}
	return { id, title, titleMatch, snippet, where, href };
}

export function parseTextAnswer(raw: unknown): TextHitGroup[] | undefined {
	const groups = (raw as { groups?: unknown } | null)?.groups;
	if (!Array.isArray(groups)) return undefined;
	return TEXT_KINDS.flatMap((kind): TextHitGroup[] => {
		const g = (groups.find(
			(row) => (row as { kind?: unknown } | null)?.kind === kind,
		) ?? {}) as Record<string, unknown>;
		const { hits: rows, total: count, more } = g;
		const hits = Array.isArray(rows)
			? rows.flatMap((row) => hitOf(row) ?? [])
			: [];
		if (!hits.length) return [];
		const total =
			typeof count === "number" && count > hits.length
				? Math.floor(count)
				: hits.length;
		return [
			{
				kind,
				hits,
				total,
				...(total > hits.length && localHref(more) ? { more } : {}),
			},
		];
	});
}

export function paletteText(
	answer: TextAnswer | null,
	raw: string,
): { groups: TextHitGroup[]; waiting: boolean } {
	const asked = textQuery(raw);
	if (asked.kind !== "ok") return { groups: [], waiting: false };
	if (answer?.q !== asked.q) return { groups: [], waiting: true };
	return { groups: answer.groups, waiting: false };
}
