import assert from "node:assert/strict";
import test from "node:test";
import { isJapaneseDocument } from "./css";
import { type OgPageData, ogPageHtml } from "./og-page";

const data: OgPageData = {
	brand: "PhiBot",
	title: "Songs",
	lede: "",
	host: "example.test",
	accent: "#fff",
	tiles: [],
};

test("a Japanese title card is marked Japanese", () => {
	assert.equal(isJapaneseDocument(ogPageHtml({ ...data, lang: "ja" })), true);
	assert.equal(
		isJapaneseDocument(ogPageHtml({ ...data, lang: "zh-CN" })),
		false,
	);
	assert.equal(isJapaneseDocument(ogPageHtml(data)), false);
});
