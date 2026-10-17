import assert from "node:assert/strict";
import test from "node:test";
import type { CutLine, CutPage } from "./c9s6";
import { pickLocal } from "./collection";
import {
	CUT_START,
	type CutCtx,
	type CutEvent,
	type CutState,
	cutCtx,
	cutStep,
	FULL,
	imageShown,
	lineEnd,
	pageText,
	plainLines,
	typeOut,
	typing,
} from "./cutscene";

function line(over: Partial<CutLine>): CutLine {
	return { "zh-CN": "", "zh-TW": "", en: "", ja: "", ko: "", ...over };
}

const PAGES: CutPage[] = [
	{ lines: [line({ en: "Run.", "zh-CN": "快跑。" })] },
	{
		lines: [
			line({ en: "Go!", "zh-CN": "走！" }),
			line({ en: "", "zh-CN": "等等" }),
		],
	},
	{ lines: [line({ en: "Find you", "zh-CN": "找你" })] },
	{ lines: [line({ en: "Got it", "zh-CN": "获得" })] },
];

const FADE = { page: 2, line: 0, in: 0.5, out: 0.5, autoNext: true };

function ctxOf(
	lang: "en" | "zh-CN" = "en",
	fade = FADE as typeof FADE | null,
	instant = false,
): CutCtx {
	return cutCtx(
		PAGES.map((p) => pageText(p, lang)),
		fade,
		instant,
	);
}

function run(events: CutEvent[], ctx = ctxOf(), from = CUT_START): CutState {
	return events.reduce((state, event) => cutStep(state, event, ctx), from);
}

const NEXT: CutEvent = { type: "next" };
const BACK: CutEvent = { type: "back" };
const type = (chars: number): CutEvent => ({ type: "type", chars });

test("an empty line falls back to the original Chinese", () => {
	const l = line({ en: "Go!", "zh-CN": "走！", ja: "  " });
	assert.deepEqual(pickLocal(l, "en"), { text: "Go!", lang: "en" });
	assert.deepEqual(pickLocal(l, "ja"), { text: "走！", lang: "zh-CN" });
	assert.deepEqual(pickLocal(l, "ko"), { text: "走！", lang: "zh-CN" });
	assert.deepEqual(pickLocal(l, "zh-CN"), { text: "走！", lang: "zh-CN" });
	assert.deepEqual(pickLocal(line({}), "en"), { text: "", lang: "zh-CN" });
	const page = pageText(PAGES[1] as CutPage, "en");
	assert.deepEqual(
		page.lines.map((l) => [l.text, l.lang]),
		[
			["Go!", "en"],
			["等等", "zh-CN"],
		],
	);
	assert.equal(page.length, 5);
	assert.deepEqual(plainLines(page), [
		{ at: 0, text: "Go!", lang: "en" },
		{ at: 1, text: "等等", lang: "zh-CN" },
	]);
});

test("page text counts what is shown, not the markup", () => {
	const page = pageText(
		{
			lines: [
				line({ en: "a <b>bold</b> 🙂", "zh-CN": "x" }),
				line({ en: "second" }),
			],
		},
		"en",
	);
	assert.equal(page.lines[0]?.length, 8);
	assert.equal(page.length, 14);
	assert.equal(lineEnd(page, 0), 8);
	assert.equal(lineEnd(page, 1), 14);
	assert.deepEqual(
		plainLines(page).map((l) => l.text),
		["a bold 🙂", "second"],
	);
	const typed = typeOut(page, 4);
	assert.deepEqual(
		typed[0]?.segments.map((s) => [s.text, s.rest, s.bold]),
		[
			["a ", "", false],
			["bo", "ld", true],
			["", " 🙂", false],
		],
	);
	assert.deepEqual(
		typed[1]?.segments.map((s) => [s.text, s.rest]),
		[["", "second"]],
	);
	const half = typeOut(page, 7);
	assert.deepEqual(
		[half[0]?.segments[2]?.text, half[0]?.segments[2]?.rest],
		[" ", "🙂"],
		"an emoji is typed whole",
	);
	assert.equal(typeOut(page, 8)[0]?.segments[2]?.text, " 🙂");
	const all = typeOut(page, FULL);
	assert.equal(all[1]?.segments[0]?.text, "second");
	assert.equal(all[1]?.segments[0]?.rest, "");
});

