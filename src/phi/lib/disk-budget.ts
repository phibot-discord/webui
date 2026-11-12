import {
	type Dirent,
	lstatSync,
	mkdirSync,
	readdirSync,
	realpathSync,
	rmSync,
	utimesSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { logger } from "@/server/logger";
import { appRoot, assetsDir, illDir } from "@/server/paths";
import { evictOldest } from "./lru";

export const KEEP_RECENT_MS = 10 * 60_000;
export const TOUCH_GAP_MS = 5 * 60_000;
export const PRUNE_MAX_DELETES = 500;
const USED_MAX = 4_096;
const usedAt = new Map<string, number>();
const refused = new Set<string>();
const extraKept: string[] = [];
const OWN_TMP = /^(.+)\.\d+\.[0-9a-z]*\.tmp$/;
const FOLD_CASE = process.platform === "darwin" || process.platform === "win32";
let afterListing: (() => void) | undefined;

export type CacheFiles = {
	setting: string;
	folders: readonly string[];
	nested: boolean;
	name: RegExp;
	marker?: string;
};

type Listed = {
	path: string;
	size: number;
	mtimeMs: number;
	ino: number;
	at: number;
};

export function markFileUsed(path: string, now = Date.now()) {
	try {
		const st = lstatSync(/*turbopackIgnore: true*/ path);
		if (st.isFile() && now - st.mtimeMs >= TOUCH_GAP_MS) {
			const at = new Date(now);
			utimesSync(/*turbopackIgnore: true*/ path, at, at);
		}
	} catch {}
	usedAt.delete(path);
	usedAt.set(path, now);
	evictOldest(usedAt, USED_MAX);
}

export function resetFileUseForTest() {
	usedAt.clear();
	refused.clear();
	extraKept.length = 0;
}

export function onListedForTest(hook?: () => void) {
	afterListing = hook;
}

export function protectFolders(paths: readonly string[]) {
	extraKept.push(...paths);
}

export function claimCacheRoot(dir: string, files: CacheFiles, adopt: boolean) {
	if (!files.marker) return;
	try {
		mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
		if (!adopt && readdirSync(/*turbopackIgnore: true*/ dir).length > 0) return;
		writeFileSync(/*turbopackIgnore: true*/ join(dir, files.marker), "", {
			flag: "a",
		});
	} catch {}
}

export function isStaleTmp(name: string, mtimeMs: number, now = Date.now()) {
	return name.endsWith(".tmp") && now - mtimeMs > KEEP_RECENT_MS;
}

function canonical(path: string): string {
	let head = resolve(/*turbopackIgnore: true*/ path);
	const tail: string[] = [];
	for (;;) {
		try {
			const real = join(
				realpathSync.native(/*turbopackIgnore: true*/ head),
				...tail,
			);
			return FOLD_CASE ? real.toLowerCase() : real;
		} catch {
			const parent = dirname(head);
			if (parent === head) return FOLD_CASE ? head.toLowerCase() : head;
			tail.unshift(basename(head));
			head = parent;
		}
	}
}

export function unsafeCacheRoot(
	dir: string,
	protectedPaths: readonly string[],
): string | undefined {
	const root = canonical(dir);
	const inside = root.endsWith(sep) ? root : `${root}${sep}`;
	for (const path of protectedPaths) {
		const kept = canonical(path);
		if (kept === root) return `it is ${path}`;
		if (kept.startsWith(inside)) return `it contains ${path}`;
	}
	return undefined;
}

function protectedPaths(): string[] {
	return [process.cwd(), appRoot(), assetsDir(), illDir(), ...extraKept];
}

function refusal(dir: string, files: CacheFiles): string | undefined {
	const unsafe = unsafeCacheRoot(dir, protectedPaths());
	if (unsafe || !files.marker) return unsafe;
	try {
		const marker = lstatSync(/*turbopackIgnore: true*/ join(dir, files.marker));
		if (marker.isFile()) return undefined;
	} catch {}
	return `it holds no ${files.marker} file (create that empty file in it to let the cache delete its old files)`;
}

function realFolder(root: string, folder: string): string | undefined {
	let path = root;
	for (const part of folder.split("/").filter(Boolean)) {
		path = join(/*turbopackIgnore: true*/ path, part);
		try {
			if (!lstatSync(/*turbopackIgnore: true*/ path).isDirectory()) return;
		} catch {
			return;
		}
	}
	return path;
}

function listOwnFiles(root: string, files: CacheFiles, now: number) {
	const own: Listed[] = [];
	const stale: Listed[] = [];
	const visit = (dir: string) => {
		let entries: Dirent[];
		try {
			entries = readdirSync(/*turbopackIgnore: true*/ dir, {
				withFileTypes: true,
			});
		} catch {
			return;
		}
		for (const entry of entries) {
			if (entry.name === files.marker) continue;
			const path = join(/*turbopackIgnore: true*/ dir, entry.name);
			if (entry.isDirectory()) {
				if (files.nested) visit(path);
				continue;
			}
			if (!entry.isFile()) continue;
			const tmp = OWN_TMP.exec(entry.name);
			if (!files.name.test(tmp ? (tmp[1] ?? "") : entry.name)) continue;
			try {
				const st = lstatSync(/*turbopackIgnore: true*/ path);
				if (!st.isFile()) continue;
				const item = {
					path,
					size: st.size,
					mtimeMs: st.mtimeMs,
					ino: st.ino,
					at: Math.max(st.mtimeMs, usedAt.get(path) ?? 0),
				};
				if (!tmp) own.push(item);
				else if (now - st.mtimeMs > KEEP_RECENT_MS) stale.push(item);
			} catch {}
		}
	};
	for (const folder of new Set(files.folders)) {
		const start = realFolder(root, folder);
		if (start) visit(start);
	}
	return { own, stale };
}

function removeIfUnchanged(item: Listed): boolean {
	try {
		const st = lstatSync(/*turbopackIgnore: true*/ item.path);
		if (!st.isFile() || st.ino !== item.ino || st.mtimeMs !== item.mtimeMs)
			return false;
		rmSync(/*turbopackIgnore: true*/ item.path, { force: true });
		return true;
	} catch {
		return false;
	}
}

export function pruneToBudget(
	dir: string,
	maxBytes: number,
	files: CacheFiles,
	now = Date.now(),
): number | undefined {
	const unsafe = refusal(dir, files);
	if (unsafe) {
		if (!refused.has(files.setting)) {
			refused.add(files.setting);
			logger.warn(`${files.setting} (${dir}) is never pruned: ${unsafe}`);
		}
		return undefined;
	}
	const { own, stale } = listOwnFiles(dir, files, now);
	afterListing?.();
	let deleted = 0;
	for (const item of stale) {
		if (deleted >= PRUNE_MAX_DELETES) break;
		if (removeIfUnchanged(item)) deleted += 1;
	}
	let total = own.reduce((sum, item) => sum + item.size, 0);
	own.sort((a, b) => a.at - b.at);
	for (const item of own) {
		if (total <= maxBytes || deleted >= PRUNE_MAX_DELETES) break;
		if (now - Math.max(item.at, usedAt.get(item.path) ?? 0) < KEEP_RECENT_MS)
			continue;
		if (!removeIfUnchanged(item)) continue;
		total -= item.size;
		deleted += 1;
	}
	return total;
}

export async function retryAfterPrune(
	write: () => Promise<void>,
	prune: (err: unknown) => void,
): Promise<void> {
	try {
		await write();
	} catch (err) {
		prune(err);
		await write();
	}
}
