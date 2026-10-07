import assert from "node:assert/strict";
import test from "node:test";
import {
	assetContentType,
	assetDisposition,
	assetKind,
	assetThumbKey,
	isPublicAssetKey,
	publicAssetUrl,
	readAssetPage,
} from "@/lib/assets";

test("public asset keys stay inside the published trees", () => {
	assert.equal(isPublicAssetKey("original_ill/ill/Credits.Frums.png"), true);
	assert.equal(isPublicAssetKey("phira/IN/Song-IN.pez"), true);
	assert.equal(isPublicAssetKey("info/info.csv"), true);
	assert.equal(isPublicAssetKey("html/avatar/Drop it.png"), true);
	assert.equal(isPublicAssetKey("web-cards/b30.jpg"), false);
	assert.equal(isPublicAssetKey("original_ill/../info/info.csv"), false);
	assert.equal(isPublicAssetKey("/original_ill/ill/a.png"), false);
	assert.equal(isPublicAssetKey("original_ill/"), false);
});

test("asset kind follows the key prefix", () => {
	assert.equal(assetKind("original_ill/ill/a.png"), "jacket");
	assert.equal(assetKind("original_ill/illLow/a.png"), "low");
	assert.equal(assetKind("original_ill/illBlur/a.png"), "blur");
	assert.equal(assetKind("original_ill/SP/a.png"), "other");
	assert.equal(assetKind("phira/AT/a-AT.pez"), "chart");
	assert.equal(assetKind("info/notesInfo.json"), "info");
});

test("list page keeps public keys and the next cursor", () => {
	const page = readAssetPage({
		success: true,
		result: [
			{ key: "info/tips.txt", size: 12 },
			{ key: "web-cards/secret.jpg", size: 99 },
			{ key: "nope", size: 1 },
			{ key: "phira/EZ/a-EZ.pez" },
		],
		result_info: { is_truncated: true, cursor: "next" },
	});
	assert.deepEqual(page.files, [
		{ key: "info/tips.txt", size: 12 },
		{ key: "phira/EZ/a-EZ.pez", size: 0 },
	]);
	assert.equal(page.cursor, "next");
	assert.equal(
		readAssetPage({
			result: [],
			result_info: { is_truncated: false, cursor: "ignore" },
		}).cursor,
		undefined,
	);
});

test("downloads name the file and images can open inline", () => {
	assert.equal(
		assetContentType("info/notesInfo.json"),
		"application/json; charset=utf-8",
	);
	assert.match(assetDisposition("phira/IN/曲-IN.pez", false), /^attachment;/);
	assert.match(
		assetDisposition("phira/IN/曲-IN.pez", false),
		/filename\*=UTF-8''/,
	);
	assert.match(assetDisposition("original_ill/ill/a.png", false), /^inline;/);
	assert.match(
		assetDisposition("original_ill/ill/a.png", true),
		/^attachment;/,
	);
});

test("public asset urls stay on the R2 host", () => {
	assert.equal(
		publicAssetUrl("https://r2.example.test/", "original_ill/ill/Song A&B.png"),
		"https://r2.example.test/original_ill/ill/Song%20A%26B.png",
	);
});

test("music is a public tree; its rows show the song's jacket", () => {
	assert.equal(isPublicAssetKey("music/Stasis.Maozon.ogg"), true);
	assert.equal(assetKind("music/Stasis.Maozon.ogg"), "music");
	assert.equal(assetContentType("music/Stasis.Maozon.ogg"), "audio/ogg");
	assert.equal(
		assetThumbKey("music/Stasis.Maozon.ogg"),
		"original_ill/illLow/Stasis.Maozon.png",
	);
});
