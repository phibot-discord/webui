import assert from "node:assert/strict";
import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	renameSync,
	rmSync,
	statSync,
	symlinkSync,
	utimesSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, parse } from "node:path";
import test from "node:test";
import { logger } from "@/server/logger";
import {
	type CacheFiles,
	claimCacheRoot,
	markFileUsed,
	onListedForTest,
	PRUNE_MAX_DELETES,
	protectFolders,
	pruneToBudget,
	resetFileUseForTest,
	retryAfterPrune,
	TOUCH_GAP_MS,
	unsafeCacheRoot,
} from "./disk-budget";

const now = 1_800_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;
const PNG: CacheFiles = {
	setting: "TEST_CACHE",
	folders: [""],
	nested: true,
	name: /\.png$/,
};
const RADAR: CacheFiles = {
	setting: "TEST_RADAR",
	folders: [""],
	nested: false,
	name: /^[0-9a-f]{20}\.png$/,
};
const JACKETS: CacheFiles = {
	setting: "TEST_JACKETS",
	folders: ["original_ill", "html/avatar"],
	nested: true,
	name: /\.png$/,
	marker: ".test-cache",
};

function put(dir: string, name: string, ago: number) {
	const file = join(dir, name);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, Buffer.alloc(100));
	const at = new Date(now - ago);
	utimesSync(file, at, at);
	return file;
}

function filesIn(dir: string) {
	return readdirSync(dir, { encoding: "utf8", recursive: true })
		.filter((name) => statSync(join(dir, name)).isFile())
		.sort();
}

function fiveFiles() {
	const dir = mkdtempSync(join(tmpdir(), "phi-disk-"));
	put(dir, "a/1.png", 5 * HOUR);
	put(dir, "a/2.png", 4 * HOUR);
	put(dir, "b/3.png", 3 * HOUR);
	put(dir, "4.png", 2 * HOUR);
	put(dir, "5.png", 1 * HOUR);
	return dir;
}

test("files are deleted least recently used first until the folder fits", () => {
	const dir = fiveFiles();
	assert.equal(pruneToBudget(dir, 250, PNG, now), 200);
	assert.deepEqual(filesIn(dir), ["4.png", "5.png"]);
});

test("a recent use moves an old file to the back", () => {
	const dir = fiveFiles();
	markFileUsed(join(dir, "a/1.png"), now - 30 * MIN);
	assert.equal(pruneToBudget(dir, 250, PNG, now), 200);
	assert.deepEqual(filesIn(dir), ["5.png", "a/1.png"]);
});

test("a file written or used in the last ten minutes is never deleted", () => {
	const dir = mkdtempSync(join(tmpdir(), "phi-disk-"));
	const old = put(dir, "old.png", 2 * HOUR);
	markFileUsed(old, now - MIN);
	put(dir, "new.png", MIN);
	assert.equal(pruneToBudget(dir, 0, PNG, now), 200);
	assert.deepEqual(filesIn(dir), ["new.png", "old.png"]);
});

test(".tmp files do not count; an old one is deleted, a fresh one kept", () => {
	const dir = mkdtempSync(join(tmpdir(), "phi-disk-"));
	put(dir, "x.png.1.a.tmp", 11 * MIN);
	put(dir, "y.png.1.b.tmp", MIN);
	assert.equal(pruneToBudget(dir, 1000, PNG, now), 0);
	assert.deepEqual(filesIn(dir), ["y.png.1.b.tmp"]);
});

test("a missing folder is not an error", () => {
	const dir = mkdtempSync(join(tmpdir(), "phi-disk-"));
	assert.equal(pruneToBudget(join(dir, "none"), 10, PNG, now), 0);
});

test("a failed write prunes once and is tried again", async () => {
	const full = Object.assign(new Error("ENOSPC: no space left on device"), {
		code: "ENOSPC",
	});
	let writes = 0;
	const seen: unknown[] = [];
	await assert.doesNotReject(
		retryAfterPrune(
			async () => {
				writes += 1;
				if (writes === 1) throw full;
			},
			(err) => {
				seen.push(err);
			},
		),
	);
	assert.equal(writes, 2);
	assert.equal(seen.length, 1);
	assert.equal(seen[0], full);
});

test("a write that fails twice throws the second error", async () => {
	let writes = 0;
	let prunes = 0;
	await assert.rejects(
		retryAfterPrune(
			async () => {
				writes += 1;
				throw new Error(`fail ${writes}`);
			},
			() => {
				prunes += 1;
			},
		),
		/fail 2/,
	);
	assert.equal(prunes, 1);
});

