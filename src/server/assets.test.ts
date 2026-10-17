import assert from "node:assert/strict";
import test from "node:test";
import {
	assetCanPreview,
	assetContentType,
	assetDisposition,
	assetKind,
	assetTab,
	assetThumbKey,
	chartJsonOf,
	FOOLS_PREFIX,
	formatSize,
	isPublicAssetKey,
	packOf,
	publicAssetUrl,
	readAssetPage,
	SIDE_ILL_DIR,
	splitTree,
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

test("each listed file carries a short form of its etag as its version", () => {
	const page = readAssetPage({
		result: [
			{
				key: "music/a.ogg",
				size: 1,
				etag: '"0123456789ABCDEF0123456789abcdef"',
			},
			{ key: "music/b.ogg", size: 1, etag: "short" },
			{ key: "music/c.ogg", size: 1 },
		],
	});
	assert.deepEqual(page.files, [
		{ key: "music/a.ogg", size: 1, v: "0123456789ab" },
		{ key: "music/b.ogg", size: 1 },
		{ key: "music/c.ogg", size: 1 },
	]);
	assert.deepEqual(
		readAssetPage({ result: [{ key: "texts/story.json", size: 2 }] }).files,
		[],
		"page-only trees stay off the public listing",
	);
	assert.deepEqual(
		readAssetPage({ result: [{ key: "texts/story.json", size: 2 }] }, (key) =>
			key.startsWith("texts/"),
		).files,
		[{ key: "texts/story.json", size: 2 }],
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
	assert.match(
		assetDisposition('4-1/phira/SP/a"b\\c-SP.pez', true),
		/filename="abc-SP\.pez";/,
	);
});

test("public asset urls stay on the R2 host", () => {
	assert.equal(
		publicAssetUrl("https://r2.example.test/", "original_ill/ill/Song A&B.png"),
		"https://r2.example.test/original_ill/ill/Song%20A%26B.png",
	);
	assert.equal(
		publicAssetUrl("https://r2.example.test", "music/a.ogg", "0123abcd"),
		"https://r2.example.test/music/a.ogg?v=0123abcd",
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

test("the 4/1 tree is public and classified like the tree it mirrors", () => {
	assert.equal(isPublicAssetKey("4-1/index.json"), true);
	assert.equal(isPublicAssetKey("4-1/"), false);
	assert.equal(isPublicAssetKey("4-1/../info/info.csv"), false);
	assert.equal(assetKind("4-1/original_ill/ill/a.png"), "jacket");
	assert.equal(assetKind("4-1/original_ill/illLow/a.png"), "low");
	assert.equal(assetKind("4-1/original_ill/illBlur/a.png"), "blur");
	assert.equal(assetKind("4-1/phira/SP/a-SP.pez"), "chart");
	assert.equal(assetKind("4-1/music/a.ogg"), "music");
	assert.equal(assetKind("4-1/index.json"), "other");
	assert.equal(
		assetThumbKey("4-1/original_ill/ill/a.png"),
		"4-1/original_ill/illLow/a.png",
	);
	assert.equal(
		assetThumbKey("4-1/music/a.ogg"),
		"4-1/original_ill/illLow/a.png",
	);
	assert.equal(assetThumbKey("4-1/phira/SP/a-SP.pez"), "4-1/phira/SP/a-SP.pez");
});

test("only the 4/1 tree goes on the fools tab", () => {
	assert.equal(assetTab("4-1/music/a.ogg"), "fools");
	assert.equal(assetTab("4-1/index.json"), "fools");
	assert.equal(assetTab("music/a.ogg"), "files");
	assert.equal(assetTab("original_ill/ill/4-1.png"), "files");
	assert.equal(assetTab("info/4-1/a.json"), "files");
});

test("splitTree takes the 4/1 root off a key, and only a whole leading segment", () => {
	assert.deepEqual(splitTree("4-1/phira/IN/a.pez"), ["4-1/", "phira/IN/a.pez"]);
	assert.deepEqual(splitTree("4-1/original_ill/ill/a.png"), [
		"4-1/",
		"original_ill/ill/a.png",
	]);
	assert.deepEqual(splitTree("phira/IN/a.pez"), ["", "phira/IN/a.pez"]);
	assert.deepEqual(splitTree("4-1x/a.png"), ["", "4-1x/a.png"]);
	assert.deepEqual(splitTree("info/4-1/a.json"), ["", "info/4-1/a.json"]);
	assert.deepEqual(splitTree("4-1"), ["", "4-1"]);
});

test("the 4/1 jackets live in a fixed directory the files page classifies as jackets", () => {
	const ill = `${FOOLS_PREFIX}/${SIDE_ILL_DIR}`;
	assert.equal(ill, "4-1/original_ill");
	assert.equal(assetKind(`${ill}/ill/a.png`), "jacket");
	assert.equal(assetThumbKey(`${ill}/ill/a.png`), `${ill}/illLow/a.png`);
});

test("videos and the collection are public trees, with their own kinds", () => {
	assert.equal(isPublicAssetKey("pv/video/spas-unlock.mp4"), true);
	assert.equal(isPublicAssetKey("pv/index.json"), true);
	assert.equal(isPublicAssetKey("collection/text/en.json"), true);
	assert.equal(isPublicAssetKey("pv/"), false);
	assert.equal(isPublicAssetKey("pv/../info/info.csv"), false);
	assert.equal(assetKind("pv/video/spas-unlock.mp4"), "video");
	assert.equal(assetKind("pv/index.json"), "other");
	assert.equal(assetKind("pv/overlay/index.json"), "other");
	assert.equal(assetKind("pv/overlay/qd-ja.mp4"), "video");
	assert.equal(assetKind("collection/index.json"), "collection");
	assert.equal(assetKind("4-1/pv/video/a.mp4"), "video");
});

test("an MP4 plays in the page and downloads as a file", () => {
	assert.equal(assetCanPreview("pv/video/spas-unlock.mp4"), "video");
	assert.equal(assetContentType("pv/video/spas-unlock.mp4"), "video/mp4");
	assert.equal(assetCanPreview("collection/text/en.json"), "text");
	assert.match(
		assetDisposition("pv/video/spas-unlock.mp4", true),
		/^attachment;/,
	);
	assert.match(
		assetDisposition("pv/video/spas-unlock.mp4", false),
		/filename="spas-unlock\.mp4"/,
	);
});

test("sizes read at a glance", () => {
	assert.equal(formatSize(10), "10 B");
	assert.equal(formatSize(612_739), "598 KB");
	assert.equal(formatSize(18_053_964), "17.2 MB");
});

test("the hidden song is a public tree of its own", () => {
	assert.equal(isPublicAssetKey("c9s6/music.ogg"), true);
	assert.equal(isPublicAssetKey("c9s6/"), false);
	assert.equal(assetKind("c9s6/chart.json"), "hidden");
	assert.equal(assetKind("c9s6/background.png"), "hidden");
	assert.equal(assetContentType("c9s6/music.ogg"), "audio/ogg");
});

test("collection art is a public tree of its own, listed with its JPEG", () => {
	assert.equal(isPublicAssetKey("collection-art/liangrenhuihe0.png"), true);
	assert.equal(isPublicAssetKey("collection-art/index.json"), true);
	assert.equal(isPublicAssetKey("collection-art/"), false);
	assert.equal(assetKind("collection-art/liangrenhuihe0.png"), "art");
	assert.equal(assetKind("collection-art/index.json"), "art");
	assert.equal(assetKind("collection/index.json"), "collection");
	assert.equal(
		assetThumbKey("collection-art/liangrenhuihe0.png"),
		"collection-art/liangrenhuihe0.jpg",
	);
	assert.equal(
		assetThumbKey("collection-art/liangrenhuihe0.jpg"),
		"collection-art/liangrenhuihe0.jpg",
	);
	assert.equal(
		assetThumbKey("collection-art/blackhole0-tile.png"),
		"collection-art/blackhole0-tile.png",
		"a map tile has no JPEG of its own",
	);
	assert.equal(
		assetContentType("collection-art/liangrenhuihe0.jpg"),
		"image/jpeg",
	);
	assert.match(
		assetDisposition("collection-art/liangrenhuihe0.png", false),
		/^inline;/,
	);
});

test("unlock-only packs are charts, named by song and a readable level", () => {
	const sp = "phira/SP/Message.くるぶっこちゃん-SP.pez";
	assert.equal(isPublicAssetKey(sp), true);
	assert.equal(assetKind(sp), "chart");
	assert.deepEqual(packOf(sp), {
		stem: "Message.くるぶっこちゃん",
		level: { base: "SP", tag: "", label: "SP" },
		folder: "SP",
	});
	for (const lv of ["EZ", "HD", "IN"]) {
		const key = `phira/${lv}_Error/望影の方舟Six.SeURa-${lv}_Error.pez`;
		assert.equal(assetKind(key), "chart");
		assert.deepEqual(packOf(key), {
			stem: "望影の方舟Six.SeURa",
			level: { base: lv, tag: "Error", label: `${lv} Error` },
			folder: `${lv}_Error`,
		});
	}
	assert.equal(
		packOf("phira/IN/Glaciaxion.SunsetRay-IN.pez")?.level.label,
		"IN",
	);
	assert.equal(
		packOf("4-1/phira/SP/Spasmodic.姜米條-SP.pez")?.stem,
		"Spasmodic.姜米條",
	);
});

test("any level folder the ripper packs names its packs, and nothing else does", () => {
	assert.deepEqual(packOf("phira/Legacy/Aleph0.LeaF-Legacy.pez"), {
		stem: "Aleph0.LeaF",
		level: { tag: "", label: "Legacy" },
		folder: "Legacy",
	});
	assert.equal(
		packOf("phira/XX_Error/Song.A-XX_Error.pez")?.level.label,
		"XX Error",
	);
	assert.equal(packOf("phira/IN/Song.A-IN.json"), undefined);
	assert.equal(packOf("phira/IN/Song.A-HD.pez"), undefined);
	assert.equal(packOf("phira/IN/-IN.pez"), undefined);
	assert.equal(packOf("phira/IN/x/Song.A-IN.pez"), undefined);
	assert.equal(packOf("music/Song.A.ogg"), undefined);
	assert.equal(packOf(""), undefined);
});

test("chart JSON files name their song and level", () => {
	assert.equal(assetKind("chart/Message.くるぶっこちゃん.0/SP.json"), "json");
	assert.equal(isPublicAssetKey("chart/Aleph0.LeaF.0/Legacy.json"), true);
	assert.deepEqual(chartJsonOf("chart/Message.くるぶっこちゃん.0/SP.json"), {
		stem: "Message.くるぶっこちゃん",
		level: { base: "SP", tag: "", label: "SP" },
	});
	assert.equal(
		chartJsonOf("chart/望影の方舟Six.SeURa.0/EZ_Error.json")?.level.label,
		"EZ Error",
	);
	assert.equal(chartJsonOf("chart/A.0/IN.ogg"), undefined);
	assert.equal(chartJsonOf("chart/A.0/x/IN.json"), undefined);
	assert.equal(chartJsonOf("chart//IN.json"), undefined);
	assert.equal(chartJsonOf("phira/IN/A-IN.pez"), undefined);
});