test("play starts typing the first page; nothing happens before it", () => {
	const ctx = ctxOf();
	assert.equal(typing(CUT_START, ctx), false);
	assert.deepEqual(run([type(3), BACK, { type: "whiteIn" }]), CUT_START);
	const playing = run([{ type: "play" }]);
	assert.deepEqual(playing, {
		phase: "play",
		page: 0,
		typed: 0,
		white: "none",
		faded: false,
	});
	assert.equal(typing(playing, ctx), true);
	assert.equal(run([{ type: "play" }, type(2)]).typed, 2);
	assert.equal(run([{ type: "play" }, type(99)]).typed, 4);
	assert.equal(typing(run([{ type: "play" }, type(99)]), ctx), false);
	assert.equal(run([NEXT]).phase, "play", "Next on the start screen plays");
});

test("Next completes a page while it types, then turns it", () => {
	const typed = run([{ type: "play" }, type(1), NEXT]);
	assert.equal(typed.page, 0);
	assert.equal(typed.typed, FULL);
	const turned = run([NEXT], ctxOf(), typed);
	assert.equal(turned.page, 1);
	assert.equal(turned.typed, 0);
	const done = run([{ type: "play" }, type(4), NEXT]);
	assert.equal(done.page, 1, "a page typed to the end turns at once");
});

test("Back shows the previous page whole and stops at the first", () => {
	const second = run([{ type: "play" }, NEXT, NEXT, type(2)]);
	assert.equal(second.page, 1);
	const back = run([BACK], ctxOf(), second);
	assert.equal(back.page, 0);
	assert.equal(back.typed, FULL);
	assert.equal(back.phase, "play");
	assert.deepEqual(run([BACK], ctxOf(), back), back);
});

test("the fade to white starts when its line is shown and turns the page by itself", () => {
	const ctx = ctxOf();
	assert.deepEqual(ctx.fade, { page: 2, at: 8, autoNext: true });
	const onPage = run([{ type: "play" }, NEXT, NEXT, NEXT, NEXT]);
	assert.equal(onPage.page, 2);
	assert.equal(onPage.white, "none");
	const almost = run([type(7)], ctx, onPage);
	assert.equal(almost.white, "none");
	const fading = run([type(1)], ctx, almost);
	assert.equal(fading.white, "in");
	assert.equal(typing(fading, ctx), false, "typing waits for the white");
	assert.equal(run([type(5)], ctx, fading).typed, 8);
	const after = run([{ type: "whiteIn" }], ctx, fading);
	assert.deepEqual(after, {
		phase: "play",
		page: 3,
		typed: 0,
		white: "out",
		faded: false,
	});
	assert.equal(typing(after, ctx), true, "the next page types under the fade");
	assert.equal(run([{ type: "whiteOut" }], ctx, after).white, "none");
	assert.equal(run([{ type: "whiteOut" }], ctx, onPage), onPage);
});

test("Next during the fade skips it, and Next completing the line starts it", () => {
	const ctx = ctxOf();
	const onPage = run([{ type: "play" }, NEXT, NEXT, NEXT, NEXT]);
	const fading = run([NEXT], ctx, onPage);
	assert.equal(fading.white, "in");
	assert.equal(fading.page, 2);
	const skipped = run([NEXT], ctx, fading);
	assert.equal(skipped.page, 3);
	assert.equal(skipped.white, "out");
});

test("without autoNext the page stays white until Next", () => {
	const ctx = ctxOf("en", { ...FADE, autoNext: false });
	const onPage = run([{ type: "play" }, NEXT, NEXT, NEXT, NEXT], ctx);
	const white = run([NEXT, { type: "whiteIn" }], ctx, onPage);
	assert.equal(white.white, "full");
	assert.equal(white.page, 2);
	const next = run([NEXT], ctx, white);
	assert.equal(next.page, 3);
	assert.equal(next.white, "out");
});

test("going back to the fade page shows it without fading again", () => {
	const ctx = ctxOf();
	const last = run([{ type: "play" }, NEXT, NEXT, NEXT, NEXT, NEXT], ctx);
	const after = run([{ type: "whiteIn" }], ctx, last);
	assert.equal(after.page, 3);
	const back = run([BACK], ctx, after);
	assert.equal(back.page, 2);
	assert.equal(back.white, "none");
	assert.equal(back.faded, true);
	const forward = run([NEXT], ctx, back);
	assert.equal(forward.page, 3);
	assert.equal(forward.white, "none");
});