test("the default cache layout is never refused", () => {
	const base = mkdtempSync(join(tmpdir(), "phi-disk-"));
	const app = join(base, "srv", "app");
	const assets = join(app, "phi-assets");
	const mirror = join(assets, "original_ill");
	mkdirSync(mirror, { recursive: true });
	const kept = [process.cwd(), app, assets, mirror];
	assert.equal(unsafeCacheRoot("/tmp/phi-web-ill", kept), undefined);
	assert.equal(
		unsafeCacheRoot(join(tmpdir(), "phi-tag-radar"), kept),
		undefined,
	);
	assert.equal(
		unsafeCacheRoot(join(base, "tmp", "phi-web-ill"), kept),
		undefined,
	);
	assert.equal(unsafeCacheRoot(join(assets, "cache"), kept), undefined);
	rmSync(base, { recursive: true, force: true });
});

test("a cache folder that is, or contains, a protected folder is refused", () => {
	const base = mkdtempSync(join(tmpdir(), "phi-disk-"));
	const assets = join(base, "app", "phi-assets");
	const mirror = join(base, "cache", "original_ill");
	mkdirSync(assets, { recursive: true });
	const kept = [assets, mirror];
	assert.equal(unsafeCacheRoot(assets, kept), `it is ${assets}`);
	assert.equal(
		unsafeCacheRoot(join(base, "app"), kept),
		`it contains ${assets}`,
	);
	assert.equal(
		unsafeCacheRoot(join(base, "cache"), kept),
		`it contains ${mirror}`,
	);
	assert.equal(unsafeCacheRoot(".", [process.cwd()]), `it is ${process.cwd()}`);
	assert.equal(
		unsafeCacheRoot(parse(process.cwd()).root, [process.cwd()]),
		`it contains ${process.cwd()}`,
	);
	rmSync(base, { recursive: true, force: true });
});

test("a protected folder behind a link is still recognised", () => {
	const base = mkdtempSync(join(tmpdir(), "phi-disk-"));
	const real = join(base, "real-assets");
	const link = join(base, "assets-link");
	mkdirSync(real);
	symlinkSync(real, link, "dir");
	assert.equal(unsafeCacheRoot(real, [link]), `it is ${link}`);
	assert.equal(unsafeCacheRoot(link, [real]), `it is ${real}`);
	assert.equal(unsafeCacheRoot(base, [link]), `it contains ${link}`);
	rmSync(base, { recursive: true, force: true });
});

test("a protected folder spelled in another case is refused when the disk ignores case", (t) => {
	const base = mkdtempSync(join(tmpdir(), "phi-disk-"));
	const assets = join(base, "App", "phi-assets");
	mkdirSync(assets, { recursive: true });
	const foldsCase = existsSync(join(base, "app", "PHI-ASSETS"));
	t.diagnostic(
		foldsCase
			? "case-insensitive disk"
			: "case-sensitive disk: nothing to compare",
	);
	if (foldsCase) {
		assert.equal(
			unsafeCacheRoot(join(base, "app", "PHI-ASSETS"), [assets]),
			`it is ${assets}`,
		);
		assert.equal(
			unsafeCacheRoot(join(base, "APP"), [assets]),
			`it contains ${assets}`,
		);
		const mirror = join(base, "app", "CACHE", "original_ill");
		assert.equal(
			unsafeCacheRoot(join(base, "App", "cache"), [mirror]),
			`it contains ${mirror}`,
		);
	}
	rmSync(base, { recursive: true, force: true });
});

test("a refused folder keeps every file and is reported once", (t) => {
	resetFileUseForTest();
	const warn = t.mock.method(logger, "warn", () => undefined);
	const dir = mkdtempSync(join(tmpdir(), "phi-disk-"));
	put(dir, "old.png", 5 * HOUR);
	protectFolders([dir]);
	try {
		assert.equal(pruneToBudget(dir, 0, PNG, now), undefined);
		assert.equal(pruneToBudget(dir, 0, PNG, now), undefined);
	} finally {
		resetFileUseForTest();
	}
	assert.deepEqual(filesIn(dir), ["old.png"]);
	assert.equal(warn.mock.callCount(), 1);
	assert.match(
		String(warn.mock.calls[0]?.arguments[0]),
		/^TEST_CACHE \(.*\) is never pruned: it is /,
	);
	rmSync(dir, { recursive: true, force: true });
});

