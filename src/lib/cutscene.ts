import type { CutPage, FadeToWhite } from "./c9s6";
import { type CollectionLang, pickLocal } from "./collection";
import { parseRichText, type RichSegment } from "./richtext";

export type LineText = { text: string; lang: CollectionLang };

export type PageLine = LineText & {
	at: number;
	segments: RichSegment[];
	length: number;
};

export type PageText = { lines: PageLine[]; length: number };

function chars(text: string): number {
	return Array.from(text).length;
}

export function pageText(page: CutPage, lang: CollectionLang): PageText {
	const lines = page.lines.map((line, at) => {
		const own = pickLocal(line, lang);
		const segments = parseRichText(own.text);
		const length = segments.reduce((n, s) => n + chars(s.text), 0);
		return { ...own, at, segments, length };
	});
	return { lines, length: lines.reduce((n, l) => n + l.length, 0) };
}

export function plainLines(text: PageText): (LineText & { at: number })[] {
	return text.lines.flatMap((line) => {
		const plain = line.segments
			.map((s) => s.text)
			.join("")
			.trim();
		return plain ? [{ at: line.at, text: plain, lang: line.lang }] : [];
	});
}

export function lineEnd(text: PageText, line: number): number {
	return text.lines.slice(0, line + 1).reduce((n, l) => n + l.length, 0);
}

export type TypedSegment = RichSegment & { rest: string };
export type TypedLine = {
	at: number;
	lang: CollectionLang;
	segments: TypedSegment[];
};

export function typeOut(text: PageText, typed: number): TypedLine[] {
	let left = Math.max(0, typed);
	return text.lines.map((line) => ({
		at: line.at,
		lang: line.lang,
		segments: line.segments.map((segment) => {
			const all = Array.from(segment.text);
			const shown = all.slice(0, left);
			left -= shown.length;
			return {
				...segment,
				text: shown.join(""),
				rest: all.slice(shown.length).join(""),
			};
		}),
	}));
}

export type CutPhase = "start" | "play" | "end";
export type CutWhite = "none" | "in" | "full" | "out";

export type CutState = {
	phase: CutPhase;
	page: number;
	typed: number;
	white: CutWhite;
	faded: boolean;
};

export type CutEvent =
	| { type: "play" }
	| { type: "restart" }
	| { type: "type"; chars: number }
	| { type: "next" }
	| { type: "back" }
	| { type: "whiteIn" }
	| { type: "whiteOut" }
	| { type: "sync" };

export type CutCtx = {
	lengths: readonly number[];
	fade: { page: number; at: number; autoNext: boolean } | null;
	instant: boolean;
};

export const FULL = Number.POSITIVE_INFINITY;

export const CUT_START: CutState = {
	phase: "start",
	page: 0,
	typed: 0,
	white: "none",
	faded: false,
};

export function cutCtx(
	texts: readonly PageText[],
	fade: FadeToWhite | null,
	instant: boolean,
): CutCtx {
	const on = fade && !instant ? texts[fade.page] : undefined;
	return {
		lengths: texts.map((t) => t.length),
		fade:
			fade && on
				? {
						page: fade.page,
						at: lineEnd(on, fade.line),
						autoNext: fade.autoNext,
					}
				: null,
		instant,
	};
}

export function imageShown(state: CutState, from: number | undefined): boolean {
	return from !== undefined && state.phase !== "start" && state.page >= from;
}

function lengthOf(state: CutState, ctx: CutCtx): number {
	return ctx.lengths[state.page] ?? 0;
}

export function pageDone(state: CutState, ctx: CutCtx): boolean {
	return state.typed >= lengthOf(state, ctx);
}

export function typing(state: CutState, ctx: CutCtx): boolean {
	if (state.phase !== "play" || ctx.instant) return false;
	if (state.white === "in" || state.white === "full") return false;
	return !pageDone(state, ctx);
}

function fadeCheck(state: CutState, ctx: CutCtx): CutState {
	const { fade } = ctx;
	if (!fade || ctx.instant || state.faded || state.white !== "none") {
		return state;
	}
	if (state.phase !== "play" || state.page !== fade.page) return state;
	const length = lengthOf(state, ctx);
	if (Math.min(state.typed, length) < Math.min(fade.at, length)) return state;
	return { ...state, white: "in", faded: true };
}

function enter(page: number, ctx: CutCtx, white: CutWhite): CutState {
	return fadeCheck(
		{ phase: "play", page, typed: ctx.instant ? FULL : 0, white, faded: false },
		ctx,
	);
}

function advance(state: CutState, ctx: CutCtx, white: CutWhite): CutState {
	const page = state.page + 1;
	if (page < ctx.lengths.length) return enter(page, ctx, white);
	return { ...state, phase: "end", typed: FULL, white: "none" };
}

export function cutStep(
	state: CutState,
	event: CutEvent,
	ctx: CutCtx,
): CutState {
	if (!ctx.lengths.length) return state;
	switch (event.type) {
		case "play":
		case "restart":
			return enter(0, ctx, "none");
		case "type": {
			if (!typing(state, ctx)) return state;
			const typed = Math.min(
				lengthOf(state, ctx),
				state.typed + Math.max(0, Math.floor(event.chars)),
			);
			return fadeCheck({ ...state, typed }, ctx);
		}
		case "next": {
			if (state.phase === "start") return enter(0, ctx, "none");
			if (state.phase === "end") return state;
			if (state.white === "in") return cutStep(state, { type: "whiteIn" }, ctx);
			if (state.white === "full") return advance(state, ctx, "out");
			if (!pageDone(state, ctx)) {
				return fadeCheck({ ...state, typed: FULL }, ctx);
			}
			const fading = fadeCheck(state, ctx);
			if (fading !== state) return fading;
			return advance(state, ctx, "none");
		}
		case "back": {
			if (state.phase === "start") return state;
			const page =
				state.phase === "end" ? ctx.lengths.length - 1 : state.page - 1;
			if (page < 0) return state;
			return { phase: "play", page, typed: FULL, white: "none", faded: true };
		}
		case "whiteIn":
			if (state.phase !== "play" || state.white !== "in") return state;
			return ctx.fade?.autoNext
				? advance(state, ctx, "out")
				: { ...state, white: "full" };
		case "whiteOut":
			return state.white === "out" ? { ...state, white: "none" } : state;
		case "sync":
			return fadeCheck(state, ctx);
	}
}
