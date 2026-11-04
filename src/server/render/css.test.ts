import assert from "node:assert/strict";
import test from "node:test";
import { isJapaneseDocument, preferJapaneseFonts } from "./css";

test("Japanese cards list NotoSansJP right before NotoSansSC, once", () => {
	assert.equal(
		preferJapaneseFonts(
			"p { font-family: PHI, NotoSansSC, Aldrich, NotoSansJP, sans-serif !important; }",
		),
		"p { font-family: PHI, NotoSansJP, NotoSansSC, Aldrich, sans-serif !important; }",
	);
	assert.equal(
		preferJapaneseFonts(".a{font-family:NotoSansSC,PHI}"),
		".a{font-family:NotoSansJP, NotoSansSC,PHI}",
	);
	assert.equal(
		preferJapaneseFonts(
			'.b { font-family: "NotoSansJP", "NotoSansSC", serif; }',
		),
		'.b { font-family: NotoSansJP, "NotoSansSC", serif; }',
	);
	assert.equal(
		preferJapaneseFonts(
			'<p style="font-family: Aldrich, NotoSansSC; color: red">x</p>',
		),
		'<p style="font-family: Aldrich, NotoSansJP, NotoSansSC; color: red">x</p>',
	);
	assert.equal(
		preferJapaneseFonts(".c { font-family: Aldrich, sans-serif; }"),
		".c { font-family: Aldrich, sans-serif; }",
	);
});

test("only an html element marked ja counts as Japanese", () => {
	assert.equal(isJapaneseDocument('<html lang="ja"><body>'), true);
	assert.equal(isJapaneseDocument("<html lang=ja>"), true);
	assert.equal(isJapaneseDocument('<html lang="zh-cn">'), false);
	assert.equal(isJapaneseDocument('<html lang="en"><p lang="ja">'), false);
});