test("pruning refuses the app, assets and jacket folders and every folder that holds one", (t) => {
	t.mock.method(logger, "warn", () => undefined);
	const base = mkdtempSync(join(tmpdir(), "phi-disk-"));
	const app = join(base, "app");
	const assets = join(base, "assets");
	const cache = join(base, "cache");
	const jackets = join(cache, "original_ill");
	const env = { ...process.env };
	process.env.PHI_APP_ROOT = app;
	process.env.PHI_ASSETS = assets;
	process.env.PHI_ILL = jackets;
	try {
		for (const dir of [app, assets, jackets]) put(dir, "old.png", 5 * HOUR);
		for (const dir of [app, assets, jackets, cache, base]) {
			assert.equal(pruneToBudget(dir, 0, PNG, now), undefined, dir);
		}
		assert.equal(filesIn(base).length, 3);
		const fresh = join(base, "tmp", "phi-web-ill");
		put(fresh, "old.png", 5 * HOUR);
		assert.equal(pruneToBudget(fresh, 0, PNG, now), 0);
		assert.equal(filesIn(base).length, 3);
	} finally {
		process.env = env;
		rmSync(base, { recursive: true, force: true });
	}
});

test("links inside the cache are never followed or deleted", () => {
	const base = mkdtempSync(join(tmpdir(), "phi-disk-"));
	const kept = join(base, "kept");
	const cache = join(base, "cache");
	const target = put(kept, "x.png", 5 * HOUR);
	const avatar = put(kept, "avatar/d.png", 5 * HOUR);
	put(cache, "own.png", 5 * HOUR);
	symlinkSync(kept, join(cache, "original_ill"), "dir");
	symlinkSync(kept, join(cache, "html"), "dir");
	symlinkSync(target, join(cache, "y.png"), "file");
	const files: CacheFiles = {
		...PNG,
		folders: ["", "original_ill", "html/avatar"],
	};
	assert.equal(pruneToBudget(cache, 0, files, now), 0);
	assert.equal(existsSync(target), true);
	assert.equal(existsSync(avatar), true);
	assert.equal(lstatSync(join(cache, "original_ill")).isSymbolicLink(), true);
	assert.equal(lstatSync(join(cache, "y.png")).isSymbolicLink(), true);
	assert.equal(existsSync(join(cache, "own.png")), false);
	rmSync(base, { recursive: true, force: true });
});

test("files that do not have the cache's own shape are never deleted or counted", () => {
	const dir = mkdtempSync(join(tmpdir(), "phi-disk-"));
	const own = "0123456789abcdef0123.png";
	for (const name of ["notes.txt", "x.png", `sub/${own}`, own]) {
		put(dir, name, 5 * HOUR);
	}
	assert.equal(pruneToBudget(dir, 100, RADAR, now), 100);
	assert.equal(filesIn(dir).length, 4);
	assert.equal(pruneToBudget(dir, 0, RADAR, now), 0);
	assert.deepEqual(filesIn(dir), ["notes.txt", `sub/${own}`, "x.png"]);
	rmSync(dir, { recursive: true, force: true });
});

test("only the cache's own temp files are deleted, and only when stale", () => {
	const dir = mkdtempSync(join(tmpdir(), "phi-disk-"));
	put(dir, "a.png.12.k9.tmp", 11 * MIN);
	put(dir, "b.png.12.k9.tmp", MIN);
	put(dir, "x.tmp", HOUR);
	put(dir, "c.txt.12.k9.tmp", HOUR);
	put(dir, "d.png.tmp", HOUR);
	assert.equal(pruneToBudget(dir, 1000, PNG, now), 0);
	assert.deepEqual(filesIn(dir), [
		"b.png.12.k9.tmp",
		"c.txt.12.k9.tmp",
		"d.png.tmp",
		"x.tmp",
	]);
	rmSync(dir, { recursive: true, force: true });
});

test("one pass deletes at most PRUNE_MAX_DELETES files, stale temp files included", () => {
	const dir = mkdtempSync(join(tmpdir(), "phi-disk-"));
	for (let i = 0; i < 20; i++) put(dir, `t${i}.png.1.a.tmp`, HOUR);
	for (let i = 0; i < PRUNE_MAX_DELETES - 10; i++) put(dir, `f${i}.png`, HOUR);
	assert.equal(pruneToBudget(dir, 0, PNG, now), 10 * 100);
	assert.equal(filesIn(dir).length, 10);
	assert.equal(pruneToBudget(dir, 0, PNG, now), 0);
	assert.equal(filesIn(dir).length, 0);
	rmSync(dir, { recursive: true, force: true });
});

