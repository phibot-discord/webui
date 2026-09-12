import { existsSync as fsExists } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { logger } from "./logger";
import { illDir } from "./paths";
import { fetchR2Object, r2Config, r2Ready } from "./r2";
import { exists, mountBytes } from "./vfs";

const GH_ILL = "https://raw.githubusercontent.com/Catrong/phi-plugin-ill/main";
const CACHE_ROOT = process.env.PHI_ILL_CACHE?.trim() || "/tmp/phi-web-ill";
const ILL_FETCH_CONCURRENCY = 48;

async function poolAll<T>(
	items: T[],
	limit: number,
	fn: (item: T) => Promise<void>,
) {
	if (!items.length) return;
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, async () => {
			for (;;) {
				const i = next++;
				if (i >= items.length) return;
				await fn(items[i]!);
			}
		}),
	);
}

function pngName(id: string): string {
	return id.replace(/\.0$/, ".png");
}

export function songIllPath(
	originalIll: string,
	id: string,
	kind: "common" | "blur" | "low" = "common",
	extra?: { otherIll?: string; illustration?: string; fallback?: string },
): string {
	const png = pngName(id);
	const local: string[] = [];
	if (kind === "blur") local.push(join(originalIll, "illBlur", png));
	else if (kind === "low") local.push(join(originalIll, "illLow", png));
	else {
		local.push(join(originalIll, "ill", png));
		local.push(join(originalIll, "illLow", png));
	}
	local.push(join(originalIll, png), join(originalIll, "SP", png));
	if (
		extra?.illustration &&
		!/^(?:https?|ftp):\/\//i.test(extra.illustration) &&
		extra.otherIll
	) {
		local.push(join(extra.otherIll, extra.illustration));
	}
	for (const p of local) {
		if (p && exists(p)) return p;
	}
	if (kind === "blur") return join(originalIll, "illBlur", png);
	return join(originalIll, "illLow", png);
}

export function chartImgPath(
	originalIll: string,
	songId: string,
	dif: string,
): string {
	const id = songId.replace(/\.0$/, "");
	return join(originalIll, "chartimg", dif, `${id}.png`);
}

export function chapIllPath(originalIll: string, name: string): string {
	return join(originalIll, "chap", `${name}.png`);
}

function underIllTree(absPath: string): string | undefined {
	const ill = illDir().replace(/\\/g, "/");
	const n = absPath.replace(/\\/g, "/");
	if (n === ill || n.startsWith(`${ill}/`))
		return n.slice(ill.length).replace(/^\//, "");
	const marker = "/original_ill/";
	const i = n.indexOf(marker);
	if (i >= 0) return n.slice(i + marker.length);
	return undefined;
}

function r2KeyFor(rel: string): string {
	const prefix = r2Config().prefix;
	const rest = rel.replace(/^\//, "");
	return prefix ? `${prefix}/${rest}` : rest;
}

function ghPath(rel: string): string {
	return `${GH_ILL}/${rel.split("/").map(encodeURIComponent).join("/")}`;
}

export function illFetchPlan(rel: string): {
	r2Key?: string;
	githubUrl?: string;
} {
	if (r2Ready()) return { r2Key: r2KeyFor(rel) };
	return { githubUrl: ghPath(rel) };
}

async function fetchBytes(rel: string): Promise<Buffer | undefined> {
	const plan = illFetchPlan(rel);
	if (plan.r2Key) {
		const buf = await fetchR2Object(plan.r2Key, { revalidate: 86_400 });
		if (buf?.byteLength) return buf;
		logger.warn(`ill r2 miss ${rel} key ${plan.r2Key}`);
		return undefined;
	}
	if (!plan.githubUrl) return undefined;
	try {
		const res = await fetch(plan.githubUrl, {
			next: { revalidate: 86_400 },
		} as RequestInit);
		if (res.ok) return Buffer.from(await res.arrayBuffer());
	} catch (err) {
		logger.warn(
			`ill fetch ${rel}: ${err instanceof Error ? err.message : err}`,
		);
	}
	return undefined;
}

async function persist(
	wanted: string,
	rel: string,
	buf: Buffer,
): Promise<string> {
	const dest = join(/*turbopackIgnore: true*/ CACHE_ROOT, rel);
	await mkdir(/*turbopackIgnore: true*/ dirname(dest), { recursive: true });
	await writeFile(/*turbopackIgnore: true*/ dest, buf);
	mountBytes(wanted, buf);
	mountBytes(dest, buf);
	return dest;
}

export function applyIllPaths(html: string, map: Map<string, string>): string {
	let out = html;
	for (const [from, to] of map) {
		if (from === to) continue;
		out = out.split(from).join(to);
	}
	return out;
}

export async function hydrateIlls(
	paths: string[],
): Promise<Map<string, string>> {
	const mapped = new Map<string, string>();
	const missing = [...new Set(paths)].filter((p) => {
		if (!p || fsExists(/*turbopackIgnore: true*/ p)) return false;
		return underIllTree(p) != null;
	});
	if (!missing.length) return mapped;
	const started = performance.now();
	let hits = 0;
	await poolAll(missing, ILL_FETCH_CONCURRENCY, async (wanted) => {
		const rel = underIllTree(wanted);
		if (!rel) return;
		const cached = join(/*turbopackIgnore: true*/ CACHE_ROOT, rel);
		if (fsExists(/*turbopackIgnore: true*/ cached)) {
			mountBytes(wanted, await readFile(/*turbopackIgnore: true*/ cached));
			mapped.set(wanted, cached);
			hits += 1;
			return;
		}
		const buf = await fetchBytes(rel);
		if (!buf) return;
		mapped.set(wanted, await persist(wanted, rel, buf));
		hits += 1;
	});
	const ms = Math.round(performance.now() - started);
	const via = r2Ready() ? "r2" : "gh";
	if (hits)
		logger.ok(
			`ills ${hits}/${missing.length} in ${ms}ms (${via} → ${CACHE_ROOT})`,
		);
	else logger.warn(`ills miss ${missing.length}`);
	return mapped;
}

export function illCacheRoot(): string {
	return CACHE_ROOT;
}
