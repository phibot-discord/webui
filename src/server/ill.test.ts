import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
	assetKeyOf,
	fallbackKeyOf,
	hydrateIlls,
	illCacheBytes,
	illKey,
	pruneIllCache,
	songIllPath,
} from "./ill";
import { logger } from "./logger";

test("jackets, avatars and icons map to R2 keys; css and fonts do not", () => {
	const res = "/srv/app/phi-assets";
	assert.equal(
		assetKeyOf(`${res}/original_ill/illLow/Credits.Frums.png`),
		"original_ill/illLow/Credits.Frums.png",
	);
	assert.equal(
		assetKeyOf(`${res}/html/avatar/Drop it.png`),
		"html/avatar/Drop it.png",
	);
	assert.equal(assetKeyOf(`${res}/html/otherimg/S.png`), "html/otherimg/S.png");
	// Templates HTML-escape src values; the key must use the real filename
	assert.equal(
		assetKeyOf(`${res}/original_ill/illLow/Song.A&#38;B.png`),
		"original_ill/illLow/Song.A&B.png",
	);
	assert.equal(
		assetKeyOf(`${res}/original_ill/SP/Revisit(2024 April Fools&#39; Day).png`),
		"original_ill/SP/Revisit(2024 April Fools' Day).png",
	);
	// 4/1 specials: the jacket tree is mirrored under 4-1/
	assert.equal(
		assetKeyOf(`${res}/original_ill/4-1/illBlur/Song.A.png`),
		"4-1/original_ill/illBlur/Song.A.png",
	);
	assert.equal(assetKeyOf(`${res}/html/b19/b19.css`), undefined);
	assert.equal(assetKeyOf(`${res}/html/common/font/phi.woff2`), undefined);
	assert.equal(assetKeyOf("phi-css://takumi.css"), undefined);
});

test("a per-difficulty jacket maps to its R2 key and falls back to its own low-res copy", () => {
	const res = "/srv/app/phi-assets";
	assert.equal(
		assetKeyOf(`${res}/original_ill/ill/IN/Happy.Apollo.png`),
		"original_ill/ill/IN/Happy.Apollo.png",
	);
	assert.equal(
		fallbackKeyOf("original_ill/ill/IN/Happy.Apollo.png"),
		"original_ill/illLow/IN/Happy.Apollo.png",
	);
});

test("songIllPath points at the R2 tree without looking on disk", () => {
	const root = "/no/local/original_ill";
	assert.equal(
		songIllPath(root, "Credits.Frums", "low"),
		"/no/local/original_ill/illLow/Credits.Frums.png",
	);
	assert.equal(
		songIllPath(root, "Credits.Frums", "common"),
		"/no/local/original_ill/ill/Credits.Frums.png",
	);
	assert.equal(
		songIllPath(root, "Credits.Frums", "blur"),
		"/no/local/original_ill/illBlur/Credits.Frums.png",
	);
	assert.equal(
		songIllPath(root, "Credits.Frums", "low", "normal"),
		"/no/local/original_ill/illLow/Credits.Frums.png",
	);
	assert.equal(
		songIllPath(root, "Introduction", "blur", "sp"),
		"/no/local/original_ill/SP/Introduction.png",
	);
	// A song with a jacket per difficulty keeps each chart's in a directory of the level
	assert.equal(
		songIllPath(root, "Happy.Apollo", "common", "normal", "IN"),
		"/no/local/original_ill/ill/IN/Happy.Apollo.png",
	);
	assert.equal(
		songIllPath(root, "Happy.Apollo", "low", "normal", "AT"),
		"/no/local/original_ill/illLow/AT/Happy.Apollo.png",
	);
	assert.equal(
		songIllPath(root, "Happy.Apollo", "blur", "normal", "EZ"),
		"/no/local/original_ill/illBlur/EZ/Happy.Apollo.png",
	);
	// Only the normal tree has them
	assert.equal(
		songIllPath(root, "Introduction", "blur", "sp", "IN"),
		"/no/local/original_ill/SP/Introduction.png",
	);
	assert.equal(
		songIllPath(root, "Oblivion.Daily", "low", "fools", "IN"),
		"/no/local/original_ill/4-1/illLow/Oblivion.Daily.png",
	);
	// A 4/1 special has all three sizes, where SP only ever had the full one
	assert.equal(
		songIllPath(root, "Oblivion.Daily", "low", "fools"),
		"/no/local/original_ill/4-1/illLow/Oblivion.Daily.png",
	);
	assert.equal(
		songIllPath(root, "Oblivion.Daily", "common", "fools"),
		"/no/local/original_ill/4-1/ill/Oblivion.Daily.png",
	);
});