test("a file changed after the listing is not deleted", () => {
	const base = mkdtempSync(join(tmpdir(), "phi-disk-"));
	const dir = join(base, "cache");
	const touched = put(dir, "a.png", 2 * HOUR);
	const swapped = put(dir, "b.png", 2 * HOUR);
	const replaced = put(dir, "c.png", 2 * HOUR);
	const target = put(join(base, "kept"), "x.png", 2 * HOUR);
	onListedForTest(() => {
		const at = new Date(now - MIN);
		utimesSync(touched, at, at);
		rmSync(swapped);
		symlinkSync(target, swapped, "file");
		const twin = put(base, "twin.png", 2 * HOUR);
		renameSync(twin, replaced);
	});
	try {
		assert.equal(pruneToBudget(dir, 0, PNG, now), 300);
	} finally {
		onListedForTest();
	}
	assert.equal(existsSync(touched), true);
	assert.equal(existsSync(replaced), true);
	assert.equal(lstatSync(swapped).isSymbolicLink(), true);
	assert.equal(existsSync(target), true);
	rmSync(base, { recursive: true, force: true });
});

test("a use moves the file's time forward at most once per TOUCH_GAP_MS", () => {
	const dir = mkdtempSync(join(tmpdir(), "phi-disk-"));
	const file = put(dir, "a.png", 2 * HOUR);
	const mtime = () => Math.round(statSync(file).mtimeMs);
	const first = now - 20 * MIN;
	markFileUsed(file, first);
	assert.equal(mtime(), first);
	markFileUsed(file, first + TOUCH_GAP_MS - 1);
	assert.equal(mtime(), first);
	markFileUsed(file, first + TOUCH_GAP_MS);
	assert.equal(mtime(), first + TOUCH_GAP_MS);
	rmSync(dir, { recursive: true, force: true });
});

test("a use seen only through the file's time protects it in another process", () => {
	const dir = mkdtempSync(join(tmpdir(), "phi-disk-"));
	put(dir, "old.png", 2 * HOUR);
	markFileUsed(join(dir, "old.png"), now - MIN);
	resetFileUseForTest();
	assert.equal(pruneToBudget(dir, 0, PNG, now), 100);
	assert.deepEqual(filesIn(dir), ["old.png"]);
	rmSync(dir, { recursive: true, force: true });
});

test("a cache with a marker never prunes a folder it has not claimed, given directly or through a link", (t) => {
	resetFileUseForTest();
	const warn = t.mock.method(logger, "warn", () => undefined);
	const base = mkdtempSync(join(tmpdir(), "phi-disk-"));
	const bucket = join(base, "bucket");
	const link = join(base, "cache-link");
	put(bucket, "original_ill/ill/a.png", 5 * HOUR);
	put(bucket, "html/avatar/b.png", 5 * HOUR);
	symlinkSync(bucket, link, "dir");
	claimCacheRoot(bucket, JACKETS, false);
	claimCacheRoot(link, JACKETS, false);
	try {
		assert.equal(pruneToBudget(bucket, 0, JACKETS, now), undefined);
		assert.equal(pruneToBudget(link, 0, JACKETS, now), undefined);
	} finally {
		resetFileUseForTest();
	}
	assert.deepEqual(filesIn(bucket), [
		"html/avatar/b.png",
		"original_ill/ill/a.png",
	]);
	assert.equal(warn.mock.callCount(), 1);
	assert.match(
		String(warn.mock.calls[0]?.arguments[0]),
		/holds no \.test-cache file/,
	);
	rmSync(base, { recursive: true, force: true });
});

test("a cache claims a folder it creates, an empty folder and its default folder, and prunes them", () => {
	const base = mkdtempSync(join(tmpdir(), "phi-disk-"));
	const created = join(base, "created");
	const empty = join(base, "empty");
	const usual = join(base, "usual");
	mkdirSync(empty);
	put(usual, "original_ill/ill/old.png", 5 * HOUR);
	claimCacheRoot(created, JACKETS, false);
	claimCacheRoot(empty, JACKETS, false);
	claimCacheRoot(usual, JACKETS, true);
	for (const dir of [created, empty, usual]) {
		assert.equal(existsSync(join(dir, ".test-cache")), true, dir);
		put(dir, "html/avatar/x.png", 5 * HOUR);
		assert.equal(pruneToBudget(dir, 0, JACKETS, now), 0, dir);
		assert.deepEqual(filesIn(dir), [".test-cache"], dir);
	}
	rmSync(base, { recursive: true, force: true });
});