test("the fade waits for the end of its line, in the shown language", () => {
	const ctx = ctxOf("en", { ...FADE, page: 1, line: 0 });
	assert.deepEqual(ctx.fade, { page: 1, at: 3, autoNext: true });
	const zh = ctxOf("zh-CN", { ...FADE, page: 1, line: 1 });
	assert.deepEqual(zh.fade, { page: 1, at: 4, autoNext: true });
	const second = run([{ type: "play" }, NEXT, NEXT, type(2)], ctx);
	assert.equal(second.white, "none");
	assert.equal(run([type(1)], ctx, second).white, "in");
});

test("a fade page completed by a language or motion change still fades", () => {
	const en = ctxOf("en");
	const zh = ctxOf("zh-CN");
	const onPage = run([{ type: "play" }, NEXT, NEXT, NEXT, NEXT, type(2)], en);
	assert.deepEqual([onPage.page, onPage.typed, onPage.white], [2, 2, "none"]);
	assert.equal(typing(onPage, zh), false, "the shorter page is already typed");
	const next = run([NEXT], zh, onPage);
	assert.deepEqual([next.page, next.white, next.faded], [2, "in", true]);
	const synced = run([{ type: "sync" }], zh, onPage);
	assert.deepEqual([synced.page, synced.white], [2, "in"]);
	assert.equal(run([{ type: "whiteIn" }], zh, synced).page, 3);
	const instant = run([{ type: "play" }, NEXT, NEXT], ctxOf("en", FADE, true));
	assert.deepEqual(
		[instant.page, instant.typed, instant.faded],
		[2, FULL, false],
	);
	assert.equal(run([{ type: "sync" }], en, instant).white, "in");
	assert.equal(run([NEXT], en, instant).white, "in");
});

test("sync leaves every other state as it is", () => {
	const ctx = ctxOf();
	assert.equal(cutStep(CUT_START, { type: "sync" }, ctx), CUT_START);
	const typingPage = run([{ type: "play" }, NEXT, NEXT, NEXT, NEXT, type(3)]);
	assert.equal(cutStep(typingPage, { type: "sync" }, ctx), typingPage);
	const after = run(
		[{ type: "type", chars: 8 }, { type: "whiteIn" }],
		ctx,
		typingPage,
	);
	const back = run([BACK], ctx, after);
	assert.equal(back.faded, true);
	assert.equal(cutStep(back, { type: "sync" }, ctx), back);
	assert.equal(cutStep(after, { type: "sync" }, ctx), after);
});

test("past the last page is the end, and Replay or Restart start over", () => {
	const ctx = ctxOf("en", null);
	const end = run(
		[{ type: "play" }, NEXT, NEXT, NEXT, NEXT, NEXT, NEXT, NEXT, NEXT],
		ctx,
	);
	assert.equal(end.phase, "end");
	assert.equal(end.page, 3);
	assert.deepEqual(run([NEXT, type(2)], ctx, end), end);
	const back = run([BACK], ctx, end);
	assert.equal(back.phase, "play");
	assert.equal(back.page, 3);
	assert.equal(back.typed, FULL);
	const again = run([{ type: "restart" }], ctx, end);
	assert.equal(again.phase, "play");
	assert.equal(again.page, 0);
	assert.equal(again.typed, 0);
	const midway = run([{ type: "restart" }], ctx, back);
	assert.equal(midway.page, 0);
});

test("reduced motion shows whole pages and never fades", () => {
	const ctx = ctxOf("en", FADE, true);
	assert.equal(ctx.fade, null);
	const first = run([{ type: "play" }], ctx);
	assert.equal(first.typed, FULL);
	assert.equal(typing(first, ctx), false);
	const fadePage = run([NEXT, NEXT], ctx, first);
	assert.equal(fadePage.page, 2);
	assert.equal(fadePage.white, "none");
	assert.equal(run([NEXT], ctx, fadePage).page, 3);
});

test("the illustration shows from its page on, once playing", () => {
	assert.equal(imageShown(CUT_START, 0), false);
	const state = run([{ type: "play" }, NEXT, NEXT]);
	assert.equal(state.page, 1);
	assert.equal(imageShown(state, 1), true);
	assert.equal(imageShown(state, 2), false);
	assert.equal(imageShown(state, undefined), false);
	assert.equal(imageShown({ ...state, phase: "end", page: 3 }, 2), true);
});

test("a cutscene without pages does nothing", () => {
	const ctx = cutCtx([], null, false);
	assert.deepEqual(cutStep(CUT_START, { type: "play" }, ctx), CUT_START);
});