test("the 4/1 jackets stay in 4-1/original_ill/ beside the main tree's", () => {
	const res = "/srv/app/phi-assets";
	assert.equal(
		assetKeyOf(`${res}/original_ill/illLow/Credits.Frums.png`),
		"original_ill/illLow/Credits.Frums.png",
	);
	assert.equal(
		assetKeyOf(`${res}/original_ill/4-1/ill/Oblivion.Daily.png`),
		"4-1/original_ill/ill/Oblivion.Daily.png",
	);
	assert.equal(
		fallbackKeyOf("original_ill/ill/Stasis.Maozon.png"),
		"original_ill/illLow/Stasis.Maozon.png",
	);
	assert.equal(
		fallbackKeyOf("4-1/original_ill/ill/Oblivion.Daily.png"),
		"4-1/original_ill/illLow/Oblivion.Daily.png",
	);
	assert.equal(fallbackKeyOf("4-1/jackets/ill/Oblivion.Daily.png"), undefined);
	assert.equal(fallbackKeyOf("4-1/html/avatar/a.png"), undefined);
});

test("illKey gives the R2 key of a side tree's jacket under its own prefix", () => {
	assert.equal(
		illKey("テリトリーバトル.ツユ", "low", "removed"),
		"removed/original_ill/illLow/テリトリーバトル.ツユ.png",
	);
	assert.equal(
		illKey("Oblivion.Daily", "common", "fools", "IN"),
		"4-1/original_ill/ill/Oblivion.Daily.png",
	);
	assert.equal(
		illKey("Happy.Apollo", "low", "normal", "AT"),
		"original_ill/illLow/AT/Happy.Apollo.png",
	);
	assert.equal(
		illKey("Introduction", "low", "sp"),
		"original_ill/SP/Introduction.png",
	);
});

test("full jacket R2 miss falls back to illLow; unknown avatar to Introduction", () => {
	assert.equal(
		fallbackKeyOf("original_ill/ill/Stasis.Maozon.png"),
		"original_ill/illLow/Stasis.Maozon.png",
	);
	assert.equal(
		fallbackKeyOf("original_ill/illLow/Stasis.Maozon.png"),
		undefined,
	);
	assert.equal(
		fallbackKeyOf("original_ill/illBlur/Stasis.Maozon.png"),
		undefined,
	);
	assert.equal(
		fallbackKeyOf("html/avatar/NotYetSynced.png"),
		"html/avatar/Introduction.png",
	);
	assert.equal(
		fallbackKeyOf("4-1/original_ill/ill/Oblivion.Daily.png"),
		"4-1/original_ill/illLow/Oblivion.Daily.png",
	);
	assert.equal(
		fallbackKeyOf("4-1/original_ill/illLow/Oblivion.Daily.png"),
		undefined,
	);
	assert.equal(fallbackKeyOf("html/avatar/Introduction.png"), undefined);
	assert.equal(fallbackKeyOf("html/otherimg/S.png"), undefined);
});

test("a jacket that exists on disk is used as-is and never fetched", async () => {
	const dir = mkdtempSync(join(tmpdir(), "phi-ill-local-"));
	const local = join(dir, "original_ill", "illLow", "A&B.png");
	mkdirSync(dirname(local), { recursive: true });
	writeFileSync(local, "png");
	const escaped = join(dir, "original_ill", "illLow", "A&#38;B.png");
	const map = await hydrateIlls([escaped, local]);
	assert.equal(map.get(escaped), local);
	assert.equal(map.has(local), false);
});

test("the jacket cache budget comes from PHI_ILL_CACHE_MB, 128 MB when unset or not a positive number", () => {
	for (const raw of [undefined, "", "0", "-5", "abc"]) {
		assert.equal(illCacheBytes(raw), 128 * 1024 * 1024);
	}
	assert.equal(illCacheBytes(" 64 "), 64 * 1024 * 1024);
});

test("the jacket cache prunes at most once every 30 seconds", (t) => {
	t.mock.method(logger, "warn", () => undefined);
	const at = 1_800_000_000_000;
	assert.notEqual(pruneIllCache(0, at), null);
	assert.equal(pruneIllCache(0, at + 29_999), null);
	assert.notEqual(pruneIllCache(0, at + 30_000), null);
});
