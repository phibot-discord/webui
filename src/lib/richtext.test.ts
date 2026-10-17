import assert from "node:assert/strict";
import test from "node:test";
import { parseRichText, type RichSegment } from "./richtext";

function marks(segments: RichSegment[]): string[] {
	return segments.map(
		(s) =>
			`${s.bold ? "b" : ""}${s.italic ? "i" : ""}${s.hl ? "c" : ""}:${s.text}`,
	);
}

test("plain text is one segment", () => {
	assert.deepEqual(parseRichText("行与憩\n第二行"), [
		{ at: 0, text: "行与憩\n第二行", bold: false, italic: false, hl: false },
	]);
	assert.deepEqual(parseRichText(""), []);
});

test("bold, italic and colour tags mark their text and leave the page", () => {
	assert.deepEqual(
		marks(parseRichText("片名浮出水面：\n \n<b>极星卫</b>\n \n……")),
		[":片名浮出水面：\n \n", "b:极星卫", ":\n \n……"],
	);
	assert.deepEqual(
		marks(
			parseRichText("毕竟<b><color=#00e4ff>人类</color></b>的大脑嘛——你懂得"),
		),
		[":毕竟", "bc:人类", ":的大脑嘛——你懂得"],
	);
	assert.deepEqual(marks(parseRichText("a<i>b<b>c</b></i>d")), [
		":a",
		"i:b",
		"bi:c",
		":d",
	]);
	assert.deepEqual(marks(parseRichText('<color="red">x</color>')), ["c:x"]);
});

test("size tags are dropped and the text around them joins up", () => {
	assert.deepEqual(parseRichText("a<size=40>b</size>c"), [
		{ at: 0, text: "abc", bold: false, italic: false, hl: false },
	]);
});

test("segment offsets point into the source and never repeat", () => {
	const segments = parseRichText("x<b>y</b>z<b>w</b>");
	assert.deepEqual(
		segments.map((s) => s.at),
		[0, 4, 9, 13],
	);
});

test("unbalanced and unknown tags stay as text", () => {
	assert.deepEqual(marks(parseRichText("a</b>b")), [":a</b>b"]);
	assert.deepEqual(marks(parseRichText("<b>open")), [":<b>open"]);
	assert.deepEqual(marks(parseRichText("<b>a</b></b>")), ["b:a", ":</b>"]);
	assert.deepEqual(marks(parseRichText("<b><i>a</b></i>")), ["bi:a"]);
	assert.deepEqual(marks(parseRichText("<The Fall of Lavabo>")), [
		":<The Fall of Lavabo>",
	]);
	assert.deepEqual(marks(parseRichText("<color>x</color> <b=1>y</b>")), [
		":<color>x</color> <b=1>y</b>",
	]);
	assert.deepEqual(marks(parseRichText("<B>x</B><u>y</u>")), [
		":<B>x</B><u>y</u>",
	]);
});
